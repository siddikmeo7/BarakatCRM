/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import ActivityLog from './pages/ActivityLog';
import AdminBusinesses from './pages/AdminBusinesses';
import AdminDashboard from './pages/AdminDashboard';
import AdvancedSettings from './pages/AdvancedSettings';
import Analytics from './pages/Analytics';
import BusinessAccess from './pages/BusinessAccess';
import ChartSettings from './pages/ChartSettings';
import Customers from './pages/Customers';
import CustomizeDashboard from './pages/CustomizeDashboard';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';
import Returns from './pages/Returns';
import Sales from './pages/Sales';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import WarehouseSalesHistory from './pages/WarehouseSalesHistory';
import Warehouses from './pages/Warehouses';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "ActivityLog": ActivityLog,
    "AdminBusinesses": AdminBusinesses,
    "AdminDashboard": AdminDashboard,
    "AdvancedSettings": AdvancedSettings,
    "Analytics": Analytics,
    "BusinessAccess": BusinessAccess,
    "ChartSettings": ChartSettings,
    "Customers": Customers,
    "CustomizeDashboard": CustomizeDashboard,
    "Dashboard": Dashboard,
    "Debts": Debts,
    "ProductDetail": ProductDetail,
    "Products": Products,
    "Returns": Returns,
    "Sales": Sales,
    "Settings": Settings,
    "UserProfile": UserProfile,
    "WarehouseSalesHistory": WarehouseSalesHistory,
    "Warehouses": Warehouses,
}

export const pagesConfig = {
    mainPage: "AIAssistant",
    Pages: PAGES,
    Layout: __Layout,
};