import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { mergePermissions } from '@/components/permissions/permissionsHelper';
import { countDueSalaries } from '@/lib/salaryPeriod';
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import { getSubscriptionState, fetchAccessState } from '@/lib/subscription';

import BrandedLoader from '@/components/ui/BrandedLoader';
import EmployeeWelcomeScreen from '@/components/employees/EmployeeWelcomeScreen';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { saveBusinessToHistory } from '@/components/settings/RecentBusinessesPanel';
import { recordLogin } from '@/lib/loginTracker';
import { ensureManagerRole } from '@/lib/defaultRoles';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  Users, 
  Bot,
  Settings,
  Menu,
  X,
  Building2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  FileText,
  Moon,
  Sun,
  Wallet,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

const ALL_MENU_ITEMS = [
  { name: 'Analytics',   icon: TrendingUp,       labelKey: 'nav_analytics', color: 'text-emerald-500', activeBg: 'bg-emerald-500', activeText: 'text-emerald-600', permKey: 'view_analytics' },
  { name: 'Products',    icon: Package,          labelKey: 'nav_products',  color: 'text-blue-500',    activeBg: 'bg-blue-500',    activeText: 'text-blue-600', permKey: 'view_products' },
  { name: 'Warehouses',  icon: Warehouse,        labelKey: 'nav_warehouses',color: 'text-orange-500',  activeBg: 'bg-orange-500',  activeText: 'text-orange-600', permKey: 'view_warehouses' },
  { name: 'Sales',       icon: ShoppingCart,     labelKey: 'nav_sales',     color: 'text-green-500',   activeBg: 'bg-green-500',   activeText: 'text-green-600', permKey: 'view_sales' },
  { name: 'Returns',     icon: RotateCcw,        labelKey: 'nav_returns',   color: 'text-yellow-500',  activeBg: 'bg-yellow-500',  activeText: 'text-yellow-600', permKey: 'view_returns' },
  { name: 'Customers',   icon: Users,            labelKey: 'nav_customers', color: 'text-pink-500',    activeBg: 'bg-pink-500',    activeText: 'text-pink-600', permKey: 'view_customers' },
  { name: 'Reports',     icon: FileText,         labelKey: 'nav_reports',   color: 'text-violet-500',  activeBg: 'bg-violet-500',  activeText: 'text-violet-600', permKey: 'view_reports' },
  { name: 'Expenses',          icon: TrendingDown,     labelKey: 'nav_expenses',     color: 'text-red-500',     activeBg: 'bg-red-500',     activeText: 'text-red-600',    permKey: 'view_expenses' },
  { name: 'AIAssistant',       icon: Bot,              labelKey: 'nav_ai',           color: 'text-purple-500',  activeBg: 'bg-purple-500',  activeText: 'text-purple-600', permKey: 'view_ai_assistant' },
  { name: 'EmployeeAnalytics', icon: Users,            labelKey: 'nav_emp_analytics', color: 'text-rose-500',    activeBg: 'bg-rose-500',    activeText: 'text-rose-600', permKey: 'view_employee_analytics', ownerOnly: false },
  { name: 'Salary',              icon: Wallet,           labelKey: 'nav_salary',      color: 'text-emerald-500',  activeBg: 'bg-emerald-500',  activeText: 'text-emerald-600', permKey: 'view_salary' },
];

const ADMIN_MENU_ITEMS = [
  { name: 'AdminDashboard',  icon: LayoutDashboard, labelKey: 'nav_admin',      color: 'text-indigo-500', activeBg: 'bg-indigo-500' },
  { name: 'AdminBusinesses', icon: Building2,       labelKey: 'nav_businesses', color: 'text-blue-500',   activeBg: 'bg-blue-500' },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('barakatcrm_theme', next ? 'dark' : 'light');
    setIsDark(next);
  };
  return [isDark, toggle];
}

