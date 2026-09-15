import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  startOfDay, endOfDay, isWithinInterval, parseISO, format, subDays,
  isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subWeeks, subMonths
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Users, TrendingUp, ShoppingCart, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/formatCompact';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

const PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'dayBefore', label: 'Позавчера' },
  { key: 'week', label: 'Неделя' },
  { key: '2weeks', label: '2 недели' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё время' },
];

function getPeriodDates(key) {
  const today = new Date();
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const d = subDays(today, 1); return { from: d, to: d }; }
    case 'dayBefore': { const d = subDays(today, 2); return { from: d, to: d }; }
    case 'week': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    case '2weeks': return { from: subWeeks(today, 2), to: today };
    case 'month': return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'year': return { from: startOfYear(today), to: endOfYear(today) };
    case 'all': return null;
    default: return { from: today, to: today };
  }
}

export default function EmployeeEfficiency({ sales, canViewProfit = true, hideData = false, lang = 'ru' }) {
  const [periodKey, setPeriodKey] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const biz = window.__barakatBusiness;
    if (!biz) return;
    base44.entities.Employee.filter({ business_id: biz.id })
      .then(setEmployees)
      .catch(() => {});
  }, []);

  const getEmpByEmail = (email) => employees.find(e => e.user_email === email) || null;

  const masked = '•••••';

  const period = useCustom && customFrom
    ? { from: new Date(customFrom), to: new Date(customTo || customFrom) }
    : getPeriodDates(periodKey);

  const periodSales = useMemo(() => {
    const base = sales.filter(s => !s.is_cancelled);
    if (!period) return base;
    try {
      const start = startOfDay(period.from);
      const end = endOfDay(period.to || period.from);
      return base.filter(s => {
        const d = parseISO(s.sale_date || s.created_date);
        return isWithinInterval(d, { start, end });
      });
    } catch {
      return [];
    }
  }, [sales, period]);

  const employeeStats = useMemo(() => {
    const map = {};
    periodSales.forEach(s => {
      const key = s.seller_email || s.seller_name || 'Неизвестно';
      if (!map[key]) {
        map[key] = { name: s.seller_name || s.seller_email || 'Неизвестно', email: s.seller_email || '', revenue: 0, profit: 0, boxes: 0, count: 0 };
      }
      map[key].revenue += s.total_amount || 0;
      map[key].profit += s.profit || 0;
      map[key].boxes += s.boxes_sold || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [periodSales]);

  const totalRevenue = employeeStats.reduce((s, e) => s + e.revenue, 0);
  const totalProfit = employeeStats.reduce((s, e) => s + e.profit, 0);
  const totalBoxes = employeeStats.reduce((s, e) => s + e.boxes, 0);

  const fmt = (v) => hideData ? masked : `${formatCompact(v, lang)} с.`;

  const periodLabel = !period
    ? 'Всё время'
    : isSameDay(period.from, period.to)
      ? format(period.from, 'dd MMM yyyy', { locale: ru })
      : `${format(period.from, 'dd MMM', { locale: ru })} — ${format(period.to, 'dd MMM yyyy', { locale: ru })}`;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-slate-900 text-sm md:text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" />
          Эффективность сотрудников
        </h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {periodLabel} · {periodSales.length} продаж · {totalBoxes} кор.
        </span>
      </div>

      {/* Quick period filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => { setPeriodKey(p.key); setUseCustom(false); }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
              !useCustom && periodKey === p.key
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-xs text-slate-400">Кастомный период:</span>
        <input
          type="date"
          value={customFrom}
          onChange={e => { setCustomFrom(e.target.value); setUseCustom(true); }}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">—</span>
        <input
          type="date"
          value={customTo}
          onChange={e => { setCustomTo(e.target.value); setUseCustom(true); }}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        />
        {useCustom && (
          <button onClick={() => setUseCustom(false)} className="text-xs text-slate-400 hover:text-slate-600 underline">сбросить</button>
        )}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Выручка</p>
            <p className="text-sm md:text-lg font-bold text-blue-600 truncate">{fmt(totalRevenue)}</p>
          </div>
        </div>
        {canViewProfit && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-medium leading-tight">Прибыль</p>
              <p className="text-sm md:text-lg font-bold text-emerald-600 truncate">{fmt(totalProfit)}</p>
            </div>
          </div>
        )}
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 font-medium leading-tight">Коробок</p>
            <p className="text-sm md:text-lg font-bold text-amber-600 truncate">{totalBoxes}</p>
          </div>
        </div>
      </div>

      {/* Employee list */}
      {employeeStats.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет продаж за выбранный период</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {employeeStats.map((emp, i) => {
            const share = totalRevenue ? ((emp.revenue / totalRevenue) * 100).toFixed(1) : 0;
            return (
              <div key={emp.email || emp.name + i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-rose-50 transition-colors">
                <div className="relative flex-shrink-0">
                  <EmployeeAvatar employee={getEmpByEmail(emp.email)} name={emp.name} sizeClass="w-9 h-9 rounded-2xl text-sm" />
                  <span className={cn(
                    "absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold",
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-500" : i === 2 ? "bg-orange-500" : "bg-slate-400"
                  )}>{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{emp.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                    <span>📦 {emp.boxes} кор.</span>
                    <span>🛒 {emp.count} продаж</span>
                    <span className="text-slate-400">{share}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-sm">{fmt(emp.revenue)}</p>
                  {canViewProfit && (
                    <p className={cn("text-xs font-medium", emp.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {hideData ? masked : `${emp.profit >= 0 ? '+' : ''}${formatCompact(emp.profit, lang)} с.`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}