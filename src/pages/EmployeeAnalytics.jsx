import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';
import GrowthBadge from '@/components/analytics/GrowthBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts';
import {
  Users, TrendingUp, ShoppingCart, DollarSign, Eye, EyeOff,
  BarChart2, GitCompare, User, Target, Zap, CheckCircle,
  CreditCard, ChevronDown, Package, PackageOpen, RefreshCw, Trophy,
  Medal, Star, Clock, Calendar, ArrowUpRight, ArrowDownRight,
  List, Filter
} from 'lucide-react';
import {
  format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isWithinInterval, parseISO, eachDayOfInterval,
  eachWeekOfInterval, differenceInDays, subMonths, subWeeks
} from 'date-fns';
import { ru } from 'date-fns/locale';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

// ─── Constants ───────────────────────────────────────────────
const COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'
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
  { key: 'overview', label: 'Обзор',      icon: BarChart2 },
  { key: 'ranking',  label: 'Рейтинг',   icon: Trophy },
  { key: 'details',  label: 'Детали',    icon: User },
  { key: 'compare',  label: 'Сравнение', icon: GitCompare },
  { key: 'timeline', label: 'Динамика',  icon: TrendingUp },
];

// ─── Helpers ─────────────────────────────────────────────────
function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case '7d':    return { from: startOfDay(subDays(now, 6)),  to: endOfDay(now) };
    case '30d':   return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '90d':   return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    default:      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

function getPrevPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case 'today': { const d = subDays(now, 1); return { from: startOfDay(d), to: endOfDay(d) }; }
    case 'week':  { const w = subWeeks(now, 1); return { from: startOfWeek(w, { weekStartsOn: 1 }), to: endOfWeek(w, { weekStartsOn: 1 }) }; }
    case 'month': { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfMonth(m) }; }
    case '7d':    return { from: startOfDay(subDays(now, 13)), to: endOfDay(subDays(now, 7)) };
    case '30d':   return { from: startOfDay(subDays(now, 59)), to: endOfDay(subDays(now, 30)) };
    case '90d':   return { from: startOfDay(subDays(now, 179)), to: endOfDay(subDays(now, 90)) };
    default:      return { from: startOfDay(subDays(now, 59)), to: endOfDay(subDays(now, 30)) };
  }
}

function filterSales(sales, from, to) {
  return sales.filter(s => {
    if (s.is_cancelled) return false;
    try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: from, end: to }); }
    catch { return false; }
  });
}

function buildStats(employees, salesList, allTimeSalesMap, consignmentList = []) {
  const map = {};
  employees.forEach(emp => {
    map[emp.user_email] = {
      id: emp.id, name: emp.name || emp.user_email.split('@')[0],
      email: emp.user_email, avatar: (emp.name || emp.user_email).charAt(0).toUpperCase(),
      avatar_url: emp.avatar_url, is_admin: emp.is_admin,
      count: 0, revenue: 0, profit: 0, boxes: 0, debtCount: 0, debtAmount: 0, cancelCount: 0,
      consignmentCount: 0, consignmentProfit: 0, consignmentBoxes: 0, consignmentOwnerAmount: 0,
      allTime: allTimeSalesMap[emp.user_email] || { count: 0, revenue: 0, profit: 0, debtCount: 0 }
    };
  });
  salesList.forEach(s => {
    const email = s.created_by; if (!email) return;
    if (!map[email]) map[email] = {
      id: null, name: email.split('@')[0], email,
      avatar: email.charAt(0).toUpperCase(),
      count: 0, revenue: 0, profit: 0, boxes: 0, debtCount: 0, debtAmount: 0, cancelCount: 0,
      consignmentCount: 0, consignmentProfit: 0, consignmentBoxes: 0, consignmentOwnerAmount: 0,
      allTime: allTimeSalesMap[email] || { count: 0, revenue: 0, profit: 0, debtCount: 0 }
    };
    map[email].count++;
    map[email].revenue += s.total_amount || 0;
    map[email].profit += s.profit || 0;
    map[email].boxes += s.boxes_sold || 0;
    if (s.is_debt) { map[email].debtCount++; map[email].debtAmount += s.total_amount || 0; }
  });
  // Добавляем прибыль с реализации чужих товаров (только seller_profit, не owner_amount)
  consignmentList.forEach(s => {
    if (s.is_cancelled) return;
    const email = s.seller_email || s.created_by; if (!email) return;
    if (!map[email]) map[email] = {
      id: null, name: email.split('@')[0], email,
      avatar: email.charAt(0).toUpperCase(),
      count: 0, revenue: 0, profit: 0, boxes: 0, debtCount: 0, debtAmount: 0, cancelCount: 0,
      consignmentCount: 0, consignmentProfit: 0, consignmentBoxes: 0, consignmentOwnerAmount: 0,
      allTime: allTimeSalesMap[email] || { count: 0, revenue: 0, profit: 0, debtCount: 0 }
    };
    map[email].consignmentCount++;
    map[email].consignmentProfit += s.seller_profit || 0;
    map[email].consignmentBoxes += s.boxes_sold || 0;
    map[email].consignmentOwnerAmount += s.owner_amount || 0;
    // Прибыль с реализации добавляется в общую прибыль сотрудника
    map[email].profit += s.seller_profit || 0;
    // Коробки с реализации добавляются в общее количество
    map[email].boxes += s.boxes_sold || 0;
  });
  return Object.values(map);
}

