import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Salary from './pages/Salary';
import BrandedLoader from '@/components/ui/BrandedLoader';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ThankYou from './pages/ThankYou';
import About from './pages/About';
import Contact from './pages/Contact';
import Profile from './pages/Profile';
import MigrationPlan from './pages/MigrationPlan';
import AdminSubscriptions from './pages/AdminSubscriptions';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Публичные страницы: доступны без входа в систему
const PUBLIC_PATHS = ['/About', '/Contact'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isPublicPage = PUBLIC_PATHS.includes(window.location.pathname);

  // Show loading spinner while checking app public settings or auth
  if (!isPublicPage && (isLoadingPublicSettings || isLoadingAuth)) {
    return <BrandedLoader fullScreen message="Подключение к BarakatCRM..." />;
  }

  // Handle authentication errors
  if (!isPublicPage && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Salary" element={<LayoutWrapper currentPageName="Salary"><Salary /></LayoutWrapper>} />
      <Route path="/Profile" element={<LayoutWrapper currentPageName="Profile"><Profile /></LayoutWrapper>} />
      <Route path="/MigrationPlan" element={<LayoutWrapper currentPageName="MigrationPlan"><MigrationPlan /></LayoutWrapper>} />
      <Route path="/AdminSubscriptions" element={<LayoutWrapper currentPageName="AdminSubscriptions"><AdminSubscriptions /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
      <Route path="/ThankYou" element={<ThankYou />} />
      <Route path="/About" element={<About />} />
      <Route path="/Contact" element={<Contact />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App