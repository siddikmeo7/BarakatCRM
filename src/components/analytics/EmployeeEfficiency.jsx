import React, { useState, useMemo } from 'react';
import {
  startOfDay, endOfDay, isWithinInterval, parseISO, format, subDays,
  isSameDay
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Users, TrendingUp, ShoppingCart, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/formatCompact';

/**
 * Employee efficiency section with quick day filters (today / yesterday / day before / custom).
 * Shows revenue and profit per employee for the selected period.
 *
 * Props:
 *  - sales: array of Sale records (already filtered by business; must NOT be pre-filtered by date)
 *  - canViewProfit: boolean
 *  - hideData: boolean
 *  - lang: string
 */
export default function EmployeeEfficiency({ sales, canViewProfit = true, hideData = false, lang = 'ru' }) {
  // period: { from: Date, to: Date } | null  (null = all)
  const [period, setPeriod] = useState({ from: new Date(), to: new Date() });
  const [mode, setMode] = useState('today'); // today | yesterday | dayBefore | custom

  const masked = '•••••';

  const setQuick = (key) => {
    const today = new Date();
    if (key === 'today') {
      setPeriod({ from: today, to: today });
      setMode('today');
    } else if (key === 'yesterday') {
      const d = subDays(today, 1);
      setPeriod({ from: d, to: d });
      setMode('yesterday');
    } else if (key === 'dayBefore') {
      const d = subDays(today, 2);
      setPeriod({ from: d, to: d });
      setMode('dayBefore');
    }
  };

  const onCustomFrom = (e) => {
    const val = e.target.value;
    if (!val) return;
    const from = startOfDay(new Date(val));
    setPeriod(prev => ({
      from,
      to: prev?.to && prev.to >= from ? prev.to : from
    }));
    setMode('custom');
  };

  const onCustomTo = (e) => {
    const val = e.target.value;
    if (!val) return;
    const to = endOfDay(new Date(val));
    setPeriod(prev => ({
      from: prev?.from || startOfDay(new Date(val)),
      to
    }));
    setMode('custom');
  };

  // Filter sales by selected period (exclude cancelled)
  const periodSales = useMemo(() => {
    if (!period?.from) return sales.filter(s => !s.is_cancelled);
    try {
      const start = startOfDay(period.from);
      const end = endOfDay(period.to || period.from);
      return sales.filter(s => {
        if (s.is_cancelled) return false;
        const d = parseISO(s.sale_date || s.created_date);
        return isWithinInterval(d, { start, end });
      });
    } catch {
      return [];
    }
  }, [sales, period]);

  // Aggregate per employee
  const employeeStats = useMemo(() => {
    const map = {};
    periodSales.forEach(s => {
      const key = s.seller_email || s.seller_name || 'Неизвестно';
      if (!map[key]) {
        map[key] = {
          name: s.seller_name || s.seller_email || 'Неизвестно',
          email: s.seller_email || '',
          revenue: 0,
          profit: 0,
          boxes: 0,
          count: 0,
        };
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

  const fmt = (v) => hideData ? masked : `${formatCompact(v, lang)} с.`;

  // date input values
  const fromStr = period?.from ? format(period.from, 'yyyy-MM-dd') : '';
  const toStr = period?.to ? format(period.to, 'yyyy-MM-dd') : '';

  const periodLabel = period?.from
    ? isSameDay(period.from, period.to)
      ? format(period.from, 'dd MMM yyyy', { locale: ru })
      : `${format(period.from, 'dd MMM', { locale: ru })} — ${format(period.to, 'dd MMM yyyy', { locale: ru })}`
    : 'Всё время';

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-slate-900 text-sm md:text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" />
          Эффективность сотрудников
        </h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {periodLabel} · {periodSales.length} продаж
        </span>
      </div>

      {/* Quick day filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          size="sm"
          variant={mode === 'today' ? 'default' : 'outline'}
          onClick={() => setQuick('today')}
          className={cn(mode === 'today' && 'bg-rose-500 hover:bg-rose-600 text-white')}
        >
          Сегодня
        </Button>
        <Button
          size="sm"
          variant={mode === 'yesterday' ? 'default' : 'outline'}
          onClick={() => setQuick('yesterday')}
          className={cn(mode === 'yesterday' && 'bg-rose-500 hover:bg-rose-600 text-white')}
        >
          Вчера
        </Button>
        <Button
          size="sm"
          variant={mode === 'dayBefore' ? 'default' : 'outline'}
          onClick={() => setQuick('dayBefore')}
          className={cn(mode === 'dayBefore' && 'bg-rose-500 hover:bg-rose-600 text-white')}
        >
          Позавчера
        </Button>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-xs text-slate-400">от</span>
          <input
            type="date"
            value={fromStr}
            onChange={onCustomFrom}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          />
          <span className="text-xs text-slate-400">до</span>
          <input
            type="date"
            value={toStr}
            onChange={onCustomTo}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Выручка за период</p>
            <p className="text-lg font-bold text-blue-600">{fmt(totalRevenue)}</p>
          </div>
        </div>
        {canViewProfit && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Прибыль за период</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalProfit)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Employee list */}
      {employeeStats.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет продаж за выбранный период</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {employeeStats.map((emp, i) => {
            const share = totalRevenue ? ((emp.revenue / totalRevenue) * 100).toFixed(1) : 0;
            return (
              <div key={emp.email || emp.name + i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-rose-50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0",
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{emp.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                    <span>📦 {emp.boxes} кор.</span>
                    <span>🛒 {emp.count} продаж</span>
                    <span className="text-slate-400">{share}% от выручки</span>
                  </div>
                  {/* revenue bar */}
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