// ─── Sub-components ──────────────────────────────────────────
function MiniStat({ label, value, color = 'text-slate-900', sub }) {
  return (
    <div className="text-center">
      <p className={`font-bold text-base ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-slate-300">{sub}</p>}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, bg, ic }) {
  return (
    <div className={`${bg} rounded-2xl p-3 text-center`}>
      <Icon className={`w-5 h-5 ${ic} mx-auto mb-1`} />
      <p className="font-bold text-slate-900 text-sm leading-tight">{value}</p>
      <p className="text-[9px] text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function EmployeeAnalytics() {
  const { isOwner, isReady, can } = useEmployeeAccess();
  const [loading, setLoading]         = useState(true);
  const [employees, setEmployees]     = useState([]);
  const [sales, setSales]             = useState([]);
  const [consignmentSales, setConsignmentSales] = useState([]);
  const [period, setPeriod]           = useState('30d');
  const [hideAmounts, setHideAmounts] = useState(false);
  const [sortBy, setSortBy]           = useState('revenue');
  const [tab, setTab]                 = useState('overview');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [compareA, setCompareA]       = useState(null);
  const [compareB, setCompareB]       = useState(null);
  const [chartMetric, setChartMetric] = useState('revenue');
  const [showSalesList, setShowSalesList] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isOwner && !can('view_employee_analytics')) return;
    loadData();
  }, [isReady]);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) return;
      const [emps, salesData, consignmentData] = await Promise.all([
        base44.entities.Employee.filter({ business_id: biz.id }),
        base44.entities.Sale.filter({ business_id: biz.id }),
        base44.entities.ConsignmentSale.filter({ business_id: biz.id }),
      ]);
      setEmployees(emps);
      setSales(salesData);
      setConsignmentSales(consignmentData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const { from, to }         = useMemo(() => getPeriodRange(period), [period]);
  const { from: pFrom, to: pTo } = useMemo(() => getPrevPeriodRange(period), [period]);

  const periodSales   = useMemo(() => filterSales(sales, from, to),   [sales, from, to]);
  const prevSales     = useMemo(() => filterSales(sales, pFrom, pTo), [sales, pFrom, pTo]);
  const periodConsignment = useMemo(() => filterSales(consignmentSales, from, to), [consignmentSales, from, to]);
  const prevConsignment   = useMemo(() => filterSales(consignmentSales, pFrom, pTo), [consignmentSales, pFrom, pTo]);

  const allTimeSalesMap = useMemo(() => {
    const map = {};
    sales.filter(s => !s.is_cancelled).forEach(s => {
      const e = s.created_by; if (!e) return;
      if (!map[e]) map[e] = { count: 0, revenue: 0, profit: 0, debtCount: 0 };
      map[e].count++; map[e].revenue += s.total_amount || 0;
      map[e].profit += s.profit || 0;
      if (s.is_debt) map[e].debtCount++;
    });
    // Добавляем прибыль с реализации чужих товаров (только seller_profit)
    consignmentSales.filter(s => !s.is_cancelled).forEach(s => {
      const e = s.seller_email || s.created_by; if (!e) return;
      if (!map[e]) map[e] = { count: 0, revenue: 0, profit: 0, debtCount: 0 };
      map[e].profit += s.seller_profit || 0;
    });
    return map;
  }, [sales, consignmentSales]);

  const employeeStats = useMemo(() => {
    const stats = buildStats(employees, periodSales, allTimeSalesMap, periodConsignment);
    return stats.sort((a, b) => {
      if (sortBy === 'count')  return b.count - a.count;
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'avg')    return (b.count ? b.revenue/b.count : 0) - (a.count ? a.revenue/a.count : 0);
      if (sortBy === 'boxes')  return b.boxes - a.boxes;
      return b.revenue - a.revenue;
    });
  }, [periodSales, employees, sortBy, allTimeSalesMap]);

  const prevStatsMap = useMemo(() => {
    const stats = buildStats(employees, prevSales, allTimeSalesMap, prevConsignment);
    const map = {};
    stats.forEach(e => { map[e.email] = e; });
    return map;
  }, [prevSales, employees, allTimeSalesMap]);

  const totals = useMemo(() => ({
    count:    periodSales.length,
    revenue:  periodSales.reduce((s, x) => s + (x.total_amount || 0), 0),
    profit:   periodSales.reduce((s, x) => s + (x.profit || 0), 0) + periodConsignment.reduce((s, x) => s + (x.seller_profit || 0), 0),
    boxes:    periodSales.reduce((s, x) => s + (x.boxes_sold || 0), 0) + periodConsignment.reduce((s, x) => s + (x.boxes_sold || 0), 0),
    debtCount: periodSales.filter(s => s.is_debt).length,
    consignmentProfit: periodConsignment.reduce((s, x) => s + (x.seller_profit || 0), 0),
    consignmentCount: periodConsignment.length,
  }), [periodSales, periodConsignment]);

  const prevTotals = useMemo(() => ({
    count:   prevSales.length,
    revenue: prevSales.reduce((s, x) => s + (x.total_amount || 0), 0),
    profit:  prevSales.reduce((s, x) => s + (x.profit || 0), 0) + prevConsignment.reduce((s, x) => s + (x.seller_profit || 0), 0),
  }), [prevSales, prevConsignment]);

  // Timeline data
  const timelineData = useMemo(() => {
    const days = differenceInDays(to, from);
    const useWeeks = days > 31;
    const intervals = useWeeks
      ? eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
      : eachDayOfInterval({ start: from, end: to });
    const activeEmps = employeeStats.filter(e => e.count > 0);
    return intervals.map(date => {
      const intervalEnd = useWeeks ? endOfDay(subDays(date, -6)) : endOfDay(date);
      const row = { date: format(date, useWeeks ? 'dd MMM' : 'dd.MM', { locale: ru }) };
      activeEmps.forEach(emp => {
        const empSales = periodSales.filter(s => {
          if (s.created_by !== emp.email) return false;
          try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(date), end: intervalEnd }); }
          catch { return false; }
        });
        row[emp.name.split(' ')[0]] = empSales.reduce((sum, s) => sum + (chartMetric === 'count' ? 1 : s.total_amount || 0), 0);
      });
      return row;
    });
  }, [periodSales, employeeStats, from, to, chartMetric]);

  // Radar helper
  const getRadarData = (empEmail) => {
    const emp = employeeStats.find(e => e.email === empEmail);
    if (!emp) return [];
    const maxR = Math.max(...employeeStats.map(e => e.revenue), 1);
    const maxC = Math.max(...employeeStats.map(e => e.count), 1);
    const maxP = Math.max(...employeeStats.map(e => e.profit), 1);
    const maxB = Math.max(...employeeStats.map(e => e.boxes), 1);
    const maxA = Math.max(...employeeStats.map(e => e.count ? e.revenue/e.count : 0), 1);
    return [
      { metric: 'Выручка', value: Math.round(emp.revenue / maxR * 100) },
      { metric: 'Продажи', value: Math.round(emp.count / maxC * 100) },
      { metric: 'Прибыль', value: Math.round(emp.profit / maxP * 100) },
      { metric: 'Коробки', value: Math.round(emp.boxes / maxB * 100) },
      { metric: 'Ср.чек',  value: Math.round((emp.count ? emp.revenue/emp.count : 0) / maxA * 100) },
    ];
  };

  const fmt = (n) => hideAmounts ? '•••••' : `${Math.round(n).toLocaleString()} с.`;
  const activeEmps = employeeStats.filter(e => e.count > 0);

  if (!isReady) return <PageLoader message="Загрузка..." />;
  if (!isOwner && !can('view_employee_analytics')) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-600 font-medium">Нет доступа к разделу «Эффективность»</p>
        <p className="text-slate-400 text-sm">Обратитесь к владельцу бизнеса</p>
      </div>
    </div>
  );
  if (loading) return <PageLoader message="Загрузка аналитики..." />;

  return (
    <div className="space-y-4 pb-10">

      {/* ── Header ── */}
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

      {/* ── Period ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              period === p.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>
            {p.label}
          </button>
        ))}
        <span className="text-xs text-slate-400">
          {format(from, 'd MMM', { locale: ru })} — {format(to, 'd MMM yyyy', { locale: ru })}
        </span>
      </div>

      {/* ── Total KPIs with growth ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Продажи',  value: totals.count,   prev: prevTotals.count,   sub: `${activeEmps.length} сотр.`, bg: 'from-indigo-500 to-indigo-700', light: 'text-indigo-200', isNum: true },
          { label: 'Выручка',  value: fmt(totals.revenue), prev: prevTotals.revenue, sub: 'за период',   bg: 'from-emerald-500 to-emerald-700', light: 'text-emerald-200' },
          { label: 'Прибыль',  value: fmt(totals.profit),  prev: prevTotals.profit,  sub: totals.revenue > 0 ? `${Math.round(totals.profit/totals.revenue*100)}% маржа` : '—', bg: 'from-amber-500 to-amber-600', light: 'text-amber-200' },
          { label: 'Коробок',  value: totals.boxes,   sub: 'продано', bg: 'from-purple-500 to-purple-700', light: 'text-purple-200' },
          { label: 'В долг',   value: totals.debtCount, sub: 'продаж', bg: 'from-red-500 to-red-600', light: 'text-red-200' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.bg} rounded-2xl p-4 text-white`}>
            <p className={`${item.light} text-xs`}>{item.label}</p>
            <p className="text-2xl font-bold mt-1">{item.value}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className={`${item.light} text-xs`}>{item.sub}</p>
              {item.prev !== undefined && !hideAmounts && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  (item.isNum ? totals.count : totals.revenue) > item.prev
                    ? 'bg-white/20 text-white' : 'bg-black/20 text-white/80'
                }`}>
                  {item.prev > 0
                    ? `${(item.isNum ? totals.count : totals.revenue) >= item.prev ? '+' : ''}${Math.round(((item.isNum ? totals.count : totals.revenue) - item.prev) / item.prev * 100)}% vs пред.`
                    : 'нет данных'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Leaderboard cards */}
          {activeEmps.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { emoji: '🥇', label: 'Лидер по выручке',   key: 'revenue', val: e => fmt(e.revenue) },
                { emoji: '🎯', label: 'Больше всего продаж', key: 'count',   val: e => `${e.count} прод.` },
                { emoji: '💎', label: 'Лучший средний чек',  key: 'avg',     val: e => fmt(e.count ? e.revenue/e.count : 0) },
                { emoji: '📦', label: 'Больше всего коробок',key: 'boxes',   val: e => `${e.boxes} кор.` },
              ].map((item, i) => {
                const sorted = [...employeeStats].filter(e=>e.count>0).sort((a,b) => {
                  if (item.key === 'avg') return (b.count ? b.revenue/b.count : 0) - (a.count ? a.revenue/a.count : 0);
                  return b[item.key] - a[item.key];
                });
                const top = sorted[0];
                if (!top) return null;
                const prev = prevStatsMap[top.email];
                const prevVal = item.key === 'avg' ? (prev?.count ? prev.revenue/prev.count : 0) : prev?.[item.key] || 0;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => { setSelectedEmp(top.email); setTab('details'); }}>
                    <div className="text-2xl mb-1">{item.emoji}</div>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="font-bold text-slate-900 truncate text-sm">{top.name}</p>
                    <p className="text-xs text-indigo-600 font-semibold">{item.val(top)}</p>
                    <div className="mt-1">
                      <GrowthBadge current={item.key === 'avg' ? (top.count ? top.revenue/top.count : 0) : top[item.key]} previous={prevVal} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bar chart */}
          {activeEmps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-semibold text-slate-900 text-sm">Сравнение по метрике</h2>
                <div className="flex flex-wrap gap-1">
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
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={activeEmps.map((e, i) => ({
                  name: e.name.split(' ')[0],
                  curr: sortBy === 'count' ? e.count : sortBy === 'profit' ? Math.round(e.profit) : sortBy === 'boxes' ? e.boxes : sortBy === 'avg' ? Math.round(e.count ? e.revenue/e.count : 0) : Math.round(e.revenue),
                  prev: (() => {
                    const p = prevStatsMap[e.email];
                    if (!p) return 0;
                    return sortBy === 'count' ? p.count : sortBy === 'profit' ? Math.round(p.profit) : sortBy === 'boxes' ? p.boxes : sortBy === 'avg' ? Math.round(p.count ? p.revenue/p.count : 0) : Math.round(p.revenue);
                  })(),
                  email: e.email
                }))} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} width={55}
                    tickFormatter={v => sortBy === 'count' || sortBy === 'boxes' ? v : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(v, name) => [sortBy === 'count' || sortBy === 'boxes' ? v : `${v.toLocaleString()} с.`, name === 'curr' ? 'Текущий' : 'Предыдущий']} />
                  <Legend formatter={v => v === 'curr' ? 'Текущий период' : 'Предыдущий период'} />
                  <Bar dataKey="prev" radius={[4,4,0,0]} fill="#e2e8f0" opacity={0.7}
                    onClick={(data) => { setSelectedEmp(data.email); setTab('details'); }} />
                  <Bar dataKey="curr" radius={[8,8,0,0]} cursor="pointer"
                    onClick={(data) => { setSelectedEmp(data.email); setTab('details'); }}>
                    {activeEmps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400 text-center mt-1">Серые столбцы — предыдущий период. Нажмите для детального просмотра.</p>
            </div>
          )}

          {/* Employee table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Все сотрудники</h2>
              <span className="text-xs text-slate-400">{employeeStats.length} сотр.</span>
            </div>
            <div className="divide-y divide-slate-50">
              {employeeStats.map((emp, idx) => {
                const avg = emp.count > 0 ? emp.revenue / emp.count : 0;
                const shareRevenue = totals.revenue > 0 ? (emp.revenue / totals.revenue) * 100 : 0;
                const shareCount   = totals.count > 0 ? (emp.count / totals.count) * 100 : 0;
                const noSales = emp.count === 0;
                const isTop = idx === 0 && emp.count > 0;
                const prev = prevStatsMap[emp.email];

                return (
                  <div key={emp.email}
                    onClick={() => { setSelectedEmp(emp.email); setTab('details'); }}
                    className={`p-4 cursor-pointer transition-all ${isTop ? 'bg-amber-50/40' : noSales ? 'opacity-50' : 'hover:bg-indigo-50/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-10 h-10 rounded-xl text-sm" />
                        {isTop && <span className="absolute -top-1 -right-1 text-base">🥇</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${noSales ? 'text-slate-400' : 'text-slate-900'}`}>{emp.name}</p>
                          {isTop && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Лидер</span>}
                          {noSales && <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Нет продаж</span>}
                          {prev && !noSales && (
                            <GrowthBadge current={emp.revenue} previous={prev.revenue} />
                          )}
                        </div>
                        {!noSales && (
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${shareRevenue}%` }} />
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400">{Math.round(shareRevenue)}% выручки · {Math.round(shareCount)}% продаж</p>
                      </div>
                      {!noSales && (
                        <div className="hidden sm:grid grid-cols-4 gap-3 flex-shrink-0 text-right">
                          <MiniStat label="Продаж" value={emp.count} color="text-indigo-600" />
                          <MiniStat label="Выручка" value={fmt(emp.revenue)} color="text-emerald-600" />
                          <MiniStat label="Прибыль" value={fmt(emp.profit)} color="text-amber-600" />
                          <MiniStat label="Ср.чек" value={fmt(avg)} color="text-purple-600" />
                        </div>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: RANKING (геймификация)
      ══════════════════════════════════════════════ */}
      {tab === 'ranking' && (
        <div className="space-y-4">
          {/* Score board */}
          <div className="grid grid-cols-1 gap-3">
            {employeeStats.map((emp, idx) => {
              const color = COLORS[idx % COLORS.length];
              const prev = prevStatsMap[emp.email];
              const score = Math.round(
                emp.count * 10 +
                emp.revenue / 100 +
                emp.profit / 50 +
                emp.boxes * 5 -
                emp.debtCount * 3 -
                emp.cancelCount * 5
              );
              const prevScore = prev ? Math.round(
                prev.count * 10 + prev.revenue / 100 + prev.profit / 50 + prev.boxes * 5
              ) : 0;
              const medals = ['🥇','🥈','🥉'];
              const noSales = emp.count === 0;
              const margin = emp.revenue > 0 ? Math.round(emp.profit / emp.revenue * 100) : 0;
              const avg = emp.count > 0 ? emp.revenue / emp.count : 0;

              return (
                <div key={emp.email}
                  className={`bg-white rounded-2xl border shadow-sm p-4 transition-all cursor-pointer hover:shadow-md ${
                    idx === 0 && !noSales ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-white' :
                    idx === 1 && !noSales ? 'border-slate-300' :
                    idx === 2 && !noSales ? 'border-orange-200' : 'border-slate-100'
                  }`}
                  onClick={() => { setSelectedEmp(emp.email); setTab('details'); }}>
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="text-3xl w-10 text-center flex-shrink-0">
                      {medals[idx] || `#${idx+1}`}
                    </div>
                    {/* Avatar */}
                    <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-12 h-12 rounded-2xl text-lg" />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        {noSales && <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Нет продаж</span>}
                        <GrowthBadge current={emp.revenue} previous={prev?.revenue || 0} />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-1">
                        <div className="text-xs"><span className="text-slate-400">Продаж: </span><span className="font-semibold text-indigo-600">{emp.count}</span></div>
                        <div className="text-xs"><span className="text-slate-400">Выручка: </span><span className="font-semibold text-emerald-600">{hideAmounts ? '•••' : `${Math.round(emp.revenue/1000)}k`}</span></div>
                        <div className="text-xs"><span className="text-slate-400">Прибыль: </span><span className="font-semibold text-amber-600">{hideAmounts ? '•••' : `${Math.round(emp.profit/1000)}k`}</span></div>
                        <div className="text-xs"><span className="text-slate-400">Маржа: </span><span className="font-semibold text-purple-600">{margin}%</span></div>
                        <div className="text-xs"><span className="text-slate-400">Ср.чек: </span><span className="font-semibold text-blue-600">{hideAmounts ? '•••' : `${Math.round(avg/1000)}k`}</span></div>
                      </div>
                      {/* Progress to leader */}
                      {idx > 0 && !noSales && employeeStats[0]?.revenue > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                            <span>До лидера</span>
                            <span>{Math.round(emp.revenue / employeeStats[0].revenue * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${emp.revenue / employeeStats[0].revenue * 100}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black" style={{ color }}>{score.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">очков</p>
                      <GrowthBadge current={score} previous={prevScore} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 text-center">Очки: продажи ×10 + выручка/100 + прибыль/50 + коробки ×5 − долги ×3</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: DETAILS
      ══════════════════════════════════════════════ */}
      {tab === 'details' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {employeeStats.map((emp, idx) => (
              <button key={emp.email} onClick={() => { setSelectedEmp(emp.email); setShowSalesList(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedEmp === emp.email ? 'text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
                style={selectedEmp === emp.email ? { backgroundColor: COLORS[idx % COLORS.length] } : {}}>
                <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-5 h-5 rounded-full text-[10px]" />
                {emp.name}
              </button>
            ))}
          </div>

          {!selectedEmp ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите сотрудника выше</p>
            </div>
          ) : (() => {
            const emp = employeeStats.find(e => e.email === selectedEmp);
            if (!emp) return null;
            const prev = prevStatsMap[emp.email];
            const empIdx = employeeStats.indexOf(emp);
            const color = COLORS[empIdx % COLORS.length];
            const avg = emp.count > 0 ? emp.revenue / emp.count : 0;
            const margin = emp.revenue > 0 ? emp.profit / emp.revenue * 100 : 0;
            const shareRevenue = totals.revenue > 0 ? emp.revenue / totals.revenue * 100 : 0;
            const rank = {
              revenue: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.revenue-a.revenue).findIndex(e=>e.email===emp.email)+1,
              count: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.count-a.count).findIndex(e=>e.email===emp.email)+1,
              profit: [...employeeStats].filter(e=>e.count>0).sort((a,b)=>b.profit-a.profit).findIndex(e=>e.email===emp.email)+1,
            };

            const empDailySales = eachDayOfInterval({ start: from, end: to }).map(date => {
              const daySales = periodSales.filter(s => {
                if (s.created_by !== emp.email) return false;
                try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(date), end: endOfDay(date) }); }
                catch { return false; }
              });
              const prevDaySales = prevSales.filter(s => {
                if (s.created_by !== emp.email) return false;
                const prevDate = subDays(date, differenceInDays(from, pFrom));
                try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(prevDate), end: endOfDay(prevDate) }); }
                catch { return false; }
              });
              return {
                date: format(date, 'dd.MM', { locale: ru }),
                revenue: daySales.reduce((s, x) => s + (x.total_amount || 0), 0),
                profit: daySales.reduce((s, x) => s + (x.profit || 0), 0),
                count: daySales.length,
                prevRevenue: prevDaySales.reduce((s, x) => s + (x.total_amount || 0), 0),
              };
            });

            // All period sales of this employee for list
            const empSalesList = periodSales
              .filter(s => s.created_by === emp.email)
              .sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date));

            return (
              <div className="space-y-4">
                {/* Profile */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: color }} />
                  <div className="p-5 flex items-start gap-4">
                    <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-16 h-16 rounded-2xl text-2xl" className="shadow-lg" />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-slate-900">{emp.name}</h2>
                      <p className="text-sm text-slate-400">{emp.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rank.revenue === 1 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🥇 Лидер выручки</span>}
                        {rank.count === 1 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🎯 Лидер продаж</span>}
                        {rank.profit === 1 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">💎 Лидер прибыли</span>}
                        {emp.count === 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Нет продаж</span>}
                        {prev && <GrowthBadge current={emp.revenue} previous={prev.revenue} />}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">Место</p>
                      <p className="text-3xl font-black" style={{ color }}>#{empIdx+1}</p>
                      <p className="text-xs text-slate-400">из {activeEmps.length}</p>
                    </div>
                  </div>
                </div>

                {/* KPI vs previous period */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Продаж', value: emp.count, prev: prev?.count, icon: ShoppingCart, bg: 'bg-indigo-50', ic: 'text-indigo-600', isNum: true },
                    { label: 'Выручка', value: fmt(emp.revenue), prev: prev?.revenue, icon: DollarSign, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
                    { label: 'Прибыль', value: fmt(emp.profit), prev: prev?.profit, icon: TrendingUp, bg: 'bg-amber-50', ic: 'text-amber-600' },
                    { label: 'Коробок', value: emp.boxes, prev: prev?.boxes, icon: Package, bg: 'bg-purple-50', ic: 'text-purple-600', isNum: true },
                    { label: 'Ср.чек', value: fmt(avg), prev: prev ? (prev.count ? prev.revenue/prev.count : 0) : null, icon: Target, bg: 'bg-blue-50', ic: 'text-blue-600' },
                    { label: 'В долг', value: emp.debtCount, prev: prev?.debtCount, icon: CreditCard, bg: 'bg-red-50', ic: 'text-red-500', isNum: true },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-2xl p-3 text-center`}>
                      <item.icon className={`w-4 h-4 ${item.ic} mx-auto mb-1`} />
                      <p className="font-bold text-slate-900 text-sm">{item.value}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{item.label}</p>
                      {item.prev !== undefined && item.prev !== null && (
                        <div className="mt-1 flex justify-center">
                          <GrowthBadge current={item.isNum ? (item.label === 'Продаж' ? emp.count : item.label === 'Коробок' ? emp.boxes : emp.debtCount) : emp.revenue} previous={item.prev} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Stats for period vs prev */}
                {prev && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" /> Сравнение с предыдущим периодом
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Выручка', curr: emp.revenue, prev: prev.revenue },
                        { label: 'Прибыль', curr: emp.profit, prev: prev.profit },
                        { label: 'Продаж', curr: emp.count, prev: prev.count, isNum: true },
                        { label: 'Коробок', curr: emp.boxes, prev: prev.boxes, isNum: true },
                      ].map((m, i) => {
                        const max = Math.max(m.curr, m.prev, 1);
                        const pctCurr = m.curr / max * 100;
                        const pctPrev = m.prev / max * 100;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500">{m.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{m.isNum ? m.prev : fmt(m.prev)} →</span>
                                <span className="font-semibold text-slate-900">{m.isNum ? m.curr : fmt(m.curr)}</span>
                                <GrowthBadge current={m.curr} previous={m.prev} />
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex-1">
                                <div className="h-full rounded-full bg-slate-300 transition-all" style={{ width: `${pctPrev}%` }} />
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex-1">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pctCurr}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily chart with prev overlay */}
                {emp.count > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm">Динамика выручки</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={empDailySales} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id={`grad_${empIdx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(empDailySales.length / 7))} />
                        <YAxis tick={{ fontSize: 9 }} width={45} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                          formatter={(v, name) => [`${v.toLocaleString()} с.`, name === 'revenue' ? 'Выручка' : 'Пред. период']} />
                        <Area type="monotone" dataKey="revenue" stroke={color} fill={`url(#grad_${empIdx})`} strokeWidth={2} dot={false} />
                        {prev && <Line type="monotone" dataKey="prevRevenue" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
                      </AreaChart>
                    </ResponsiveContainer>
                    {prev && <p className="text-[10px] text-slate-400 text-center mt-1">Пунктир — предыдущий период</p>}
                  </div>
                )}

                {/* All-time stats */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> За всё время
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <MiniStat label="Всего продаж" value={emp.allTime.count} color="text-indigo-600" />
                    <MiniStat label="Всего выручки" value={fmt(emp.allTime.revenue)} color="text-emerald-600" />
                    <MiniStat label="Всего прибыли" value={fmt(emp.allTime.profit)} color="text-amber-600" />
                    <MiniStat label="Продаж в долг" value={emp.allTime.debtCount} color="text-red-500" />
                  </div>
                </div>

                {/* Consignment stats */}
                {emp.consignmentCount > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
                      <PackageOpen className="w-4 h-4 text-teal-500" /> Чужие товары (реализация)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <MiniStat label="Продаж чужих" value={emp.consignmentCount} color="text-teal-600" />
                      <MiniStat label="Коробок продано" value={emp.consignmentBoxes} color="text-indigo-600" />
                      <MiniStat label="Прибыль с реализации" value={fmt(emp.consignmentProfit)} color="text-emerald-600" />
                      <MiniStat label="Владельцам товаров" value={fmt(emp.consignmentOwnerAmount)} color="text-amber-600" />
                    </div>
                    <div className="mt-3 p-2 bg-teal-50 rounded-lg text-xs text-teal-700 text-center">
                      💡 Из общей прибыли сотрудника {fmt(emp.profit)}, прибыль с реализации чужих товаров составляет {fmt(emp.consignmentProfit)}. Сумма {fmt(emp.consignmentOwnerAmount)} должна быть выплачена владельцам.
                    </div>
                  </div>
                )}

                {/* Radar */}
                {emp.count > 0 && activeEmps.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm">Профиль эффективности</h3>
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

                {/* Sales list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    onClick={() => setShowSalesList(v => !v)}>
                    <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <List className="w-4 h-4 text-slate-400" /> Список продаж за период
                      <span className="text-xs text-slate-400">({empSalesList.length})</span>
                    </h3>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSalesList ? 'rotate-180' : ''}`} />
                  </button>
                  {showSalesList && (
                    <div className="border-t border-slate-100 max-h-80 overflow-y-auto">
                      {empSalesList.length === 0 ? (
                        <p className="text-center text-slate-400 py-6 text-sm">Нет продаж</p>
                      ) : empSalesList.map((s, i) => (
                        <div key={s.id || i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0">
                          <div>
                            <p className="text-xs font-medium text-slate-700">
                              {format(parseISO(s.sale_date || s.created_date), 'dd MMM, HH:mm', { locale: ru })}
                            </p>
                            <p className="text-[10px] text-slate-400">{s.boxes_sold} кор. · {s.is_debt ? '🔴 долг' : '🟢 наличные'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">{fmt(s.total_amount || 0)}</p>
                            <p className="text-[10px] text-slate-400">приб. {fmt(s.profit || 0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: COMPARE
      ══════════════════════════════════════════════ */}
      {tab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Сотрудник А', value: compareA, setter: setCompareA, color: '#6366f1' },
              { label: 'Сотрудник Б', value: compareB, setter: setCompareB, color: '#10b981' },
            ].map((side, si) => (
              <div key={si}>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: side.color }} />
                  {side.label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {employeeStats.map((emp, idx) => (
                    <button key={emp.email}
                      onClick={() => side.setter(emp.email === side.value ? null : emp.email)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                        side.value === emp.email ? 'text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                      style={side.value === emp.email ? { backgroundColor: side.color } : {}}>
                      <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-6 h-6 rounded-full text-[10px]" />
                      <span className="flex-1 truncate">{emp.name}</span>
                      {side.value === emp.email && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {(!compareA || !compareB) ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Выберите двух сотрудников для сравнения</p>
            </div>
          ) : (() => {
            const empA = employeeStats.find(e => e.email === compareA);
            const empB = employeeStats.find(e => e.email === compareB);
            if (!empA || !empB) return null;
            const prevA = prevStatsMap[compareA];
            const prevB = prevStatsMap[compareB];

            const metrics = [
              { label: 'Продажи',  a: empA.count,    b: empB.count,   fmt: v => v,                                          unit: 'прод.', isNum: true },
              { label: 'Выручка',  a: empA.revenue,  b: empB.revenue, fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Прибыль',  a: empA.profit,   b: empB.profit,  fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Коробок',  a: empA.boxes,    b: empB.boxes,   fmt: v => v,                                          unit: 'кор.', isNum: true },
              { label: 'Ср.чек',   a: empA.count ? empA.revenue/empA.count : 0, b: empB.count ? empB.revenue/empB.count : 0, fmt: v => hideAmounts ? '•••' : `${Math.round(v).toLocaleString()}`, unit: 'с.' },
              { label: 'Маржа',    a: empA.revenue > 0 ? empA.profit/empA.revenue*100 : 0, b: empB.revenue > 0 ? empB.profit/empB.revenue*100 : 0, fmt: v => `${Math.round(v)}`, unit: '%' },
              { label: 'В долг',   a: empA.debtCount, b: empB.debtCount, fmt: v => v, unit: 'прод.', isNum: true, lowerIsBetter: true },
            ];

            const radarCompare = getRadarData(compareA).map((r, i) => ({
              metric: r.metric,
              [empA.name.split(' ')[0]]: r.value,
              [empB.name.split(' ')[0]]: getRadarData(compareB)[i].value,
            }));

            // Combined daily timeline for both
            const combinedTimeline = eachDayOfInterval({ start: from, end: to }).map(date => {
              const getDay = (email) => periodSales.filter(s => {
                if (s.created_by !== email) return false;
                try { return isWithinInterval(parseISO(s.sale_date || s.created_date), { start: startOfDay(date), end: endOfDay(date) }); }
                catch { return false; }
              }).reduce((s, x) => s + (x.total_amount || 0), 0);
              return {
                date: format(date, 'dd.MM', { locale: ru }),
                [empA.name.split(' ')[0]]: getDay(compareA),
                [empB.name.split(' ')[0]]: getDay(compareB),
              };
            });

            return (
              <div className="space-y-4">
                {/* VS Header */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <div className="mx-auto mb-2">
                      <EmployeeAvatar avatarUrl={empA.avatar_url} name={empA.name} isAdmin={empA.is_admin} sizeClass="w-14 h-14 rounded-2xl text-xl" />
                    </div>
                    <p className="font-bold text-slate-900">{empA.name}</p>
                    {prevA && <GrowthBadge current={empA.revenue} previous={prevA.revenue} />}
                  </div>
                  <div className="text-2xl font-black text-slate-200">VS</div>
                  <div className="flex-1 text-center">
                    <div className="mx-auto mb-2">
                      <EmployeeAvatar avatarUrl={empB.avatar_url} name={empB.name} isAdmin={empB.is_admin} sizeClass="w-14 h-14 rounded-2xl text-xl" />
                    </div>
                    <p className="font-bold text-slate-900">{empB.name}</p>
                    {prevB && <GrowthBadge current={empB.revenue} previous={prevB.revenue} />}
                  </div>
                </div>

                {/* Metrics */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 font-semibold text-slate-900 text-sm">Сравнение показателей</div>
                  <div className="divide-y divide-slate-50">
                    {metrics.map((m, i) => {
                      const total = m.a + m.b;
                      const pctA = total > 0 ? m.a / total * 100 : 50;
                      const winA = m.lowerIsBetter ? m.a < m.b : m.a > m.b;
                      const winB = m.lowerIsBetter ? m.b < m.a : m.b > m.a;
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-bold ${winA ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {winA && '✓ '}{m.fmt(m.a)} {m.unit}
                            </span>
                            <span className="text-xs text-slate-400 font-medium px-2">{m.label}</span>
                            <span className={`text-sm font-bold ${winB ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {m.fmt(m.b)} {m.unit}{winB && ' ✓'}
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

                {/* Radar */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">Паук-диаграмма</h3>
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

                {/* Combined timeline */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">Динамика выручки</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={combinedTimeline} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(combinedTimeline.length / 6))} />
                      <YAxis tick={{ fontSize: 9 }} width={45} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                        formatter={(v) => [`${v.toLocaleString()} с.`]} />
                      <Legend />
                      <Line type="monotone" dataKey={empA.name.split(' ')[0]} stroke="#6366f1" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey={empB.name.split(' ')[0]} stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: TIMELINE
      ══════════════════════════════════════════════ */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[{ key: 'revenue', label: 'Выручка' }, { key: 'count', label: 'Кол-во' }].map(m => (
              <button key={m.key} onClick={() => setChartMetric(m.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  chartMetric === m.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {activeEmps.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="font-semibold text-slate-900 mb-4 text-sm">Динамика всех сотрудников</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(timelineData.length / 6))} />
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

          {/* Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeEmps.map((emp, idx) => {
              const color = COLORS[idx % COLORS.length];
              const empData = timelineData.map(d => ({ date: d.date, value: d[emp.name.split(' ')[0]] || 0 }));
              const peak = Math.max(...empData.map(d => d.value), 1);
              const total = empData.reduce((s, d) => s + d.value, 0);
              const activeDays = empData.filter(d => d.value > 0).length;
              const prev = prevStatsMap[emp.email];
              return (
                <div key={emp.email}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedEmp(emp.email); setTab('details'); }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar avatarUrl={emp.avatar_url} name={emp.name} isAdmin={emp.is_admin} sizeClass="w-8 h-8 rounded-xl text-sm" />
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{activeDays} дн. активности</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color }}>{chartMetric === 'revenue' ? fmt(total) : `${total} прод.`}</p>
                      <p className="text-[10px] text-slate-400">пик: {chartMetric === 'revenue' ? fmt(peak) : peak}</p>
                      {prev && <GrowthBadge current={chartMetric === 'revenue' ? emp.revenue : emp.count} previous={chartMetric === 'revenue' ? prev.revenue : prev.count} />}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={empData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`sg_${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={color} fill={`url(#sg_${idx})`} strokeWidth={1.5} dot={false} />
                    </AreaChart>
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