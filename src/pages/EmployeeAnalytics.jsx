import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import {
  Users, TrendingUp, ShoppingCart, DollarSign, Award, Calendar,
  ArrowUpRight, Eye, EyeOff, BarChart2, GitCompare, User, 
  Star, Target, Zap, AlertCircle, CheckCircle, Clock, CreditCard,
  ChevronDown, ChevronUp, Package, RefreshCw, X
} from 'lucide-react';
import {
  format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isWithinInterval, parseISO, eachDayOfInterval,
  eachWeekOfInterval, differenceInDays
} from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

const PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week',  label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: '7d',    label: '7 дней' },
  { key: '30d',   label: '30 дней' },
  { key: '90d',   label: '90 дней' },
];

const TABS = [
  { key: 'overview',  label: 'Обзор',       icon: BarChart2 },
  { key: 'details',   label: 'Детали',      icon: User },
  { key: 'compare',   label: 'Сравнение',   icon: GitCompare },
  { key: 'timeline',  label: 'Динамика',    icon: TrendingUp },
];

function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case '7d':    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30d':   return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '90d':   return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    default:      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

function MiniStat({ label, value, color = 'text-slate-900', small = false }) {
  return (
    <div className="text-center">
      <p className={`font-bold ${small ? 'text-base' : 'text-xl'} ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function EmployeeAnalytics() {
  const { isOwner, isReady } = useEmployeeAccess();
  const [loading, setLoading]       = useState(true);
  const [employees, setEmployees]   = useState([]);
  const [sales, setSales]           = useState([]);
  const [period, setPeriod]         = useState('30d');
  const [hideAmounts, setHideAmounts] = useState(false);
  const [sortBy, setSortBy]         = useState('revenue');
  const [tab, setTab]               = useState('overview');
  const [selectedEmp, setSelectedEmp] = useState(null);  // для вкладки Детали
  const [compareA, setCompareA]     = useState(null);
  const [compareB, setCompareB]     = useState(null);
  const [chartMetric, setChartMetric] = useState('revenue');

  useEffect(() => {
    if (!isReady || !isOwner) return;
    loadData();
  }, [isReady]);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) return;
      const [emps, salesData] = await Promise.all([
        base44.entities.Employee.filter({ business_id: biz.id }),
        base44.entities.Sale.filter({ business_id: biz.id }),
      ]);
      setEmployees(emps);
      setSales(salesData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  const periodSales = useMemo(() => sales.filter(s => {
    if (s.is_cancelled) return false;
    try {
      return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: from, end: to });
    } catch { return false; }
  }), [sales, from, to]);

  // Полная статистика по всем продажам (не только за период — для сравнения и деталей)
  const allTimeSalesMap = useMemo(() => {
    const map = {};
    sales.filter(s => !s.is_cancelled).forEach(s => {
      const e = s.created_by;
      if (!e) return;
      if (!map[e]) map[e] = { count: 0, revenue: 0, profit: 0, debtCount: 0 };
      map[e].count++;
      map[e].revenue += s.total_amount || 0;
      map[e].profit += s.profit || 0;
      if (s.is_debt) map[e].debtCount++;
    });
    return map;
  }, [sales]);

  // Статистика по сотруднику за период
  const employeeStats = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      map[emp.user_email] = {
        id: emp.id, name: emp.name || emp.user_email.split('@')[0],
        email: emp.user_email, avatar: emp.name?.charAt(0)?.toUpperCase() || '?',
        count: 0, revenue: 0, profit: 0, boxes: 0,
        debtCount: 0, debtAmount: 0, cancelCount: 0,
        allTime: allTimeSalesMap[emp.user_email] || { count: 0, revenue: 0, profit: 0, debtCount: 0 }
      };
    });

    periodSales.forEach(s => {
      const email = s.created_by;
      if (!email) return;
      if (!map[email]) {
        map[email] = {
          id: null, name: email.split('@')[0], email,
          avatar: email.charAt(0).toUpperCase(),
          count: 0, revenue: 0, profit: 0, boxes: 0,
          debtCount: 0, debtAmount: 0, cancelCount: 0,
          allTime: allTimeSalesMap[email] || { count: 0, revenue: 0, profit: 0, debtCount: 0 }
        };
      }
      map[email].count++;
      map[email].revenue += s.total_amount || 0;
      map[email].profit += s.profit || 0;
      map[email].boxes += s.boxes_sold || 0;
      if (s.is_debt) { map[email].debtCount++; map[email].debtAmount += s.total_amount || 0; }
    });

    // Отменённые
    sales.filter(s => s.is_cancelled).forEach(s => {
      try {
        const d = parseISO(s.cancelled_at || s.created_date);
        if (isWithinInterval(d, { start: from, end: to }) && s.created_by && map[s.created_by]) {
          map[s.created_by].cancelCount++;
        }
      } catch {}
    });

    return Object.values(map).sort((a, b) => {
      if (sortBy === 'count')  return b.count - a.count;
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'avg')    return (b.count ? b.revenue / b.count : 0) - (a.count ? a.revenue / a.count : 0);
      if (sortBy === 'boxes')  return b.boxes - a.boxes;
      return b.revenue - a.revenue;
    });
  }, [periodSales, employees, sales, from, to, sortBy, allTimeSalesMap]);

  const totals = useMemo(() => ({
    count:    periodSales.length,
    revenue:  periodSales.reduce((s, x) => s + (x.total_amount || 0), 0),
    profit:   periodSales.reduce((s, x) => s + (x.profit || 0), 0),
    boxes:    periodSales.reduce((s, x) => s + (x.boxes_sold || 0), 0),
    debtCount: periodSales.filter(s => s.is_debt).length,
  }), [periodSales]);

  // Динамика по дням/неделям для timeline
  const timelineData = useMemo(() => {
    const days = differenceInDays(to, from);
    const useWeeks = days > 31;
    const intervals = useWeeks
      ? eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
      : eachDayOfInterval({ start: from, end: to });

    return intervals.map(date => {
      const intervalEnd = useWeeks ? endOfDay(subDays(date, -6)) : endOfDay(date);
      const row = { date: format(date, useWeeks ? 'dd MMM' : 'dd.MM', { locale: ru }) };
      employees.forEach(emp => {
        const empSales = periodSales.filter(s => {
          if (s.created_by !== emp.user_email) return false;
          try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(date), end: intervalEnd }); }
          catch { return false; }
        });
        const shortName = (emp.name || emp.user_email).split(' ')[0];
        row[shortName] = empSales.reduce((sum, s) => sum + (chartMetric === 'count' ? 1 : s.total_amount || 0), 0);
      });
      return row;
    });
  }, [periodSales, employees, from, to, chartMetric]);

  // Радар для сравнения
  const getRadarData = (empEmail) => {
    const emp = employeeStats.find(e => e.email === empEmail);
    if (!emp) return [];
    const maxRevenue = Math.max(...employeeStats.map(e => e.revenue), 1);
    const maxCount   = Math.max(...employeeStats.map(e => e.count), 1);
    const maxProfit  = Math.max(...employeeStats.map(e => e.profit), 1);
    const maxBoxes   = Math.max(...employeeStats.map(e => e.boxes), 1);
    const maxAvg     = Math.max(...employeeStats.map(e => e.count ? e.revenue / e.count : 0), 1);
    return [
      { metric: 'Выручка',    value: Math.round((emp.revenue / maxRevenue) * 100) },
      { metric: 'Продажи',    value: Math.round((emp.count / maxCount) * 100) },
      { metric: 'Прибыль',    value: Math.round((emp.profit / maxProfit) * 100) },
      { metric: 'Коробки',    value: Math.round((emp.boxes / maxBoxes) * 100) },
      { metric: 'Ср.чек',     value: Math.round(((emp.count ? emp.revenue / emp.count : 0) / maxAvg) * 100) },
    ];
  };

  const fmt = (n) => hideAmounts ? '•••••' : `${Math.round(n).toLocaleString()} с.`;

  if (!isReady) return <PageLoader message="Загрузка..." />;
  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-600 font-medium">Доступ только для владельца бизнеса</p>
        </div>
      </div>
    );
  }
  if (loading) return <PageLoader message="Загрузка аналитики..." />;

  const activeEmps = employeeStats.filter(e => e.count > 0);

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Эффективность сотрудников</h1>
          <p className="text-sm text-slate-500 mt-0.5">{employees.length} сотр. · {activeEmps.length} активных за период</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Обновить
          </button>
          <button onClick={() => setHideAmounts(h => !h)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
            {hideAmounts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hideAmounts ? 'Показать' : 'Скрыть'}
          </button>
        </div>
      </div>

      {/* Period */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              period === p.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>
            {p.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-1">
          {format(from, 'd MMM', { locale: ru })} — {format(to, 'd MMM yyyy', { locale: ru })}
        </span>
      </div>

      {/* Total KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Продажи', value: totals.count, sub: `${activeEmps.length} сотр.`, bg: 'from-indigo-500 to-indigo-700', light: 'text-indigo-200' },
          { label: 'Выручка', value: fmt(totals.revenue), sub: 'за период', bg: 'from-emerald-500 to-emerald-700', light: 'text-emerald-200' },
          { label: 'Прибыль', value: fmt(totals.profit), sub: totals.revenue > 0 ? `${Math.round(totals.profit / totals.revenue * 100)}% маржа` : '—', bg: 'from-amber-500 to-amber-600', light: 'text-amber-200' },
          { label: 'Коробок', value: totals.boxes, sub: 'продано', bg: 'from-purple-500 to-purple-700', light: 'text-purple-200' },
          { label: 'В долг', value: totals.debtCount, sub: 'продаж', bg: 'from-red-500 to-red-600', light: 'text-red-200' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.bg} rounded-2xl p-4 text-white`}>
            <p className={`${item.light} text-xs`}>{item.label}</p>
            <p className="text-2xl font-bold mt-1">{item.value}</p>
            <p className={`${item.light} text-xs mt-1`}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ TAB: OVERVIEW ============ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Leaderboard badges */}
          {activeEmps.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { emoji: '🥇', label: 'Лидер по выручке', emp: [...employeeStats].filter(e=>e.count>0).sort((a,b) => b.revenue - a.revenue)[0], val: e => fmt(e.revenue) },
                { emoji: '🎯', label: 'Больше всего продаж', emp: [...employeeStats].filter(e=>e.count>0).sort((a,b) => b.count - a.count)[0], val: e => `${e.count} прод.` },
                { emoji: '💎', label: 'Лучший средний чек', emp: [...employeeStats].filter(e=>e.count>0).sort((a,b) => (b.revenue/b.count||0)-(a.revenue/a.count||0))[0], val: e => fmt(e.count ? e.revenue/e.count : 0) },
                { emoji: '📦', label: 'Больше всего коробок', emp: [...employeeStats].filter(e=>e.count>0).sort((a,b) => b.boxes - a.boxes)[0], val: e => `${e.boxes} кор.` },
              ].filter(item => item.emp).map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedEmp(item.emp.email); setTab('details'); }}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="font-bold text-slate-900 truncate">{item.emp.name}</p>
                    <p className="text-xs text-indigo-600 font-semibold">{item.val(item.emp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bar Chart */}
          {activeEmps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold text-slate-900 text-sm">Сравнение по метрике</h2>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'revenue', label: 'Выручка' },
                    { key: 'count',   label: 'Продажи' },
                    { key: 'profit',  label: 'Прибыль' },
                    { key: 'boxes',   label: 'Коробки' },
                    { key: 'avg',     label: 'Ср.чек' },
                  ].map(s => (
                    <button key={s.key} onClick={() => setSortBy(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        sortBy === s.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={activeEmps.map(e => ({
                  name: e.name.split(' ')[0],
                  value: sortBy === 'count' ? e.count : sortBy === 'profit' ? Math.round(e.profit) : sortBy === 'boxes' ? e.boxes : sortBy === 'avg' ? Math.round(e.count ? e.revenue / e.count : 0) : Math.round(e.revenue),
                  email: e.email
                }))} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={55}
                    tickFormatter={v => sortBy === 'count' || sortBy === 'boxes' ? v : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(value) => [sortBy === 'count' || sortBy === 'boxes' ? value : `${value.toLocaleString()} с.`, '']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} cursor="pointer"
                    onClick={(data) => { setSelectedEmp(data.email); setTab('details'); }}>
                    {activeEmps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400 text-center mt-1">Нажмите на столбец для детального просмотра</p>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Таблица сотрудников</h2>
              <span className="text-xs text-slate-400">{employeeStats.length} сотр.</span>
            </div>
            <div className="divide-y divide-slate-50">
              {employeeStats.map((emp, idx) => {
                const avg = emp.count > 0 ? emp.revenue / emp.count : 0;
                const shareRevenue = totals.revenue > 0 ? (emp.revenue / totals.revenue) * 100 : 0;
                const shareCount = totals.count > 0 ? (emp.count / totals.count) * 100 : 0;
                const noSales = emp.count === 0;
                const isTop = idx === 0 && emp.count > 0;

                return (
                  <div key={emp.email}
                    onClick={() => { setSelectedEmp(emp.email); setTab('details'); }}
                    className={`p-4 cursor-pointer transition-all ${isTop ? 'bg-amber-50/50' : noSales ? 'bg-slate-50/30 opacity-60' : 'hover:bg-indigo-50/30'}`}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white shadow-sm`}
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                        {isTop ? '🥇' : emp.avatar}
                      </div>
                      {/* Name & email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${noSales ? 'text-slate-400' : 'text-slate-900'}`}>{emp.name}</p>
                          {isTop && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Лидер</span>}
                          {noSales && <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Нет продаж</span>}
                        </div>
                        {!noSales && (
                          <div className="flex gap-1 mt-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${shareRevenue}%` }} />
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400">{Math.round(shareRevenue)}% выручки · {Math.round(shareCount)}% продаж</p>
                      </div>
                      {/* Stats */}
                      {!noSales && (
                        <div className="grid grid-cols-4 gap-3 flex-shrink-0 text-right">
                          <MiniStat label="Продаж" value={emp.count} color="text-indigo-600" small />
                          <MiniStat label="Выручка" value={fmt(emp.revenue)} color="text-emerald-600" small />
                          <MiniStat label="Прибыль" value={fmt(emp.profit)} color="text-amber-600" small />
                          <MiniStat label="Ср.чек" value={fmt(avg)} color="text-purple-600" small />
                        </div>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0 ml-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: DETAILS ============ */}
      {tab === 'details' && (
        <div className="space-y-4">
          {/* Employee Selector */}
          <div className="flex flex-wrap gap-2">
            {employeeStats.map((emp, idx) => (
              <button key={emp.email} onClick={() => setSelectedEmp(emp.email)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedEmp === emp.email ? 'text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
                style={selectedEmp === emp.email ? { backgroundColor: COLORS[idx % COLORS.length] } : {}}>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {emp.avatar}
                </span>
                {emp.name}
              </button>
            ))}
          </div>

          {!selectedEmp && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите сотрудника выше</p>
            </div>
          )}

          {selectedEmp && (() => {
            const emp = employeeStats.find(e => e.email === selectedEmp);
            if (!emp) return null;
            const empIdx = employeeStats.indexOf(emp);
            const color = COLORS[empIdx % COLORS.length];
            const avg = emp.count > 0 ? emp.revenue / emp.count : 0;
            const margin = emp.revenue > 0 ? (emp.profit / emp.revenue * 100) : 0;
            const shareRevenue = totals.revenue > 0 ? (emp.revenue / totals.revenue * 100) : 0;

            // Продажи этого сотрудника за период по дням
            const empDailySales = eachDayOfInterval({ start: from, end: to }).map(date => {
              const daySales = periodSales.filter(s => {
                if (s.created_by !== emp.email) return false;
                try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(date), end: endOfDay(date) }); }
                catch { return false; }
              });
              return {
                date: format(date, 'dd.MM', { locale: ru }),
                revenue: daySales.reduce((s, x) => s + (x.total_amount || 0), 0),
                count: daySales.length,
                profit: daySales.reduce((s, x) => s + (x.profit || 0), 0),
              };
            });

            const rank = { revenue: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.revenue-a.revenue).findIndex(e=>e.email===emp.email)+1,
              count: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.count-a.count).findIndex(e=>e.email===emp.email)+1,
              profit: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.profit-a.profit).findIndex(e=>e.email===emp.email)+1 };

            return (
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: color }} />
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
                        style={{ backgroundColor: color }}>
                        {emp.avatar}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">{emp.name}</h2>
                        <p className="text-sm text-slate-400">{emp.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rank.revenue === 1 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">🥇 Лидер выручки</span>}
                          {rank.count === 1 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🎯 Лидер продаж</span>}
                          {rank.profit === 1 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💎 Лидер прибыли</span>}
                          {emp.count === 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Нет продаж в периоде</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-400">Место в рейтинге</p>
                        <p className="text-3xl font-black" style={{ color }}>#{empIdx + 1}</p>
                        <p className="text-xs text-slate-400">из {activeEmps.length} активных</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Продаж', value: emp.count, sub: `#${rank.count} место`, icon: ShoppingCart, bg: 'bg-indigo-50', ic: 'text-indigo-600' },
                    { label: 'Выручка', value: fmt(emp.revenue), sub: `${Math.round(shareRevenue)}% от общей`, icon: DollarSign, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
                    { label: 'Прибыль', value: fmt(emp.profit), sub: `${Math.round(margin)}% маржа`, icon: TrendingUp, bg: 'bg-amber-50', ic: 'text-amber-600' },
                    { label: 'Коробок', value: emp.boxes, sub: 'продано', icon: Package, bg: 'bg-purple-50', ic: 'text-purple-600' },
                    { label: 'Ср.чек', value: fmt(avg), sub: 'на продажу', icon: Target, bg: 'bg-blue-50', ic: 'text-blue-600' },
                    { label: 'В долг', value: emp.debtCount, sub: `${emp.count > 0 ? Math.round(emp.debtCount/emp.count*100) : 0}% продаж`, icon: CreditCard, bg: 'bg-red-50', ic: 'text-red-500' },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-2xl p-3 text-center`}>
                      <item.icon className={`w-5 h-5 ${item.ic} mx-auto mb-1`} />
                      <p className="font-bold text-slate-900 text-sm">{item.value}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{item.label}</p>
                      <p className="text-[9px] text-slate-400">{item.sub}</p>
                    </div>
                  ))}
                </div>

                {/* All Time Stats */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> За всё время
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <MiniStat label="Всего продаж" value={emp.allTime.count} color="text-indigo-600" />
                    <MiniStat label="Всего выручки" value={fmt(emp.allTime.revenue)} color="text-emerald-600" />
                    <MiniStat label="Всего прибыли" value={fmt(emp.allTime.profit)} color="text-amber-600" />
                    <MiniStat label="Продаж в долг" value={emp.allTime.debtCount} color="text-red-500" />
                  </div>
                </div>

                {/* Daily Chart */}
                {emp.count > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Динамика продаж</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={empDailySales} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(empDailySales.length / 7)} />
                        <YAxis tick={{ fontSize: 9 }} width={40} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                          formatter={(v, name) => [name === 'revenue' ? `${v.toLocaleString()} с.` : v, name === 'revenue' ? 'Выручка' : 'Продажи']} />
                        <Line type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Radar */}
                {emp.count > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Профиль эффективности</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={getRadarData(emp.email)}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-400 text-center">% от максимума среди всех сотрудников</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ============ TAB: COMPARE ============ */}
      {tab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Сотрудник А', value: compareA, setter: setCompareA, color: '#6366f1' },
              { label: 'Сотрудник Б', value: compareB, setter: setCompareB, color: '#10b981' },
            ].map((side, si) => (
              <div key={si}>
                <p className="text-xs font-semibold text-slate-500 mb-2">{side.label}</p>
                <div className="flex flex-col gap-1.5">
                  {employeeStats.map((emp, idx) => (
                    <button key={emp.email}
                      onClick={() => side.setter(emp.email === side.value ? null : emp.email)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                        side.value === emp.email ? 'text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                      style={side.value === emp.email ? { backgroundColor: side.color } : {}}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: side.value === emp.email ? 'rgba(255,255,255,0.25)' : COLORS[idx % COLORS.length], color: 'white' }}>
                        {emp.avatar}
                      </span>
                      <span className="flex-1 truncate">{emp.name}</span>
                      {side.value === emp.email && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {compareA && compareB && (() => {
            const empA = employeeStats.find(e => e.email === compareA);
            const empB = employeeStats.find(e => e.email === compareB);
            if (!empA || !empB) return null;

            const metrics = [
              { label: 'Продажи', a: empA.count, b: empB.count, fmt: v => v, unit: 'прод.' },
              { label: 'Выручка', a: empA.revenue, b: empB.revenue, fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Прибыль', a: empA.profit, b: empB.profit, fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Коробок', a: empA.boxes, b: empB.boxes, fmt: v => v, unit: 'кор.' },
              { label: 'Ср.чек', a: empA.count ? empA.revenue/empA.count : 0, b: empB.count ? empB.revenue/empB.count : 0, fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Маржа', a: empA.revenue > 0 ? empA.profit/empA.revenue*100 : 0, b: empB.revenue > 0 ? empB.profit/empB.revenue*100 : 0, fmt: v => `${Math.round(v)}`, unit: '%' },
              { label: 'В долг', a: empA.debtCount, b: empB.debtCount, fmt: v => v, unit: 'прод.' },
            ];

            const radarCompare = getRadarData(compareA).map((r, i) => ({
              metric: r.metric,
              [empA.name.split(' ')[0]]: r.value,
              [empB.name.split(' ')[0]]: getRadarData(compareB)[i].value
            }));

            return (
              <div className="space-y-4">
                {/* VS Header */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">{empA.avatar}</div>
                    <p className="font-bold text-slate-900">{empA.name}</p>
                    <p className="text-xs text-slate-400">{empA.email}</p>
                  </div>
                  <div className="text-2xl font-black text-slate-300">VS</div>
                  <div className="flex-1 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">{empB.avatar}</div>
                    <p className="font-bold text-slate-900">{empB.name}</p>
                    <p className="text-xs text-slate-400">{empB.email}</p>
                  </div>
                </div>

                {/* Metrics comparison */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Сравнение показателей</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {metrics.map((m, i) => {
                      const total = m.a + m.b;
                      const pctA = total > 0 ? (m.a / total * 100) : 50;
                      const winner = m.a > m.b ? 'a' : m.b > m.a ? 'b' : 'tie';
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-bold ${winner === 'a' ? 'text-indigo-600' : 'text-slate-500'}`}>
                              {m.fmt(m.a)} {m.unit} {winner === 'a' && '✓'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{m.label}</span>
                            <span className={`text-sm font-bold ${winner === 'b' ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {winner === 'b' && '✓'} {m.fmt(m.b)} {m.unit}
                            </span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                            <div className="transition-all bg-indigo-500" style={{ width: `${pctA}%` }} />
                            <div className="transition-all bg-emerald-500" style={{ width: `${100 - pctA}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Radar Compare */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Паук-диаграмма</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarCompare}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar dataKey={empA.name.split(' ')[0]} stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                      <Radar dataKey={empB.name.split(' ')[0]} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {(!compareA || !compareB) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите двух сотрудников для сравнения</p>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: TIMELINE ============ */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          {/* Metric toggle */}
          <div className="flex gap-2">
            {[
              { key: 'revenue', label: 'Выручка' },
              { key: 'count',   label: 'Кол-во продаж' },
            ].map(m => (
              <button key={m.key} onClick={() => setChartMetric(m.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  chartMetric === m.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Multi-line chart */}
          {activeEmps.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Динамика всех сотрудников</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(timelineData.length / 6)} />
                  <YAxis tick={{ fontSize: 9 }} width={50} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                    formatter={(v, name) => [chartMetric === 'revenue' ? `${v.toLocaleString()} с.` : v, name]} />
                  <Legend />
                  {activeEmps.map((emp, i) => (
                    <Line key={emp.email} type="monotone"
                      dataKey={emp.name.split(' ')[0]}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Нет данных за выбранный период</p>
            </div>
          )}

          {/* Per-employee mini sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeEmps.map((emp, idx) => {
              const color = COLORS[idx % COLORS.length];
              const empData = timelineData.map(d => ({
                date: d.date,
                value: d[emp.name.split(' ')[0]] || 0
              }));
              const peak = Math.max(...empData.map(d => d.value), 1);
              const total = empData.reduce((s, d) => s + d.value, 0);
              const activeDays = empData.filter(d => d.value > 0).length;
              return (
                <div key={emp.email} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedEmp(emp.email); setTab('details'); }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
                        {emp.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{activeDays} дн. активности</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color }}>{chartMetric === 'revenue' ? fmt(total) : `${total} прод.`}</p>
                      <p className="text-[10px] text-slate-400">пик: {chartMetric === 'revenue' ? fmt(peak) : peak}</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={empData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}