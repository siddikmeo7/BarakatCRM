import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, TrendingUp, ShoppingCart, DollarSign, Award, Calendar,
  ArrowUpRight, ArrowDownRight, Package, ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

const PERIODS = [
  { key: 'today',   label: 'Сегодня' },
  { key: 'week',    label: 'Эта неделя' },
  { key: 'month',   label: 'Этот месяц' },
  { key: '7d',      label: '7 дней' },
  { key: '30d',     label: '30 дней' },
  { key: '90d',     label: '90 дней' },
];

function getPeriodRange(period) {
  const now = new Date();
  switch (period) {
    case 'today':  return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':   return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':  return { from: startOfMonth(now), to: endOfMonth(now) };
    case '7d':     return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30d':    return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '90d':    return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    default:       return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

function StatCard({ icon: Icon, label, value, sub, color, rank }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
      {rank && (
        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
          {rank}
        </div>
      )}
      <div className={`p-2 rounded-xl flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function EmployeeAnalytics() {
  const { isOwner, isReady, business } = useEmployeeAccess();
  const [loading, setLoading]         = useState(true);
  const [employees, setEmployees]     = useState([]);
  const [sales, setSales]             = useState([]);
  const [period, setPeriod]           = useState('30d');
  const [hideAmounts, setHideAmounts] = useState(false);
  const [sortBy, setSortBy]           = useState('revenue'); // revenue | count | avg
  const [lang, setLang]               = useState('ru');

  useEffect(() => {
    if (!isReady) return;
    if (!isOwner) return; // только для владельца
    loadData();
  }, [isReady]);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) return;
      setLang(biz.language || 'ru');

      const [emps, salesData] = await Promise.all([
        base44.entities.Employee.filter({ business_id: biz.id }),
        base44.entities.Sale.filter({ business_id: biz.id, is_cancelled: false }),
      ]);

      setEmployees(emps);
      setSales(salesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  // Продажи за период
  const periodSales = useMemo(() => sales.filter(s => {
    try {
      const d = parseISO(s.sale_date || s.created_date);
      return isWithinInterval(d, { start: from, end: to });
    } catch { return false; }
  }), [sales, from, to]);

  // Статистика по сотруднику (created_by = email)
  const employeeStats = useMemo(() => {
    const map = {};

    // Инициализируем для всех сотрудников
    employees.forEach(emp => {
      map[emp.user_email] = {
        id: emp.id,
        name: emp.name || emp.user_email,
        email: emp.user_email,
        count: 0,
        revenue: 0,
        profit: 0,
        debtCount: 0,
        cancelCount: 0,
      };
    });

    // Заполняем данные из продаж
    periodSales.forEach(sale => {
      const email = sale.created_by;
      if (!email) return;
      if (!map[email]) {
        map[email] = {
          id: null,
          name: email.split('@')[0],
          email,
          count: 0,
          revenue: 0,
          profit: 0,
          debtCount: 0,
          cancelCount: 0,
        };
      }
      map[email].count += 1;
      map[email].revenue += sale.total_amount || 0;
      map[email].profit += sale.profit || 0;
      if (sale.is_debt) map[email].debtCount += 1;
    });

    // Все отменённые продажи за период тоже считаем
    const cancelledInPeriod = sales.filter(s => {
      if (!s.is_cancelled) return false;
      try {
        const d = parseISO(s.cancelled_at || s.created_date);
        return isWithinInterval(d, { start: from, end: to });
      } catch { return false; }
    });
    cancelledInPeriod.forEach(sale => {
      const email = sale.created_by;
      if (email && map[email]) map[email].cancelCount += 1;
    });

    return Object.values(map)
      .filter(e => e.count > 0 || employees.some(emp => emp.user_email === e.email))
      .sort((a, b) => {
        if (sortBy === 'count')   return b.count - a.count;
        if (sortBy === 'avg')     return (b.count ? b.revenue / b.count : 0) - (a.count ? a.revenue / a.count : 0);
        return b.revenue - a.revenue;
      });
  }, [periodSales, employees, sales, from, to, sortBy]);

  // Суммарные показатели
  const totals = useMemo(() => ({
    count:   periodSales.length,
    revenue: periodSales.reduce((s, x) => s + (x.total_amount || 0), 0),
    profit:  periodSales.reduce((s, x) => s + (x.profit || 0), 0),
    avgCheck: periodSales.length ? periodSales.reduce((s, x) => s + (x.total_amount || 0), 0) / periodSales.length : 0,
  }), [periodSales]);

  // Топ и аутсайдер
  const leader = employeeStats.find(e => e.count > 0);

  // Chart data
  const chartData = employeeStats
    .filter(e => e.count > 0)
    .map(e => ({
      name: e.name.split(' ')[0], // Только имя для краткости
      revenue: Math.round(e.revenue),
      count: e.count,
      avg: e.count ? Math.round(e.revenue / e.count) : 0,
    }));

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

  const fmt = (n) => hideAmounts ? '•••••' : `${Math.round(n).toLocaleString()} с.`;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Эффективность сотрудников</h1>
          <p className="text-sm text-slate-500 mt-0.5">Аналитика продаж по каждому сотруднику</p>
        </div>
        <button
          onClick={() => setHideAmounts(h => !h)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
        >
          {hideAmounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {hideAmounts ? 'Показать суммы' : 'Скрыть суммы'}
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              period === p.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>
            {p.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 self-center ml-1">
          {format(from, 'd MMM', { locale: ru })} — {format(to, 'd MMM yyyy', { locale: ru })}
        </span>
      </div>

      {/* Total KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white">
          <p className="text-indigo-200 text-xs">Всего продаж</p>
          <p className="text-3xl font-bold mt-1">{totals.count}</p>
          <p className="text-indigo-200 text-xs mt-1">{employeeStats.filter(e => e.count > 0).length} сотрудн.</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white">
          <p className="text-emerald-200 text-xs">Выручка</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.revenue)}</p>
          <p className="text-emerald-200 text-xs mt-1">за период</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <p className="text-amber-200 text-xs">Прибыль</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.profit)}</p>
          <p className="text-amber-200 text-xs mt-1">
            {totals.revenue > 0 ? `${Math.round(totals.profit / totals.revenue * 100)}% маржа` : '—'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-4 text-white">
          <p className="text-purple-200 text-xs">Средний чек</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.avgCheck)}</p>
          <p className="text-purple-200 text-xs mt-1">на продажу</p>
        </div>
      </div>

      {/* Chart + Sort */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-slate-900 text-sm">График по сотрудникам</h2>
            <div className="flex gap-1.5">
              {[
                { key: 'revenue', label: 'Выручка' },
                { key: 'count',   label: 'Продажи' },
                { key: 'avg',     label: 'Средний чек' },
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} width={50}
                tickFormatter={v => sortBy === 'count' ? v : `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [
                  sortBy === 'count' ? `${value} продаж` : `${value.toLocaleString()} с.`,
                  sortBy === 'count' ? 'Продажи' : sortBy === 'avg' ? 'Средний чек' : 'Выручка'
                ]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey={sortBy} radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Детальная статистика</h2>
          <span className="text-xs text-slate-400">{employeeStats.length} сотрудников</span>
        </div>

        {employeeStats.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет данных за выбранный период</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {employeeStats.map((emp, idx) => {
              const avg = emp.count > 0 ? emp.revenue / emp.count : 0;
              const isLeader = idx === 0 && emp.count > 0;
              const noSales = emp.count === 0;
              const shareOfTotal = totals.revenue > 0 ? (emp.revenue / totals.revenue) * 100 : 0;

              return (
                <div key={emp.email}
                  className={`p-4 transition-colors ${isLeader ? 'bg-amber-50/60' : noSales ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    {/* Rank / Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isLeader ? 'bg-amber-400 text-white' :
                      noSales  ? 'bg-slate-200 text-slate-400' :
                      'text-white'
                    }`}
                      style={!isLeader && !noSales ? { backgroundColor: COLORS[idx % COLORS.length] } : {}}>
                      {isLeader ? '🥇' : noSales ? '—' : idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${noSales ? 'text-slate-400' : 'text-slate-900'}`}>
                          {emp.name}
                        </p>
                        {isLeader && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Лидер продаж
                          </span>
                        )}
                        {noSales && (
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                            Нет продаж
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{emp.email}</p>

                      {/* Progress bar */}
                      {!noSales && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>Доля выручки</span>
                            <span>{Math.round(shareOfTotal)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${shareOfTotal}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stats grid */}
                    {!noSales && (
                      <div className="grid grid-cols-3 gap-2 flex-shrink-0 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400">Продаж</p>
                          <p className="text-base font-bold text-indigo-600">{emp.count}</p>
                          {emp.debtCount > 0 && (
                            <p className="text-[9px] text-red-400">{emp.debtCount} в долг</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Выручка</p>
                          <p className="text-sm font-bold text-emerald-600">{fmt(emp.revenue)}</p>
                          <p className="text-[9px] text-slate-400">{fmt(emp.profit)} приб.</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Ср. чек</p>
                          <p className="text-sm font-bold text-purple-600">{fmt(avg)}</p>
                          {emp.cancelCount > 0 && (
                            <p className="text-[9px] text-red-400">{emp.cancelCount} отм.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leaderboard badges */}
      {employeeStats.filter(e => e.count > 0).length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: '🥇 Лидер по выручке', emp: [...employeeStats].sort((a,b) => b.revenue - a.revenue)[0], metric: e => fmt(e.revenue), sub: 'выручка' },
            { label: '🎯 Больше всего продаж', emp: [...employeeStats].sort((a,b) => b.count - a.count)[0], metric: e => `${e.count} прод.`, sub: 'количество' },
            { label: '💎 Лучший средний чек', emp: [...employeeStats].filter(e => e.count > 0).sort((a,b) => (b.revenue/b.count||0) - (a.revenue/a.count||0))[0], metric: e => fmt(e.count ? e.revenue/e.count : 0), sub: 'средний чек' },
          ].filter(item => item.emp && item.emp.count > 0).map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className="text-2xl">{item.label.split(' ')[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">{item.label.split(' ').slice(1).join(' ')}</p>
                <p className="font-bold text-slate-900 truncate">{item.emp.name}</p>
                <p className="text-xs text-indigo-600 font-semibold">{item.metric(item.emp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}