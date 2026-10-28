import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { mergePermissions } from '@/components/permissions/permissionsHelper';
import { countDueSalaries } from '@/lib/salaryPeriod';
import SubscriptionGate from '@/components/subscription/SubscriptionGate';
import { getSubscriptionState, fetchAccessState } from '@/lib/subscription';
import { useAppTheme, applyThemeMode } from '@/lib/appTheme';

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
} from 'lucide-react';

// Фоновое изображение терминала — единый стиль всех разделов
const HERO_IMAGE = 'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/76318279a_generated_f6b51210.jpg';
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

/* Оформление интерфейса — тёмное или светлое; переключается в шапке и в профиле. */

export default function Layout({ children, currentPageName }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isDark } = useAppTheme();

  // Переключение тёмного и светлого оформления: применяется сразу ко всем разделам
  // и сохраняется в браузере — при следующем входе включится тот же режим.
  const toggleStyleMode = () => {
    applyThemeMode(isDark ? 'light' : 'dark');
  };

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

  // Оформление применяется до первой отрисовки (src/lib/appTheme.js).

  useEffect(() => {
    loadUserAndBusiness();
  }, []);

  // После сохранения профиля (данные, фото, стикер) обновляем карточку пользователя
  // в меню и запись сотрудника — без перезагрузки страницы.
  useEffect(() => {
    const onProfileUpdated = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const empId = window.__barakatEmployee?.id;
        if (empId) {
          const fresh = (await base44.entities.Employee.filter({ id: empId }))[0];
          if (fresh) {
            setCurrentEmployee(fresh);
            window.__barakatEmployee = fresh;
          }
        }
      } catch (_) {}
    };
    window.addEventListener('barakatProfileUpdated', onProfileUpdated);
    return () => window.removeEventListener('barakatProfileUpdated', onProfileUpdated);
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

  // При первом входе в приложение открываем раздел «Профиль»
  useEffect(() => {
    if (loading || !business) return;
    if (currentPageName?.startsWith('Admin')) return; // админ-разделы не трогаем
    if (window.__redirectToProfile && currentPageName !== 'Profile') {
      window.__redirectToProfile = false;
      navigate('/Profile');
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
    if (!canAccessItem(activeItem)) {
      const firstAvailable = ALL_MENU_ITEMS.find(canAccessItem);
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

      // При входе в приложение сразу открываем раздел «Профиль» (один раз за сессию вкладки)
      if (!sessionStorage.getItem('barakatcrm_opened')) {
        sessionStorage.setItem('barakatcrm_opened', '1');
        // Редирект выполнится после загрузки бизнеса
        window.__redirectToProfile = true;
      }

      // Владелец платформы входит в приложение так же, как остальные: если у него есть
      // свой бизнес или запись сотрудника — грузим их, иначе показываем вход в бизнес.
      // Раньше такой пользователь оставался вовсе без бизнеса, и разделы были пустыми.
      {
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
      // Готовность доступа публикуется всегда: разделы не должны ждать сигнал,
      // который может не прийти (например, когда бизнес не выбран).
      if (!window.__barakatAccessReady) {
        window.__barakatAccessReady = true;
        window.dispatchEvent(new Event('barakatAccessReady'));
      }
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

  // Раздел «Зарплата» открыт и тем, кому разрешены только свои выплаты,
  // и тем, кому разрешены зарплаты всех сотрудников.
  const canAccessItem = (item) => {
    if (item.name === 'Salary') {
      return canAccess('view_salary') || canAccess('view_own_salary_only') || canAccess('view_all_salaries');
    }
    // «Расходы» доступны и тем, кому разрешены только свои расходы
    if (item.name === 'Expenses') {
      return canAccess('view_expenses') || canAccess('view_own_expenses_only');
    }
    return canAccess(item.permKey);
  };

  // Все разделы меню регулируются единообразно через canAccess:
  // владелец видит всё, админ — всё кроме явно отключённого, обычный сотрудник — по разрешениям.
  const MENU_ITEMS = ALL_MENU_ITEMS.filter(canAccessItem);

  const currentMenu = isAdmin && isAdminPage ? ADMIN_MENU_ITEMS : MENU_ITEMS;

  // Название текущего раздела для верхней панели (стиль терминала)
  const currentMenuLabel = currentPageName === 'Profile'
    ? 'Профиль'
    : (() => {
        const activeItem = currentMenu.find(i => i.name === currentPageName);
        return activeItem ? t(lang, activeItem.labelKey) : '';
      })();

  const DrawerContent = () => (
    <div className="tk-drawer flex flex-col h-full">
      {/* Шапка панели меню */}
      <div className="tk-dhead h-14 flex items-center justify-between gap-2 px-4 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="tk-topbox w-7 h-7 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="tk-cap" style={{ fontSize: 9 }}>Бизнес</p>
            <p className="tk-dcard-name font-bold text-sm truncate">{business?.name || 'Бизнес'}</p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(false)}
          className="tk-btn ic flex-shrink-0"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Разделы */}
      <nav className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1">
          <span className="tk-cap">{isAdmin && isAdminPage ? 'Платформа' : 'Разделы'}</span>
        </div>
        <div>
          {currentMenu.map((item) => {
            const isActive = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "tk-dnavitem flex items-center gap-3 px-4 py-2.5",
                  isActive && "on"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-[11px] font-bold tracking-[0.1em] uppercase truncate">
                  {t(lang, item.labelKey)}
                </span>
                {item.name === 'Salary' && dueSalaryCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-salary-due">
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
        className="tk-dfoot block p-3 transition-colors"
      >
        <div className={cn("tk-dcard flex items-center gap-3 px-3 py-2.5", currentPageName === 'Profile' && "on")}>
          {currentEmployee ? (
            <EmployeeAvatar employee={currentEmployee} size="sm" />
          ) : (
            <EmployeeAvatar
              avatarUrl={user?.data?.avatar_url || user?.avatar_url}
              name={user?.full_name || user?.email}
              isAdmin
              profileSticker={user?.data?.profile_sticker || user?.profile_sticker}
              profileFrame={user?.data?.profile_frame || user?.profile_frame}
              size="sm"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="tk-dcard-name text-xs font-bold truncate">
              {currentEmployee ? currentEmployee.name : (user?.full_name || 'User')}
            </p>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <span className="tk-dcard-role" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                {currentEmployee
                  ? (currentEmployee.is_admin ? 'Админ' : (roleName || 'Сотрудник'))
                  : 'Владелец'}
              </span>
              {business?.name && <span className="tk-cap truncate" style={{ fontSize: 9 }}>{business.name}</span>}
            </div>
          </div>
        </div>
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
            className="tk-drawer fixed left-0 top-0 bottom-0 w-72 z-50 shadow-2xl overflow-hidden"
          >
            <DrawerContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* === ВЕРХНЯЯ ПАНЕЛЬ (стиль терминала) === */}
      <header className="tk-topbar fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-3 sm:px-4 gap-2">
        {/* Кнопка меню */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="tk-btn ic flex-shrink-0"
          title="Меню"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Текущий раздел */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {currentMenuLabel && <span className="tk-topbar-page truncate">{currentMenuLabel}</span>}
        </div>

        <button
          onClick={toggleStyleMode}
          className="tk-btn ic flex-shrink-0"
          title={isDark ? 'Светлое оформление' : 'Тёмное оформление'}
        >
          {isDark
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
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
          <div className="tk-app">
            {isDark && currentPageName !== 'Analytics' && (
              <div className="tk-apphero">
                <img src={HERO_IMAGE} alt="" />
              </div>
            )}
            <div className="tk-appbody">{children}</div>
          </div>
        </motion.div>
      </main>

    </div>
  );
}