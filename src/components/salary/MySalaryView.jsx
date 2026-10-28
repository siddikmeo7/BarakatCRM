import React, { useMemo, useState } from 'react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, isWithinInterval, format, differenceInCalendarDays,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Wallet, Box, Calendar, Info, History, Receipt, CalendarClock } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import PaymentReceiptDialog from '@/components/salary/PaymentReceiptDialog';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { getSalaryMethod, computeSalary } from '@/lib/salary';
import { formatPaidAt, formatPayDay, formatDueMoment, getUpcomingMoment } from '@/lib/salaryPeriod';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800';

const fmtMoney = (n) => (Number(n) || 0).toLocaleString('ru-RU');

const inRange = (iso, range) => {
  if (!range?.from) return true;
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to || range.from) });
  } catch { return false; }
};

const sumBy = (rows) => ({
  rows,
  salesCount: rows.length,
  boxes: rows.reduce((a, s) => a + (s.boxes_sold || 0), 0),
  pairs: rows.reduce((a, s) => a + (s.pairs_sold || (s.boxes_sold || 0) * 6), 0),
  revenue: rows.reduce((a, s) => a + (s.total_amount || 0), 0),
});

// Личный кабинет зарплаты: сотрудник с разрешением view_salary видит только свои данные —
// когда владелец собирается выплатить зарплату, сколько он получил и чек по каждой выплате.
export default function MySalaryView({ employee, sales = [], payments = [], schedule, business }) {
  const [range, setRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [receipt, setReceipt] = useState(null);

  const method = getSalaryMethod(employee?.salary_method || 'per_box');
  const rate = method.key === 'per_box' ? (employee?.salary_per_box || 0) : (employee?.salary_rate || 0);

  const mySales = useMemo(
    () => sales.filter(s => !s.is_cancelled && s.seller_email === employee?.user_email),
    [sales, employee?.user_email]
  );

  const stats = useMemo(
    () => sumBy(mySales.filter(s => inRange(s.sale_date || s.created_date, range))),
    [mySales, range]
  );

  const monthStats = useMemo(
    () => sumBy(mySales.filter(s => inRange(s.sale_date || s.created_date, { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }))),
    [mySales]
  );

  const earned = computeSalary(stats, employee);
  const expected = computeSalary(monthStats, employee);

  const history = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paid_at || b.created_date) - new Date(a.paid_at || a.created_date)),
    [payments]
  );

  const receivedInRange = history
    .filter(p => inRange(p.paid_at || p.created_date, range))
    .reduce((a, p) => a + (p.amount || 0), 0);
  const receivedAll = history.reduce((a, p) => a + (p.amount || 0), 0);

  const now = new Date();
  const currentPeriodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisPeriod = history.find(p => p.period_key === currentPeriodKey) || null;

  const nextPay = useMemo(() => getUpcomingMoment(schedule), [schedule]);
  const daysToNext = nextPay ? differenceInCalendarDays(nextPay, new Date()) : null;
  const nextPayNote = (() => {
    if (!nextPay) return 'Владелец бизнеса пока не назначил дату выплаты.';
    if (daysToNext === 0) return 'Выплата сегодня';
    if (daysToNext === 1) return 'Выплата завтра';
    if (daysToNext > 1) return `Через ${daysToNext} дн.`;
    return `Срок выплаты прошёл ${Math.abs(daysToNext)} дн. назад`;
  })();

  const quickPeriods = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'all', label: 'Всё время' },
  ];
  const setQuickPeriod = (key) => {
    const n = new Date();
    if (key === 'today') setRange({ from: startOfDay(n), to: endOfDay(n) });
    else if (key === 'week') setRange({ from: startOfWeek(n, { weekStartsOn: 1 }), to: endOfWeek(n, { weekStartsOn: 1 }) });
    else if (key === 'month') setRange({ from: startOfMonth(n), to: endOfMonth(n) });
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

      {/* Профиль сотрудника */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <EmployeeAvatar employee={employee} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-400">Мой профиль</p>
          <p className="font-bold text-slate-900 dark:text-white truncate">{employee?.name || 'Сотрудник'}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {business?.name ? `${business.name} · ` : ''}сотрудник
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">Ставка</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(rate)}{method.key === 'percent_revenue' ? '%' : ' с.'}</p>
          <p className="text-[10px] text-slate-400">{method.icon} {method.label}</p>
        </div>
      </div>

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
            {history[0] ? `Последняя выплата: ${formatPaidAt(history[0].paid_at || history[0].created_date)}` : 'Выплат ещё не было'}
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

      {/* Когда придёт зарплата + способ расчёта */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Когда придёт зарплата</h3>
          </div>

          {nextPay ? (
            <>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{formatDueMoment(nextPay)}</p>
              <p className="text-xs font-semibold text-emerald-600 mt-1">{nextPayNote}</p>
              <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">Ожидаемая сумма</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {fmtMoney(expected)} с.
                  <span className="text-[11px] font-normal text-slate-400 ml-1">
                    {method.key === 'fixed_monthly' ? 'оклад за месяц' : 'по вашим продажам за этот месяц'}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{nextPayNote}</p>
          )}

          {paidThisPeriod && (
            <button
              onClick={() => setReceipt(paidThisPeriod)}
              className="mt-3 w-full flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-left hover:border-emerald-400 transition-colors"
            >
              <Receipt className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Зарплата за {paidThisPeriod.period_label || paidThisPeriod.period_key} выплачена
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                  {fmtMoney(paidThisPeriod.amount)} с. · {formatPaidAt(paidThisPeriod.paid_at || paidThisPeriod.created_date)} · открыть чек
                </p>
              </div>
            </button>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">{formatPayDay(schedule)}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[.12em] font-bold text-slate-400">Получено всего</span>
            <span className="text-xl font-bold text-emerald-600">{fmtMoney(receivedAll)} с.</span>
          </div>
        </div>

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
      </div>

      {/* История всех выплат с чеками */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            История выплат
          </h3>
          <span className="text-xs text-slate-400">{history.length} выплат · {fmtMoney(receivedAll)} с.</span>
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
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-base font-bold text-emerald-600 whitespace-nowrap">+{fmtMoney(p.amount)} с.</span>
                    <button
                      onClick={() => setReceipt(p)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Receipt className="w-3 h-3" /> Чек
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PaymentReceiptDialog
        payment={receipt}
        employee={employee}
        business={business}
        onClose={() => setReceipt(null)}
      />
    </div>
  );
}