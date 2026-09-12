import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import BackButton from '@/components/ui/BackButton';
import NoAccess from '@/components/ui/NoAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Box, Users, TrendingUp, Calendar, Edit3, Check, Loader2, Save } from 'lucide-react';
import { parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Salary() {
  const [business, setBusiness] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [consignmentSales, setConsignmentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [dateRange, setDateRange] = useState({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [editingRate, setEditingRate] = useState(null); // employee id being edited
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

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
      const user = await base44.auth.me();
      setCurrentUser(user);
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);

      const [salesData, consignmentSaleData, employeesData] = await Promise.all([
        base44.entities.Sale.filter({ business_id: biz.id }),
        base44.entities.ConsignmentSale.filter({ business_id: biz.id }),
        base44.entities.Employee.filter({ business_id: biz.id })
      ]);
      setSales(salesData);
      setConsignmentSales(consignmentSaleData);
      setEmployees(employeesData);
    } catch (e) {
      console.error('Error loading salary data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Access: owner or admin employee only
  const emp = window.__barakatEmployee;
  const isOwner = !emp;
  const isAdminEmp = emp?.is_admin === true;
  if (!loading && !isOwner && !isAdminEmp) {
    return <NoAccess message="Раздел «Зарплата» доступен только владельцу и администраторам." />;
  }

  // Unified non-cancelled sales
  const unifiedSales = useMemo(() => [
    ...sales.map(s => ({ ...s, _isConsignment: false })),
    ...consignmentSales.map(s => ({ ...s, _isConsignment: true, is_debt: false }))
  ], [sales, consignmentSales]);

  // Filter by date range
  const salesInRange = useMemo(() => unifiedSales.filter(sale => {
    if (sale.is_cancelled) return false;
    if (!dateRange?.from) return true;
    try {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
    } catch { return false; }
  }), [unifiedSales, dateRange]);

  // Per-employee aggregation
  const employeeStats = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      map[e.user_email] = { employee: e, boxes: 0, salesCount: 0, revenue: 0 };
    });
    salesInRange.forEach(sale => {
      const email = sale.seller_email;
      if (!map[email]) {
        // Seller not in employee list — still track as "unknown"
        map[email] = { employee: { id: 'unknown_' + email, user_email: email, name: sale.seller_name || email, salary_per_box: 0, is_admin: false, _unknown: true }, boxes: 0, salesCount: 0, revenue: 0 };
      }
      map[email].boxes += sale.boxes_sold || 0;
      map[email].salesCount += 1;
      map[email].revenue += sale.total_amount || 0;
    });
    return Object.values(map);
  }, [employees, salesInRange]);

  const filteredStats = useMemo(() => {
    if (filterEmployee === 'all') return employeeStats;
    return employeeStats.filter(s => s.employee.user_email === filterEmployee);
  }, [employeeStats, filterEmployee]);

  const totals = useMemo(() => {
    let boxes = 0, salary = 0, salesCount = 0;
    filteredStats.forEach(s => {
      boxes += s.boxes;
      salary += s.boxes * (s.employee.salary_per_box || 0);
      salesCount += s.salesCount;
    });
    return { boxes, salary, salesCount };
  }, [filteredStats]);

  // Today's totals (ignoring selected range)
  const todayTotals = useMemo(() => {
    const today = { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    let boxes = 0, salary = 0;
    employeeStats.forEach(s => {
      const empBoxes = unifiedSales.filter(sale => {
        if (sale.is_cancelled) return false;
        if (sale.seller_email !== s.employee.user_email) return false;
        try {
          const d = parseISO(sale.sale_date || sale.created_date);
          return isWithinInterval(d, today);
        } catch { return false; }
      }).reduce((acc, sale) => acc + (sale.boxes_sold || 0), 0);
      boxes += empBoxes;
      salary += empBoxes * (s.employee.salary_per_box || 0);
    });
    return { boxes, salary };
  }, [employeeStats, unifiedSales]);

  const setQuickPeriod = (period) => {
    const now = new Date();
    if (period === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (period === 'week') setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else if (period === 'month') setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const startEditRate = (emp) => {
    setEditingRate(emp.id);
    setRateInput(String(emp.salary_per_box || 0));
  };

  const saveRate = async (emp) => {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val < 0) { alert('Введите корректную сумму (число ≥ 0)'); return; }
    setSavingRate(true);
    try {
      await base44.entities.Employee.update(emp.id, { salary_per_box: val });
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, salary_per_box: val } : e));
      setEditingRate(null);
    } catch (e) {
      console.error('Error saving rate:', e);
      alert('Не удалось сохранить ставку. Попробуйте ещё раз.');
    } finally {
      setSavingRate(false);
    }
  };

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

  return (
    <div className="space-y-5">
      <BackButton className="mb-2" />

      <PageHeader
        title="Зарплата сотрудников"
        subtitle={`Расчёт по проданным коробкам · ${periodLabel}`}
      />

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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Сотрудник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.user_email}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-slate-400">{filteredStats.length} сотрудн.</span>
        </div>
      </div>

      {/* Employee salary table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Сотрудник</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Коробок</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Продаж</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Ставка / кор.</th>
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
                .sort((a, b) => (b.boxes * (b.employee.salary_per_box || 0)) - (a.boxes * (a.employee.salary_per_box || 0)))
                .map(({ employee: emp, boxes, salesCount, revenue }) => {
                const salary = boxes * (emp.salary_per_box || 0);
                const isEditing = editingRate === emp.id;
                const canEdit = (isOwner || isAdminEmp) && !emp._unknown;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${emp.is_admin ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover rounded-full" />
                            : <span className="text-white font-bold text-sm">{(emp.name || '?').charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{emp.name}</p>
                          {emp.is_admin && <span className="text-[10px] font-bold text-indigo-600">👑 Админ</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">{boxes}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{salesCount}</td>
                    <td className="px-4 py-3 text-center">
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
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">{fmtMoney(emp.salary_per_box || 0)} с.</span>
                          {canEdit && (
                            <button onClick={() => startEditRate(emp)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="Изменить ставку">
                              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-600 text-lg">{fmtMoney(salary)} с.</span>
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
        💡 Зарплата считается как <strong>коробки × ставка</strong>. Отменённые продажи не учитываются.
        Ставка настраивается индивидуально для каждого сотрудника (кнопка ✏️ в колонке «Ставка»).
      </p>
    </div>
  );
}