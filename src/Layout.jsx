import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
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
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const navigate = useNavigate();

  useEffect(() => {
    loadUserAndBusiness();
  }, []);

  const loadUserAndBusiness = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.email !== ADMIN_EMAIL) {
            const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
            if (businesses.length > 0) {
              setBusiness(businesses[0]);
              setLang(businesses[0].language || 'ru');
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



  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">BarakatCRM</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                  <span className="font-bold text-slate-900 text-lg">BarakatCRM</span>
                  <p className="text-xs text-slate-500">{t(lang, 'app_subtitle')}</p>
                </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Business name removed — shown in Settings */}

          {/* Admin Toggle */}
          {/* Language Switcher */}
          <div className="px-4 py-2 border-b border-slate-100 flex gap-1 justify-center">
            {['ru', 'tj', 'en'].map(l => (
              <button
                key={l}
                onClick={() => changeLang(l)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all",
                  lang === l ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{LANG_FLAGS[l]}</span>
                <span>{LANG_LABELS[l]}</span>
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex gap-2">
                <Link to={createPageUrl('Dashboard')} className="flex-1">
                  <Button 
                    variant={!isAdminPage ? "default" : "outline"} 
                    size="sm" 
                    className={cn("w-full", !isAdminPage && "bg-indigo-600")}
                  >
                    {t(lang, 'nav_business')}
                  </Button>
                </Link>
                <Link to={createPageUrl('AdminDashboard')} className="flex-1">
                  <Button 
                    variant={isAdminPage ? "default" : "outline"} 
                    size="sm" 
                    className={cn("w-full", isAdminPage && "bg-indigo-600")}
                  >
                    {t(lang, 'nav_admin_btn')}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {currentMenu.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      isActive 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom spacer */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-semibold text-sm">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-500 truncate">{user?.full_name || user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {/* Current Page Indicator */}
          {currentPageName && !['RegisterBusiness', 'AdminDashboard', 'AdminBusinesses'].includes(currentPageName) && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <LayoutDashboard className="w-4 h-4" />
              <span>{currentMenu.find(item => item.name === currentPageName)?.label || currentPageName}</span>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}