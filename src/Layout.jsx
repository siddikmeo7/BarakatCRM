import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

const MENU_ITEMS = [
  { name: 'Dashboard',    icon: LayoutDashboard, labelKey: 'nav_dashboard', color: 'text-indigo-500',  activeBg: 'bg-indigo-500',  activeText: 'text-indigo-600' },
  { name: 'Analytics',   icon: TrendingUp,       labelKey: 'nav_analytics', color: 'text-emerald-500', activeBg: 'bg-emerald-500', activeText: 'text-emerald-600' },
  { name: 'Products',    icon: Package,          labelKey: 'nav_products',  color: 'text-blue-500',    activeBg: 'bg-blue-500',    activeText: 'text-blue-600' },
  { name: 'Warehouses',  icon: Warehouse,        labelKey: 'nav_warehouses',color: 'text-orange-500',  activeBg: 'bg-orange-500',  activeText: 'text-orange-600' },
  { name: 'Sales',       icon: ShoppingCart,     labelKey: 'nav_sales',     color: 'text-green-500',   activeBg: 'bg-green-500',   activeText: 'text-green-600' },
  { name: 'Returns',     icon: RotateCcw,        labelKey: 'nav_returns',   color: 'text-yellow-500',  activeBg: 'bg-yellow-500',  activeText: 'text-yellow-600' },
  { name: 'Customers',   icon: Users,            labelKey: 'nav_customers', color: 'text-pink-500',    activeBg: 'bg-pink-500',    activeText: 'text-pink-600' },
  { name: 'Debts',       icon: CreditCard,       labelKey: 'nav_debts',     color: 'text-red-500',     activeBg: 'bg-red-500',     activeText: 'text-red-600' },
  { name: 'AIAssistant', icon: Bot,              labelKey: 'nav_ai',        color: 'text-purple-500',  activeBg: 'bg-purple-500',  activeText: 'text-purple-600' },
  { name: 'Settings',    icon: Settings,         labelKey: 'nav_settings',  color: 'text-slate-500',   activeBg: 'bg-slate-500',   activeText: 'text-slate-600' },
];

const ADMIN_MENU_ITEMS = [
  { name: 'AdminDashboard',  icon: LayoutDashboard, labelKey: 'nav_admin',      color: 'text-indigo-500', activeBg: 'bg-indigo-500' },
  { name: 'AdminBusinesses', icon: Building2,       labelKey: 'nav_businesses', color: 'text-blue-500',   activeBg: 'bg-blue-500' },
];

export default function Layout({ children, currentPageName }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const navigate = useNavigate();

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    loadUserAndBusiness();
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    const unsubscribe = base44.entities.Business.subscribe((event) => {
      if (event.id === business.id && event.data?.language) {
        setLang(event.data.language);
      }
    });
    return unsubscribe;
  }, [business?.id]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPageName]);

  const loadUserAndBusiness = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.email !== ADMIN_EMAIL) {
        const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
        if (businesses.length > 0) {
          const foundBiz = businesses[0];
          setBusiness(foundBiz);
          setLang(foundBiz.language || 'ru');
        } else {
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

      if (window.location.pathname === '/' || window.location.pathname === '') {
        navigate(createPageUrl('Dashboard'));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAdminPage = currentPageName?.startsWith('Admin');
  const currentMenu = isAdmin && isAdminPage ? ADMIN_MENU_ITEMS : MENU_ITEMS;

  const DrawerContent = () => (
    <div className="flex flex-col h-full">
      {/* Drawer Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-base">BarakatCRM</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'app_subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(false)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Admin toggle */}
      {isAdmin && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <Link to={createPageUrl('Dashboard')} className="flex-1" onClick={() => setDrawerOpen(false)}>
              <Button variant={!isAdminPage ? "default" : "outline"} size="sm"
                className={cn("w-full", !isAdminPage && "bg-indigo-600 hover:bg-indigo-700")}>
                {t(lang, 'nav_business')}
              </Button>
            </Link>
            <Link to={createPageUrl('AdminDashboard')} className="flex-1" onClick={() => setDrawerOpen(false)}>
              <Button variant={isAdminPage ? "default" : "outline"} size="sm"
                className={cn("w-full", isAdminPage && "bg-indigo-600 hover:bg-indigo-700")}>
                {t(lang, 'nav_admin_btn')}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {currentMenu.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? `${item.activeBg} shadow-md`
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {/* Colored icon box when inactive, white when active */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                  isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                )}>
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white" : item.color)} />
                </div>
                <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-700 dark:text-slate-300")}>
                  {t(lang, item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      {/* === DRAWER OVERLAY (both mobile & desktop) === */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* === SLIDE-IN DRAWER (both mobile & desktop) === */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-50 shadow-2xl"
          >
            <DrawerContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* === TOP HEADER (both mobile & desktop) === */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 flex items-center px-4 gap-3">
        {/* Menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-base">BarakatCRM</span>
        </div>

        {/* Current page indicator */}
        <div className="flex-1 flex items-center justify-center">
          {(() => {
            const active = currentMenu.find(i => i.name === currentPageName);
            if (!active) return null;
            return (
              <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", active.activeBg, "text-white")}>
                <active.icon className="w-3 h-3" />
                {t(lang, active.labelKey)}
              </div>
            );
          })()}
        </div>

        {/* Spacer for symmetry */}
        <div className="w-9 h-9 flex-shrink-0" />
      </header>

      {/* === PAGE CONTENT === */}
      <main className="pt-14">
        <motion.div
          key={currentPageName}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="p-4 lg:p-8 min-h-screen"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}