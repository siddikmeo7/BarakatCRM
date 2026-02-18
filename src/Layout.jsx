import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  Users, 
  CreditCard,
  Bot,
  Settings,
  Menu,
  X,
  Building2,
  RotateCcw,
  TrendingUp,
  History,
  Globe,
  ChevronLeft,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/ui/BottomNavigation';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

const getMenuItems = (lang) => [
  { name: 'Dashboard', icon: LayoutDashboard, labelKey: 'nav_dashboard' },
  { name: 'Analytics', icon: TrendingUp, labelKey: 'nav_analytics' },
  { name: 'Products', icon: Package, labelKey: 'nav_products' },
  { name: 'Warehouses', icon: Warehouse, labelKey: 'nav_warehouses' },
  { name: 'Sales', icon: ShoppingCart, labelKey: 'nav_sales' },
  { name: 'Returns', icon: RotateCcw, labelKey: 'nav_returns' },
  { name: 'Customers', icon: Users, labelKey: 'nav_customers' },
  { name: 'Debts', icon: CreditCard, labelKey: 'nav_debts' },
  { name: 'AIAssistant', icon: Bot, labelKey: 'nav_ai' },
  { name: 'Settings', icon: Settings, labelKey: 'nav_settings' },
];

const getAdminMenuItems = (lang) => [
  { name: 'AdminDashboard', icon: LayoutDashboard, labelKey: 'nav_admin' },
  { name: 'AdminBusinesses', icon: Building2, labelKey: 'nav_businesses' },
];

const LANG_FLAGS = { ru: '🇷🇺', tj: '🇹🇯', en: '🇬🇧' };
const LANG_LABELS = { ru: 'RU', tj: 'TJ', en: 'EN' };

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  
  // Check for system dark mode preference
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    loadUserAndBusiness();
  }, []);

  // Подписка на изменение языка в реальном времени
  useEffect(() => {
    if (!business?.id) return;
    const unsubscribe = base44.entities.Business.subscribe((event) => {
      if (event.id === business.id && event.data?.language) {
        setLang(event.data.language);
      }
    });
    return unsubscribe;
  }, [business?.id]);

  const loadUserAndBusiness = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.email !== ADMIN_EMAIL) {
            const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
              if (businesses.length > 0) {
                const foundBiz = businesses[0];
                setBusiness(foundBiz);
                const bizLang = foundBiz.language || 'ru';
                setLang(bizLang);
            } else {
              // Автоматически создать бизнес при первом входе
              const newBiz = await base44.entities.Business.create({
                name: currentUser.full_name ? `Бизнес ${currentUser.full_name}` : 'Мой бизнес',
                owner_email: currentUser.email,
                is_active: true,
                default_color: 'Чёрный',
                default_size_from: 39,
                default_size_to: 44,
                default_pairs_per_box: 6,
                default_product_type: 'Туфли',
                language: 'ru'
              });
              setBusiness(newBiz);
            }
          }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAdminPage = currentPageName?.startsWith('Admin');
  const menuItems = getMenuItems(lang);
  const adminMenuItems = getAdminMenuItems(lang);
  const currentMenu = isAdmin && isAdminPage ? adminMenuItems : menuItems;

  const changeLang = async (newLang) => {
    setLang(newLang);
    if (business) {
      await base44.entities.Business.update(business.id, { language: newLang });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }



  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Mobile Fixed Menu */}
      <nav className="lg:hidden fixed left-0 top-16 bottom-0 w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col overflow-y-auto py-2 px-1.5">
        <div className="space-y-1">
          {currentMenu.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={cn(
                  "flex items-center justify-center p-3 rounded-lg transition-all duration-200 user-select-none",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
                title={t(lang, item.labelKey)}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex relative flex-col h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
      )}>
        <div className="h-16 lg:h-16 flex items-center justify-between px-2 lg:px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 lg:gap-3 flex-1 lg:flex-initial">
            <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Package className="w-4 lg:w-6 h-4 lg:h-6 text-white" />
            </div>
            <div className="hidden lg:block">
              <span className="font-bold text-slate-900 dark:text-white text-lg">BarakatCRM</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'app_subtitle')}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {isAdmin && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <Link to={createPageUrl('Dashboard')} className="flex-1">
                <Button 
                  variant={!isAdminPage ? "default" : "outline"} 
                  size="sm" 
                  className={cn("w-full dark:bg-indigo-600 dark:hover:bg-indigo-700", !isAdminPage && "bg-indigo-600")}
                >
                  {t(lang, 'nav_business')}
                </Button>
              </Link>
              <Link to={createPageUrl('AdminDashboard')} className="flex-1">
                <Button 
                  variant={isAdminPage ? "default" : "outline"} 
                  size="sm" 
                  className={cn("w-full dark:bg-indigo-600 dark:hover:bg-indigo-700", isAdminPage && "bg-indigo-600")}
                >
                  {t(lang, 'nav_admin_btn')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 px-1.5 lg:py-4 lg:px-3">
          <div className="space-y-0.5 lg:space-y-1">
            {currentMenu.map((item) => {
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={cn(
                    "flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-1.5 lg:py-3 text-xs lg:text-sm rounded-lg transition-all duration-200 user-select-none",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5 lg:w-5 lg:h-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                  <span className="font-medium truncate hidden lg:block">{t(lang, item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.full_name || user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto lg:pl-0">
       {/* Mobile Header */}
       <div className="lg:hidden fixed top-0 left-20 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 flex items-center px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
             <Package className="w-4 h-4 text-white" />
           </div>
           <span className="font-bold text-slate-900 dark:text-white text-sm">BarakatCRM</span>
         </div>
       </div>

       {/* Page Content */}
       <div className="flex-1 overflow-auto pt-16 lg:pt-0 lg:pl-0">
         <motion.div
           key={currentPageName}
           initial={{ opacity: 0, x: 100 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -100 }}
           transition={{ duration: 0.3 }}
           className="p-4 lg:p-8 min-h-full"
         >
           {children}
         </motion.div>
       </div>
      </main>
    </div>
  );
}