import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
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
  LogOut,
  ChevronDown,
  Building2,
  RotateCcw,
  TrendingUp,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, label: 'Главная' },
  { name: 'Analytics', icon: TrendingUp, label: 'Аналитика' },
  { name: 'Products', icon: Package, label: 'Товары' },
  { name: 'Warehouses', icon: Warehouse, label: 'Склады' },
  { name: 'Sales', icon: ShoppingCart, label: 'Продажи' },
  { name: 'Returns', icon: RotateCcw, label: 'Возвраты' },
  { name: 'Customers', icon: Users, label: 'Клиенты' },
  { name: 'Debts', icon: CreditCard, label: 'Долги' },
  { name: 'ActivityLog', icon: History, label: 'История' },
  { name: 'AIAssistant', icon: Bot, label: 'AI Ассистент' },
  { name: 'Settings', icon: Settings, label: 'Настройки' },
];

const adminMenuItems = [
  { name: 'AdminDashboard', icon: LayoutDashboard, label: 'Панель админа' },
  { name: 'AdminBusinesses', icon: Building2, label: 'Бизнесы' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
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
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      base44.auth.logout();
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAdminPage = currentPageName?.startsWith('Admin');
  const currentMenu = isAdmin && isAdminPage ? adminMenuItems : menuItems;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Страница регистрации бизнеса
  if (currentPageName === 'RegisterBusiness') {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  // Если нет бизнеса и не админ - редирект
  if (!business && !isAdmin && currentPageName !== 'RegisterBusiness') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Building2 className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Добро пожаловать!</h2>
          <p className="text-slate-600 mb-6">
            Для начала работы необходимо зарегистрировать ваш бизнес
          </p>
          <Link to={createPageUrl('RegisterBusiness')}>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
              Зарегистрировать бизнес
            </Button>
          </Link>
        </div>
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
          <span className="font-bold text-slate-900">ShoeWholesale</span>
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
                <span className="font-bold text-slate-900 text-lg">ShoeWholesale</span>
                <p className="text-xs text-slate-500">Управление бизнесом</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Business Info */}
          {business && !isAdminPage && (
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Бизнес</p>
                <p className="font-semibold text-slate-900 truncate">{business.name}</p>
              </div>
            </div>
          )}

          {/* Admin Toggle */}
          {isAdmin && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex gap-2">
                <Link to={createPageUrl('Dashboard')} className="flex-1">
                  <Button 
                    variant={!isAdminPage ? "default" : "outline"} 
                    size="sm" 
                    className={cn("w-full", !isAdminPage && "bg-indigo-600")}
                  >
                    Бизнес
                  </Button>
                </Link>
                <Link to={createPageUrl('AdminDashboard')} className="flex-1">
                  <Button 
                    variant={isAdminPage ? "default" : "outline"} 
                    size="sm" 
                    className={cn("w-full", isAdminPage && "bg-indigo-600")}
                  >
                    Админ
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

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate text-sm">{user?.full_name || 'Пользователь'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
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