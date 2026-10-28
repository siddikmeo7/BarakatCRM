import React, { useMemo, useState } from 'react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, isWithinInterval, format,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Wallet, Box, Users, Calendar, Info, History } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import { getSalaryMethod, computeSalary } from '@/lib/salary';
import { formatPaidAt, formatPayDay } from '@/lib/salaryPeriod';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ru-RU');

const inRange = (iso, range) => {
  if (!range?.from) return true;
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to || range.from) });
  } catch { return false; }
};

// Личный кабинет зарплаты: сотрудник с разрешением view_salary видит только свои данные —
// заработок за выбранный период, свой способ расчёта и всю историю своих выплат.
export default function MySalaryView({ employee, sales = [], payments = [], schedule, business }) {
  const [range, setRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

  const method = getSalaryMethod(employee?.salary_method || 'per_box');
  const rate = method.key === 'per_box' ? (employee?.salary_per_box || 0) : (employee?.salary_rate || 0);

  const mySales = useMemo(
    () => sales.filter(s => !s.is_cancelled && s.seller_email === employee?.user_email),
    [sales, employee?.user_email]
  );

  const stats = useMemo(() => {
    const rows = mySales.filter(s => inRange(s.sale_date || s.created_date, range));
    return {
      rows,
      salesCount: rows.length,
      boxes: rows.reduce((a, s) => a + (s.boxes_sold || 0), 0),
      pairs: rows.reduce((a, s) => a + (s.pairs_sold || (s.boxes_sold || 0) * 6), 0),
      revenue: rows.reduce((a, s) => a + (s.total_amount || 0), 0),
    };
  }, [mySales, range]);

  const earned = computeSalary(stats, employee);

  const history = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paid_at || b.created_date) - new Date(a.paid_at || a.created_date)),
    [payments]
  );

  const receivedInRange = history
    .filter(p => inRange(p.paid_at || p.created_date, range))
    .reduce((a, p) => a + (p.amount || 0), 0);
  const receivedAll = history.reduce((a, p) => a + (p.amount || 0), 0);
  const lastPayment = history[0] || null;

  const quickPeriods = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'all', label: 'Всё время' },
  ];
  const setQuickPeriod = (key) => {
    const now = new Date();
    if (key === 'today') setRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (key === 'week') setRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else if (key === 'month') setRange({ from: startOfMonth(now), to: endOfMonth(now) });
    else setRange({ from: null, to: null });
  };

  const formula = (() => {
    if (method.key === 'per_pair') return `${fmtMoney(stats.pairs)} пар × ${fmtMoney(rate)} с.`;
    if (method.key === 'percent_revenue') return `${fmtMoney(stats.revenue)} с. × ${fmtMoney(rate)}%`;
    if (method.key === 'fixed_monthly') return `Оклад ${fmtMoney(rate)} с. за месяц`;
    return `${fmtMoney(stats.boxes)} коробок × ${fmtMoney(rate)} с.`;
  })();

  const periodLabel = range?.from
    ? (range.to && range.to.getTime() !== range.from.getTime()
        ? `${format(range.from, 'dd MMM', { locale: ru })} — ${format(range.to, 'dd MMM yyyy', { locale: ru })}`
        : format(range.from, 'dd MMM yyyy', { locale: ru }))
    : 'Всё время';

  return (
    <div className="space-y-5">
      <BackButton className="mb-2" />
      <PageHeader title="Моя зарплата" subtitle={`${employee?.name || ''} · ${business?.name || ''}`} />

      {/* Фильтры периода */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {quickPeriods.map(p => (
            <button
              key={p.key}
              onClick={() => setQuickPeriod(p.key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all"
            >
              {p.label}
            </button>
          ))}
          <DateFilter dateRange={range} onDateRangeChange={setRange} />
          <span className="ml-auto text-xs text-slate-400">{periodLabel}</span>
        </div>
      </div>

      {/* Итоги за период */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-500 truncate">Заработано за период</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmtMoney(earned)} с.</p>
          <p className="text-[11px] text-slate-400 mt-1">{formula}</p>
        </div>
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-500 truncate">Получено за период</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{fmtMoney(receivedInRange)} с.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lastPayment ? `Последняя выплата: ${formatPaidAt(lastPayment.paid_at || lastPayment.created_date)}` : 'Выплат ещё не было'}
          </p>
        </div>
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-1.5">
            <Box className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-500 truncate">Продано за период</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{fmtMoney(stats.boxes)} кор.</p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.salesCount} продаж · {fmtMoney(stats.pairs)} пар</p>
        </div>
      </div>

      {/* Способ расчёта и порядок выплаты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Ваш способ расчёта</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">
            {method.icon} {method.label}
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2">
            {fmtMoney(rate)}{method.key === 'percent_revenue' ? '%' : ' с.'}
            <span className="text-xs font-normal text-slate-400 ml-1">
              {method.key === 'percent_revenue' ? 'от выручки' : method.key === 'fixed_monthly' ? 'в месяц' : method.key === 'per_pair' ? 'за пару' : 'за коробку'}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{method.description}</p>
          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">Расчёт за период</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{formula} = {fmtMoney(earned)} с.</p>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Как вы получаете зарплату</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200">{formatPayDay(schedule)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {schedule?.description || 'Зарплату выплачивает владелец бизнеса. Сумма рассчитывается по вашему способу расчёта за период, все выплаты сохраняются в истории ниже.'}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">Получено всего</span>
            <span className="text-xl font-bold text-emerald-600">{fmtMoney(receivedAll)} с.</span>
          </div>
        </div>
      </div>

      {/* История всех выплат */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            История выплат
          </h3>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> {history.length} выплат · {fmtMoney(receivedAll)} с.
          </span>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Выплат пока не было</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((p, i) => {
              const m = getSalaryMethod(p.method || employee?.salary_method || 'per_box');
              return (
                <div key={p.id || i} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center flex-shrink-0 text-base">
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.period_label || p.period_key || 'Выплата'}
                      {i === 0 && <span className="ml-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">последняя</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatPaidAt(p.paid_at || p.created_date)} · {m.label}
                      {p.paid_by_name ? ` · выплатил ${p.paid_by_name}` : ''}
                    </p>
                    {p.note && <p className="text-xs text-slate-400 mt-0.5">{p.note}</p>}
                  </div>
                  <span className="text-base font-bold text-emerald-600 whitespace-nowrap">+{fmtMoney(p.amount)} с.</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}