export default function Layout({ children, currentPageName }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, toggleDark] = useDarkMode();

  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [employeePermissions, setEmployeePermissions] = useState(null); // null = owner (full access)
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [frozenBlocked, setFrozenBlocked] = useState(false);
  const [serverAccess, setServerAccess] = useState(null);
  const [dueSalaryCount, setDueSalaryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // По умолчанию — светлый режим (только если пользователь ранее не выбрал тёмный)
    const savedTheme = localStorage.getItem('barakatcrm_theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('barakatcrm_theme', 'light');
    }
  }, []);

  useEffect(() => {
    loadUserAndBusiness();
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    const unsubscribe = base44.entities.Business.subscribe((event) => {
      if (event.id === business.id && event.data) {
        if (event.data.language) setLang(event.data.language);
        // Держим статус подписки актуальным: оплата включает доступ без перезагрузки
        setBusiness(prev => (prev ? { ...prev, ...event.data } : prev));
      }
    });
    return unsubscribe;
  }, [business?.id]);

  // Доступ проверяется на сервере: пробный период, оплаченный период,
  // бесплатные исключения для пользователя или бизнеса.
  useEffect(() => {
    if (!business?.id) { setServerAccess(null); return; }
    fetchAccessState(business.id).then(setServerAccess).catch(() => setServerAccess(null));
  }, [business?.id, business?.subscription_status]);

  // Счётчик «пора выплатить зарплату» для пункта меню «Зарплата»:
  // обновляется при выплате (событие + realtime) и исчезает, когда все выплаты закрыты.
  useEffect(() => {
    if (!business?.id) { setDueSalaryCount(0); return; }
    let alive = true;
    const compute = async () => {
      try {
        const [emps, pays, scheds] = await Promise.all([
          base44.entities.Employee.filter({ business_id: business.id }),
          base44.entities.SalaryPayment.filter({ business_id: business.id }),
          base44.entities.SalarySchedule.filter({ business_id: business.id }),
        ]);
        if (alive) setDueSalaryCount(countDueSalaries({ employees: emps, payments: pays, schedules: scheds }));
      } catch (_) {}
    };
    compute();
    const unsubPayments = base44.entities.SalaryPayment.subscribe(() => compute());
    const unsubSchedules = base44.entities.SalarySchedule.subscribe(() => compute());
    const onChanged = () => compute();
    window.addEventListener('salaryPaymentsChanged', onChanged);
    return () => {
      alive = false;
      unsubPayments?.();
      unsubSchedules?.();
      window.removeEventListener('salaryPaymentsChanged', onChanged);
    };
  }, [business?.id]);

  // Загружаем название роли сотрудника для отображения статуса в меню (Админ/Менеджер/Сотрудник)
  useEffect(() => {
    if (!currentEmployee?.role_id || currentEmployee.is_admin) { setRoleName(''); return; }
    base44.entities.Role.filter({ id: currentEmployee.role_id })
      .then(r => setRoleName(r[0]?.name || ''))
      .catch(() => setRoleName(''));
  }, [currentEmployee?.role_id, currentEmployee?.is_admin]);

  // Heartbeat: обновляем last_login_at каждые 5 минут для сотрудника
  useEffect(() => {
    const emp = window.__barakatEmployee;
    if (!emp?.id) return;
    const interval = setInterval(async () => {
      try {
        await base44.entities.Employee.update(emp.id, { last_login_at: new Date().toISOString() });
      } catch (_) {}
    }, 5 * 60 * 1000); // каждые 5 минут
    return () => clearInterval(interval);
  }, [currentEmployee?.id]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPageName]);

  // Редирект на Products при первом входе в мобильной версии
  useEffect(() => {
    if (loading || !business) return;
    if (window.innerWidth >= 768) return; // только мобильная
    if (window.__redirectToProducts && currentPageName !== 'Products') {
      window.__redirectToProducts = false;
      navigate(createPageUrl('Products'));
    }
  }, [loading, business, currentPageName]);

  // Если текущая страница недоступна сотруднику — редирект на первую доступную
  useEffect(() => {
    if (loading || !user) return;
    if (user.email === ADMIN_EMAIL) return;
    if (!currentEmployee) return; // владелец — полный доступ, без редиректа
    const activeItem = ALL_MENU_ITEMS.find(item => item.name === currentPageName);
    if (!activeItem) return;
    // Единая проверка: если у сотрудника (админа или обычного) нет доступа к текущему
    // разделу — перенаправляем на первый доступный раздел.
    if (!canAccess(activeItem.permKey)) {
      const firstAvailable = ALL_MENU_ITEMS.find(item => canAccess(item.permKey));
      if (firstAvailable && firstAvailable.name !== currentPageName) {
        navigate(createPageUrl(firstAvailable.name));
      }
    }
  }, [loading, currentPageName, employeePermissions, currentEmployee, user]);

  const loadUserAndBusiness = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      recordLogin(currentUser.email);

      // Редирект на Products после первого входа
      const firstLoginKey = `first_login_${currentUser.email}`;
      if (!sessionStorage.getItem(firstLoginKey)) {
        sessionStorage.setItem(firstLoginKey, '1');
        // Редирект будет после загрузки бизнеса
        window.__redirectToProducts = true;
      }

      // Платформенный админ (siddikme2007@gmail.com) тоже может войти в бизнес как сотрудник
      // по кодам — в этом случае у него есть savedMode, и ветка ниже должна отработать.
      // Без savedMode админ остаётся в режиме AdminDashboard (бизнес не грузится).
      const hasSavedMode = !!(sessionStorage.getItem('barakatcrm_mode') || localStorage.getItem('barakatcrm_mode'));
      if (currentUser.email !== ADMIN_EMAIL || hasSavedMode) {
            // Проверяем: есть ли выбранный режим (сотрудник или владелец).
            // Читаем из sessionStorage ИЛИ localStorage — Settings пишет в оба,
            // sessionStorage переживает перезагрузку в той же вкладке и страхует,
            // если localStorage был очищен (например, прошлым выходом).
            const savedMode = sessionStorage.getItem('barakatcrm_mode') || localStorage.getItem('barakatcrm_mode'); // 'owner' | 'employee_<empId>'

            // Грузим бизнесы и записи сотрудника через backend функцию
            // (case-insensitive email matching, bypass RLS)
            const empBizRes = await base44.functions.invoke('getEmployeeBusinesses', {});
            const empBizData = empBizRes.data || {};
            const businesses = empBizData.ownedBusinesses || [];
            const employeeRecords = empBizData.employees || [];
            // Карта сотрудник→бизнес (используется как fallback, если loadEmployeeContext подведёт)
            const empBusinessMap = empBizData.businesses || {};

            // Функция регистрации сессии устройства
            const registerDeviceSession = async (bizId, userEmail, userName, role, empId = null) => {
              try {
                const ua = navigator.userAgent;
                const sessionToken = `${userEmail}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                // Деактивируем старые сессии этого пользователя в этом бизнесе с этой ролью
                const oldSessions = await base44.entities.DeviceSession.filter({ business_id: bizId, user_email: userEmail, role, is_active: true });
                await Promise.all(oldSessions.map(s => base44.entities.DeviceSession.update(s.id, { is_active: false })));
                // Создаём новую сессию
                const newSession = await base44.entities.DeviceSession.create({
                  business_id: bizId,
                  user_email: userEmail,
                  user_name: userName,
                  role,
                  employee_id: empId || '',
                  device_info: ua,
                  last_seen_at: new Date().toISOString(),
                  session_token: sessionToken,
                  is_active: true
                });
                localStorage.setItem('barakat_owner_session', sessionToken);
                sessionStorage.setItem('barakat_owner_session', sessionToken);
                // Хартбит — обновляем last_seen_at каждые 5 минут
                const hb = setInterval(async () => {
                  try {
                    await base44.entities.DeviceSession.update(newSession.id, { last_seen_at: new Date().toISOString() });
                  } catch (_) {}
                }, 5 * 60 * 1000);
                window.__barakatSessionHB = hb;
              } catch (_) {}
            };

            // Привязка активного бизнеса выполняется ТОЛЬКО на сервере:
            // поле business_id в профиле пользователя заблокировано для изменений из приложения.
            // Сервер сам проверяет, что пользователь — владелец бизнеса или его сотрудник.
            const bindBusiness = async (bizId) => {
              try {
                const res = await base44.functions.invoke('activateBusiness', { business_id: bizId });
                if (!res.data?.business_id) return false;
                // Один раз за сессию вкладки: правила доступа должны увидеть новый бизнес
                const key = `barakatcrm_bound_${bizId}`;
                if (!sessionStorage.getItem(key)) {
                  sessionStorage.setItem(key, '1');
                  setTimeout(() => window.location.reload(), 400);
                }
                return true;
              } catch (_) {
                return false;
              }
            };

            if (savedMode && savedMode.startsWith('employee_')) {
              const empId = savedMode.replace('employee_', '');
              let emp = null, biz = null, rolePerms = null, ctxError = null;
              // 1) Загружаем контекст через backend (роль + бизнес + сотрудник)
              try {
                const ctxRes = await base44.functions.invoke('loadEmployeeContext', { employee_id: empId });
                const ctx = ctxRes.data;
                if (ctx?.error) { ctxError = ctx.error; }
                else { emp = ctx.employee; biz = ctx.business; rolePerms = ctx.role_permissions || null; }
              } catch (ctxErr) {
                ctxError = ctxErr?.message || String(ctxErr);
              }
              // 2) Fallback: если loadEmployeeContext подвёл — берём сотрудника и бизнес
              //    из уже загруженных данных getEmployeeBusinesses (join уже подтвердил сотрудника).
              //    Это не даёт провалиться в режим владельца собственного бизнеса.
              if ((!emp || !biz) && employeeRecords.length > 0) {
                const fbEmp = employeeRecords.find(e => e.id === empId);
                if (fbEmp) {
                  emp = fbEmp;
                  biz = empBusinessMap[empId] || biz;
                  rolePerms = null;
                  ctxError = null; // восстановились — не считаем ошибкой
                }
              }
              // 3) Если сотрудника нет вообще (запись удалена/деактивирована) —
              //    чистим режим и отправляем на BusinessAccess, а НЕ в собственный бизнес.
              if (!emp || !biz) {
                console.error('Employee context unavailable:', ctxError);
                localStorage.removeItem('barakatcrm_mode');
                localStorage.removeItem(`barakat_emp_token_${empId}`);
                if (currentPageName !== 'BusinessAccess') {
                  navigate(createPageUrl('BusinessAccess'));
                }
                setLoading(false);
                return;
              }
              // Замороженный сотрудник не может войти — показываем блокирующий экран
              if (emp.is_frozen) {
                localStorage.removeItem('barakatcrm_mode');
                sessionStorage.removeItem('barakatcrm_mode');
                setFrozenBlocked(true);
                setLoading(false);
                return;
              }
              // 4) Применяем контекст сотрудника
              setBusiness(biz);
              setLang(biz?.language || 'ru');
              let mergedPerms = null;
              if (emp.is_admin) {
                setEmployeePermissions(null);
              } else {
                mergedPerms = mergePermissions(rolePerms || {}, emp.permissions || {});
                setEmployeePermissions(mergedPerms);
              }
              setCurrentEmployee(emp);
              window.__barakatEmployee = emp;
              window.__barakatBusiness = biz;
              window.__barakatMergedPermissions = mergedPerms;
              window.__barakatAccessReady = true;
              window.dispatchEvent(new Event('barakatAccessReady'));
              // Привязка бизнеса — только через сервер (поле business_id недоступно пользователю).
              // Сотрудник уже подтверждён выше (email совпадает с записью сотрудника).
              await bindBusiness(biz.id);
              await registerDeviceSession(biz.id, currentUser.email, emp.name || currentUser.full_name, emp.is_admin ? 'admin' : 'employee', emp.id);
              localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
              if (emp.login_session_token) {
                localStorage.setItem(`barakat_emp_token_${emp.id}`, emp.login_session_token);
              }
              saveBusinessToHistory(biz.id, biz.name, emp.id, emp.name || currentUser.full_name, emp.is_admin ? 'admin' : 'employee');
              const welcomeKey = `welcomed_${emp.id}`;
              try {
                await base44.entities.Employee.update(emp.id, {
                  last_login_at: new Date().toISOString(),
                  device_info: navigator.userAgent
                });
              } catch (_) {}
              if (!sessionStorage.getItem(welcomeKey)) {
                setShowWelcome(true);
              }
              setLoading(false);
              return;
            }

            // По умолчанию: если есть свой бизнес — владелец
            if (businesses.length > 0) {
              // Persist business_id for RLS security (серверная привязка)
              if (currentUser.email !== ADMIN_EMAIL && currentUser.data?.business_id !== businesses[0].id) {
                await bindBusiness(businesses[0].id);
              }
              setBusiness(businesses[0]);
              setLang(businesses[0].language || 'ru');
              setEmployeePermissions(null);
              window.__barakatEmployee = null;
              window.__barakatBusiness = businesses[0];
              window.__barakatAccessReady = true;
              window.dispatchEvent(new Event('barakatAccessReady'));
              // Гарантируем наличие роли «Менеджер» (идемпотентно)
              ensureManagerRole(businesses[0].id);
              // Регистрируем сессию владельца
              await registerDeviceSession(businesses[0].id, currentUser.email, currentUser.full_name || currentUser.email, 'owner');
              // Track last login (once per day) for owner profile
              const _todayStr = new Date().toISOString().split('T')[0];
              const _lastLoginDay = currentUser.data?.last_login_at?.split('T')[0];
              if (_lastLoginDay !== _todayStr) {
                try { await base44.auth.updateMe({ last_login_at: new Date().toISOString() }); } catch (_) {}
              }
            } else if (employeeRecords.length > 0) {
              // Нет своего бизнеса — входим как сотрудник автоматически
              const activeEmp = employeeRecords.find(e => !e.is_frozen);
              if (activeEmp) {
                try {
                  const ctxRes = await base44.functions.invoke('loadEmployeeContext', { employee_id: activeEmp.id });
                  const ctx = ctxRes.data;
                  if (!ctx.error) {
                    const emp = ctx.employee;
                    const biz = ctx.business;
                    setBusiness(biz);
                    setLang(biz?.language || 'ru');
                    let mergedPerms2 = null;
                    if (emp.is_admin) {
                      setEmployeePermissions(null);
                    } else {
                      const rolePerms = ctx.role_permissions || {};
                      mergedPerms2 = mergePermissions(rolePerms, emp.permissions || {});
                      setEmployeePermissions(mergedPerms2);
                    }
                    setCurrentEmployee(emp);
                    window.__barakatEmployee = emp;
                    window.__barakatBusiness = biz;
                    window.__barakatMergedPermissions = mergedPerms2;
                    window.__barakatAccessReady = true;
                    window.dispatchEvent(new Event('barakatAccessReady'));
                    // Привязка бизнеса — только на сервере (см. bindBusiness)
                    await bindBusiness(biz.id);
                    await registerDeviceSession(biz.id, currentUser.email, emp.name || currentUser.full_name, emp.is_admin ? 'admin' : 'employee', emp.id);
                    localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
                    saveBusinessToHistory(biz.id, biz.name, emp.id, emp.name || currentUser.full_name, emp.is_admin ? 'admin' : 'employee');
                    try {
                      await base44.entities.Employee.update(emp.id, {
                        last_login_at: new Date().toISOString(),
                        device_info: navigator.userAgent
                      });
                    } catch (_) {}
                  }
                } catch (ctxErr) {
                  console.error('loadEmployeeContext error:', ctxErr);
                }
              } else if (currentPageName !== 'BusinessAccess') {
                navigate(createPageUrl('BusinessAccess'));
                setLoading(false);
                return;
              }
            } else if (currentPageName !== 'BusinessAccess') {
              navigate(createPageUrl('BusinessAccess'));
              setLoading(false);
              return;
            }
          }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <BrandedLoader fullScreen message="Загрузка BarakatCRM..." />;
  }

  if (frozenBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5 ring-4 ring-blue-200 dark:ring-blue-800">
          <span className="text-4xl">🧊</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Аккаунт заморожен</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Ваш аккаунт сотрудника был заморожен владельцем бизнеса. Обратитесь к владельцу, чтобы снова получить доступ.</p>
        <button onClick={() => base44.auth.logout()} className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium">Выйти</button>
      </div>
    );
  }

  const subscriptionState = getSubscriptionState(business, { isPlatformAdmin: user?.email === ADMIN_EMAIL });

  const refreshBusiness = async () => {
    if (!business?.id) return;
    const fresh = (await base44.entities.Business.filter({ id: business.id }))[0];
    if (fresh) setBusiness(fresh);
  };

  // Пробный месяц закончился (или доступ закрыт) — вместо приложения показываем экран оплаты.
  // Решение принимает серверная проверка, локальный расчёт — только запасной вариант.
  const accessBlocked = serverAccess ? serverAccess.allowed === false : subscriptionState.blocked;
  if (business && accessBlocked) {
    return (
      <SubscriptionGate
        business={business}
        isEmployee={!!currentEmployee}
        onRefresh={refreshBusiness}
      />
    );
  }

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAdminPage = currentPageName?.startsWith('Admin');
  // Владелец = нет записи сотрудника. Админ-сотрудник — это currentEmployee,
  // он НЕ владелец: его доступ регулируется canAccess (явные отключения учитываются).
  const isOwner = !currentEmployee;

  const canAccess = (permKey) => {
    if (isOwner) return true;            // владелец — полный доступ
    if (!permKey) return true;
    if (currentEmployee?.is_admin) {
      // Админ имеет доступ ко всему, КРОМЕ явно отключённых разрешений
      const override = currentEmployee.permissions?.[permKey];
      if (override === false) return false;
      return true;
    }
    // Обычный сотрудник — по merged permissions (роль + переопределения сотрудника)
    return employeePermissions?.[permKey] === true;
  };

  // Все разделы меню регулируются единообразно через canAccess:
  // владелец видит всё, админ — всё кроме явно отключённого, обычный сотрудник — по разрешениям.
  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => canAccess(item.permKey));

  const currentMenu = isAdmin && isAdminPage ? ADMIN_MENU_ITEMS : MENU_ITEMS;

  const DrawerContent = () => (
    <div className="flex flex-col h-full">
      {/* Drawer Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight truncate">{business?.name || 'Бизнес'}</p>
        </div>
        <button
          onClick={() => setDrawerOpen(false)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>



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
                {item.name === 'Salary' && dueSalaryCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-salary-due">
                    {dueSalaryCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

      </nav>

      {/* Карточка пользователя: нажатие открывает раздел «Профиль» */}
      <Link
        to="/Profile"
        onClick={() => setDrawerOpen(false)}
        title="Открыть профиль"
        className={cn(
          "group block p-4 border-t space-y-3 transition-all duration-200 border-l-2",
          currentPageName === 'Profile'
            ? "border-l-indigo-500 border-slate-200 dark:border-slate-800"
            : "border-l-transparent border-slate-200 dark:border-slate-800 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/20"
        )}
      >
        {/* Current user status card */}
        {currentEmployee ? (
          <div className={`rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-200 group-hover:ring-1 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-700 ${currentEmployee.is_admin ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
            <EmployeeAvatar employee={currentEmployee} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="origin-left text-sm font-semibold text-slate-900 dark:text-white truncate transition-all duration-200 group-hover:scale-105 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{currentEmployee.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${currentEmployee.is_admin ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {currentEmployee.is_admin ? '👑 Админ' : (roleName || '🛍️ Сотрудник')}
                </span>
                <span className="text-[10px] text-slate-400 truncate">{business?.name}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:ring-2 group-hover:ring-indigo-300">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="origin-left text-sm font-semibold text-slate-900 dark:text-white truncate transition-all duration-200 group-hover:scale-105 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{user?.full_name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  👑 Владелец
                </span>
              </div>
            </div>
          </div>
        )}

      </Link>
    </div>
  );

  if (showWelcome && currentEmployee && business) {
    return (
      <EmployeeWelcomeScreen
        employee={currentEmployee}
        business={business}
        onContinue={() => {
          sessionStorage.setItem(`welcomed_${currentEmployee.id}`, '1');
          setShowWelcome(false);
        }}
      />
    );
  }

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
            if (!active && currentPageName === 'Profile') {
              return (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500 text-white">
                  <UserCircle className="w-3 h-3" />
                  Профиль
                </div>
              );
            }
            if (!active) return null;
            return (
              <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", active.activeBg, "text-white")}>
                <active.icon className="w-3 h-3" />
                {t(lang, active.labelKey)}
              </div>
            );
          })()}
        </div>

        <button
          onClick={toggleDark}
          className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-slate-500" />
          }
        </button>
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