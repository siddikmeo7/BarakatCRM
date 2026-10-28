import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import BackButton from '@/components/ui/BackButton';
import NoAccess from '@/components/ui/NoAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Box, Users, Calendar, Edit3, Check, Loader2, Info, Settings2 } from 'lucide-react';
import { parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { SALARY_METHODS, getSalaryMethod, computeSalary } from '@/lib/salary';
import { getSalaryPeriod, getSalaryDueState } from '@/lib/salaryPeriod';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import SalaryDueBadge from '@/components/salary/SalaryDueBadge';
import EmployeeSalaryDialog from '@/components/salary/EmployeeSalaryDialog';
import MySalaryView from '@/components/salary/MySalaryView';

export default function Salary() {
  const [business, setBusiness] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [consignmentSales, setConsignmentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [dateRange, setDateRange] = useState({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [editingRate, setEditingRate] = useState(null); // employee id being edited (simple rate)
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [methodDialogEmp, setMethodDialogEmp] = useState(null); // employee for method dialog
  const [methodForm, setMethodForm] = useState({ method: 'per_box', rate: 0 });
  const [savingMethod, setSavingMethod] = useState(false);
  const [showMethodsInfo, setShowMethodsInfo] = useState(false);
  const { can } = useEmployeeAccess();

  useEffect(() => {
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);

      const [salesData, consignmentSaleData, employeesData, paymentsData, schedulesData] = await Promise.all([
        base44.entities.Sale.filter({ business_id: biz.id }),
        base44.entities.ConsignmentSale.filter({ business_id: biz.id }),
        base44.entities.Employee.filter({ business_id: biz.id }),
        base44.entities.SalaryPayment.filter({ business_id: biz.id }).catch(() => []),
        base44.entities.SalarySchedule.filter({ business_id: biz.id }).catch(() => [])
      ]);
      setSales(salesData);
      setConsignmentSales(consignmentSaleData);
      setEmployees(employeesData);
      setPayments(paymentsData || []);
      setSchedules(schedulesData || []);
    } catch (e) {
      console.error('Error loading salary data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Доступ: владелец и админ видят всё. Сотруднику с разрешением view_salary
  // открывается только его личная зарплата, view_all_salaries — зарплаты всех.
  const emp = window.__barakatEmployee;
  const isOwner = !emp;
  const isAdminEmp = emp?.is_admin === true;
  const canManage = isOwner || isAdminEmp || can('manage_salary');
  const canViewAll = isOwner || isAdminEmp || can('view_all_salaries') || can('manage_salary');
  const canView = canViewAll || can('view_salary');

  // Unified non-cancelled sales
  const unifiedSales = useMemo(() => [
    ...sales.map(s => ({ ...s, _isConsignment: false })),
    ...consignmentSales.map(s => ({ ...s, _isConsignment: true, is_debt: false }))
  ], [sales, consignmentSales]);

  const salesInRange = useMemo(() => unifiedSales.filter(sale => {
    if (sale.is_cancelled) return false;
    if (!dateRange?.from) return true;
    try {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    } catch { return false; }
  }), [unifiedSales, dateRange]);

  // Per-employee aggregation
  // Если есть активный профиль сотрудника и удалённый дубликат (тот же user_email),
  // активный выигрывает — удалённый не показывается отдельной строкой с X.
  // Удалённый показывается только если активного профиля с этим email больше нет.
  const employeeStats = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      const existing = map[e.user_email];
      // Не создаём запись для удалённого, если уже есть активный с этим email
      if (existing && !existing.employee.deleted_at && e.deleted_at) return;
      // Заменяем удалённого на активного (тот же email)
      if (existing && existing.employee.deleted_at && !e.deleted_at) {
        map[e.user_email] = { employee: e, boxes: 0, pairs: 0, salesCount: 0, revenue: 0 };
        return;
      }
      if (!existing) {
        map[e.user_email] = { employee: e, boxes: 0, pairs: 0, salesCount: 0, revenue: 0 };
      }
    });
    salesInRange.forEach(sale => {
      const email = sale.seller_email;
      if (!map[email]) {
        map[email] = { employee: { id: 'unknown_' + email, user_email: email, name: sale.seller_name || email, salary_method: 'per_box', salary_per_box: 0, salary_rate: 0, is_admin: false, _unknown: true }, boxes: 0, pairs: 0, salesCount: 0, revenue: 0 };
      }
      map[email].boxes += sale.boxes_sold || 0;
      map[email].pairs += sale.pairs_sold || (sale.boxes_sold || 0) * 6;
      map[email].salesCount += 1;
      map[email].revenue += sale.total_amount || 0;
    });
    return Object.values(map);
  }, [employees, salesInRange]);

  // Список сотрудников для фильтра: активные + удалённые без активного дубликата
  const dropdownEmployees = useMemo(() => {
    const activeEmails = new Set(employees.filter(e => !e.deleted_at).map(e => e.user_email));
    return employees.filter(e => !e.deleted_at || !activeEmails.has(e.user_email));
  }, [employees]);

  const filteredStats = useMemo(() => {
    if (filterEmployee === 'all') return employeeStats;
    return employeeStats.filter(s => s.employee.user_email === filterEmployee);
  }, [employeeStats, filterEmployee]);

  const totals = useMemo(() => {
    let boxes = 0, salary = 0, salesCount = 0;
    filteredStats.forEach(s => {
      boxes += s.boxes;
      salary += computeSalary(s, s.employee);
      salesCount += s.salesCount;
    });
    return { boxes, salary, salesCount };
  }, [filteredStats]);

  // Today's totals (ignoring selected range)
  const todayTotals = useMemo(() => {
    const today = { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    let salary = 0, boxes = 0;
    employeeStats.forEach(s => {
      const empSales = unifiedSales.filter(sale => {
        if (sale.is_cancelled) return false;
        if (sale.seller_email !== s.employee.user_email) return false;
        try {
          const d = parseISO(sale.sale_date || sale.created_date);
          return isWithinInterval(d, today);
        } catch { return false; }
      });
      const todayBoxes = empSales.reduce((acc, sale) => acc + (sale.boxes_sold || 0), 0);
      const todayPairs = empSales.reduce((acc, sale) => acc + (sale.pairs_sold || (sale.boxes_sold || 0) * 6), 0);
      const todayRevenue = empSales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
      boxes += todayBoxes;
      salary += computeSalary({ boxes: todayBoxes, pairs: todayPairs, revenue: todayRevenue }, s.employee);
    });
    return { boxes, salary };
  }, [employeeStats, unifiedSales]);

  // Выплаты и графики выплат, сгруппированные по сотруднику
  const paymentsByEmployee = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      if (!map[p.employee_id]) map[p.employee_id] = [];
      map[p.employee_id].push(p);
    });
    return map;
  }, [payments]);

  const scheduleByEmployee = useMemo(() => {
    const map = {};
    schedules.forEach(s => { map[s.employee_id] = s; });
    return map;
  }, [schedules]);

  // Состояние выплаты за текущий месяц для каждого сотрудника
  const dueStates = useMemo(() => {
    const now = new Date();
    const map = {};
    employees.forEach(e => {
      map[e.id] = getSalaryDueState({
        employee: e,
        schedule: scheduleByEmployee[e.id],
        payments: paymentsByEmployee[e.id] || [],
        now,
      });
    });
    return map;
  }, [employees, scheduleByEmployee, paymentsByEmployee]);

  // Сотрудники с фиксированным ежемесячным окладом — зарплата к оплате за текущий месяц
  const monthlyDueEmployees = useMemo(() => {
    return employees
      .filter(e => !e.deleted_at && e.salary_method === 'fixed_monthly' && (e.salary_rate || 0) > 0)
      .map(e => ({ employee: e, amount: e.salary_rate || 0, dueState: dueStates[e.id] }))
      .filter(x => x.dueState?.status !== 'paid')
      .sort((a, b) => (b.dueState?.status === 'due' ? 1 : 0) - (a.dueState?.status === 'due' ? 1 : 0));
  }, [employees, dueStates]);

  // Названия периода берём из общего хелпера (src/lib/salaryPeriod.js) —
  // переменные периода определены корректно во всех разделах приложения.
  const { monthLabelRaw, monthLabel, monthEndLabel } = getSalaryPeriod();

  const setQuickPeriod = (period) => {
    const now = new Date();
    if (period === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (period === 'week') setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else if (period === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const startEditRate = (emp) => {
    setEditingRate(emp.id);
    const method = emp.salary_method || 'per_box';
    const val = method === 'per_box' ? (emp.salary_per_box || 0) : (emp.salary_rate || 0);
    setRateInput(String(val));
  };

  const saveRate = async (emp) => {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val < 0) { alert('Введите корректную сумму (число ≥ 0)'); return; }
    setSavingRate(true);
    try {
      const method = emp.salary_method || 'per_box';
      const update = method === 'per_box' ? { salary_per_box: val } : { salary_rate: val };
      await base44.entities.Employee.update(emp.id, update);
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...update } : e));
      setEditingRate(null);
    } catch (e) {
      console.error('Error saving rate:', e);
      alert('Не удалось сохранить ставку. Попробуйте ещё раз.');
    } finally {
      setSavingRate(false);
    }
  };

  const openMethodDialog = (emp) => {
    setMethodDialogEmp(emp);
    const method = emp.salary_method || 'per_box';
    const rate = method === 'per_box' ? (emp.salary_per_box || 0) : (emp.salary_rate || 0);
    setMethodForm({ method, rate });
  };

  const saveMethod = async () => {
    const emp = methodDialogEmp;
    if (!emp) return;
    const rate = parseFloat(methodForm.rate);
    if (isNaN(rate) || rate < 0) { alert('Введите корректную ставку (число ≥ 0)'); return; }
    setSavingMethod(true);
    try {
      const update = {
        salary_method: methodForm.method,
        salary_rate: methodForm.method === 'per_box' ? 0 : rate,
        salary_per_box: methodForm.method === 'per_box' ? rate : 0,
      };
      await base44.entities.Employee.update(emp.id, update);
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...update } : e));
      setMethodDialogEmp(null);
    } catch (e) {
      console.error('Error saving method:', e);
      alert('Не удалось сохранить метод. Попробуйте ещё раз.');
    } finally {
      setSavingMethod(false);
    }
  };

  // Открыть профиль сотрудника с историей выплат и графиком зарплаты
  const openEmployee = (employee, statArg) => {
    const stats = statArg || employeeStats.find(s => s.employee.id === employee.id) || {};
    setSelectedEmp({
      employee,
      stat: {
        boxes: stats.boxes || 0,
        pairs: stats.pairs || 0,
        salesCount: stats.salesCount || 0,
        revenue: stats.revenue || 0,
        salary: computeSalary(stats, employee),
      },
    });
  };

  // Сколько сотрудников уже ждут выплату (для светящегося счётчика раздела)
  const dueCount = useMemo(
    () => Object.values(dueStates).filter(s => s?.status === 'due').length,
    [dueStates]
  );

  const fmtMoney = (n) => (n || 0).toLocaleString('ru-RU');
  const periodLabel = dateRange?.from
    ? (dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
        ? `${format(dateRange.from, 'dd MMM', { locale: ru })} — ${format(dateRange.to, 'dd MMM yyyy', { locale: ru })}`
        : format(dateRange.from, 'dd MMM yyyy', { locale: ru }))
    : 'Всё время';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!canView) {
    return <NoAccess message="Раздел «Зарплата» доступен сотрудникам с разрешением на просмотр зарплаты." />;
  }

  // Сотрудник без права видеть всех: только своя зарплата, свой способ расчёта и история выплат
  if (!canViewAll && emp) {
    return (
      <MySalaryView
        employee={emp}
        sales={unifiedSales}
        payments={paymentsByEmployee[emp.id] || []}
        schedule={scheduleByEmployee[emp.id]}
        business={business}
      />
    );
  }

  // Кнопки «Метод» и «Изменить ставку» доступны только владельцу
  // или сотрудникам (включая админов) с явным разрешением manage_salary.
  const canEdit = isOwner || can('manage_salary');
  const currentMethod = methodDialogEmp ? getSalaryMethod(methodDialogEmp.salary_method || 'per_box') : null;

  return (
    <div className="space-y-5">
      <BackButton className="mb-2" />

      <PageHeader
        title="Зарплата сотрудников"
        subtitle={`Расчёт по выбранному методу · ${periodLabel}`}
      />

      {/* Светящийся счётчик: сколько сотрудников ждут выплату */}
      {dueCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 animate-salary-due">
          <span className="w-8 h-8 rounded-full bg-red-500 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
            {dueCount}
          </span>
          <span className="text-sm font-bold text-red-700 dark:text-red-300">
            {dueCount === 1 ? 'Одному сотруднику пора выплатить зарплату' : `${dueCount} сотрудникам пора выплатить зарплату`}
          </span>
        </div>
      )}

      {/* Today highlight */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium opacity-90">Зарплата за сегодня (все сотрудники)</span>
        </div>
        <div className="flex items-end gap-3 mt-1">
          <p className="text-4xl font-black">{fmtMoney(todayTotals.salary)} с.</p>
          <p className="text-sm opacity-90 mb-1.5">{todayTotals.boxes} коробок продано</p>
        </div>
      </div>

      {/* Уведомление: зарплата к оплате за текущий месяц (фиксированный оклад) */}
      {monthlyDueEmployees.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">
              ⚠️ Зарплата к оплате за {monthLabel}
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">
            Период: 1 {monthLabelRaw} — {monthEndLabel} · эти сотрудники должны получить ежемесячный оклад:
          </p>
          <div className="flex flex-wrap gap-2">
            {monthlyDueEmployees.map(({ employee, amount, dueState }) => (
              <button
                key={employee.id}
                onClick={() => openEmployee(employee)}
                title="Открыть профиль и историю выплат"
                className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 border border-red-200 dark:border-red-800 hover:border-red-400 transition-colors"
              >
                <EmployeeAvatar employee={employee} size="sm" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{employee.name}</span>
                <span className="text-sm font-bold text-red-600">{fmtMoney(amount)} с.</span>
                <SalaryDueBadge state={dueState} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards for selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 truncate">Зарплата за период</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmtMoney(totals.salary)} с.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <Box className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-500 truncate">Коробок продано</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{totals.boxes}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500 truncate">Продаж всего</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totals.salesCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
          ].map(f => (
            <button key={f.key} onClick={() => setQuickPeriod(f.key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all">
              {f.label}
            </button>
          ))}
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <button
            onClick={() => setShowMethodsInfo(v => !v)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
          >
            <Info className="w-3.5 h-3.5" />
            Методы расчёта
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Сотрудник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {dropdownEmployees.map(emp => (
                <SelectItem key={emp.id} value={emp.user_email}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-slate-400">{filteredStats.length} сотрудн.</span>
        </div>
      </div>

      {/* Methods info panel */}
      {showMethodsInfo && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-purple-100 dark:border-purple-800 space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-500" />
            Методы расчёта зарплаты
          </h3>
          {SALARY_METHODS.map(m => (
            <div key={m.key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{m.icon} {m.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employee salary table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Сотрудник</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Коробок</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Продаж</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Метод / ставка</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-300">Зарплата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p>Нет данных за выбранный период</p>
                  </td>
                </tr>
              )}
              {filteredStats
                .sort((a, b) => computeSalary(b, b.employee) - computeSalary(a, a.employee))
                .map(({ employee: emp, boxes, pairs, salesCount, revenue }) => {
                const salary = computeSalary({ boxes, pairs, revenue }, emp);
                const isEditing = editingRate === emp.id;
                const method = getSalaryMethod(emp.salary_method || 'per_box');
                const empCanEdit = canEdit && !emp._unknown;
                return (
                  <tr
                    key={emp.id}
                    onClick={() => openEmployee(emp, { boxes, pairs, salesCount, revenue, salary })}
                    title="Открыть профиль и историю выплат"
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar employee={emp} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{emp.name}</p>
                          {emp.is_admin && <span className="text-[10px] font-bold text-indigo-600">👑 Админ</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">{boxes}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{salesCount}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={rateInput}
                            onChange={(e) => setRateInput(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-20 h-8 text-center text-sm"
                            autoFocus
                            disabled={savingRate}
                          />
                          <button onClick={() => saveRate(emp)} disabled={savingRate} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                            {savingRate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setEditingRate(null)} disabled={savingRate} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 transition">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                            {method.icon} {method.label}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">{fmtMoney(emp.salary_method === 'per_box' ? (emp.salary_per_box || 0) : (emp.salary_rate || 0))}{method.key === 'percent_revenue' ? '%' : ' с.'}</span>
                          {empCanEdit && (
                            <button onClick={() => startEditRate(emp)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Изменить ставку">
                              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                      )}
                      {empCanEdit && !isEditing && (
                        <button onClick={() => openMethodDialog(emp)} className="mt-1 text-[11px] text-purple-600 dark:text-purple-300 hover:underline font-medium flex items-center gap-1 mx-auto">
                          <Settings2 className="w-3 h-3" />
                          Метод
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-600 text-lg">{fmtMoney(salary)} с.</span>
                      {emp.salary_method === 'fixed_monthly' && (emp.salary_rate || 0) > 0 && (
                        <div className="mt-1 flex justify-end">
                          <SalaryDueBadge state={dueStates[emp.id]} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredStats.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Итого</td>
                  <td className="px-4 py-3 text-center font-bold text-indigo-600">{totals.boxes}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">{totals.salesCount}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 text-lg">{fmtMoney(totals.salary)} с.</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 px-1">
        💡 Зарплата считается по выбранному методу для каждого сотрудника. Отменённые продажи не учитываются.
        Нажмите «Метод» чтобы изменить способ расчёта, или ✏️ чтобы изменить ставку.
      </p>

      {/* Method change dialog */}
      <Dialog open={!!methodDialogEmp} onOpenChange={(o) => !o && setMethodDialogEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-purple-500" />
              Метод зарплаты — {methodDialogEmp?.name}
            </DialogTitle>
          </DialogHeader>
          {methodDialogEmp && (
            <div className="space-y-4">
              <div className="space-y-2">
                {SALARY_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMethodForm(f => {
                      const prevMethod = f.method;
                      const newRate = prevMethod === m.key ? f.rate : 0;
                      return { ...f, method: m.key, rate: newRate };
                    })}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${methodForm.method === m.key ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{m.icon} {m.label}</span>
                      {methodForm.method === m.key && <Check className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.description}</p>
                  </button>
                ))}
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500">
                  {getSalaryMethod(methodForm.method).rateLabel}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(methodForm.rate)}
                  onChange={(e) => setMethodForm(f => ({ ...f, rate: e.target.value.replace(/[^0-9.]/g, '') }))}
                  placeholder={getSalaryMethod(methodForm.method).ratePlaceholder}
                  className="mt-1.5"
                />
              </div>

              {methodForm.method === 'fixed_monthly' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Фиксированный оклад выплачивается за месяц. При выборе периода короче месяца сумма не проставляется автоматически — учитывайте это вручную.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setMethodDialogEmp(null)}>Отмена</Button>
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2" onClick={saveMethod} disabled={savingMethod}>
                  {savingMethod ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Сохранить</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Профиль сотрудника: история выплат, срок и график зарплаты */}
      {selectedEmp && (
        <EmployeeSalaryDialog
          key={selectedEmp.employee.id}
          employee={selectedEmp.employee}
          stat={selectedEmp.stat}
          business={business}
          canManage={canEdit}
          onClose={() => setSelectedEmp(null)}
          onChanged={loadData}
        />
      )}
    </div>
  );
}