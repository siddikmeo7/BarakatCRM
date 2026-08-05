import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckCircle2,
  Users, Loader2, Save, CalendarClock, UserCircle
} from 'lucide-react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, isWithinInterval, parseISO, format
} from 'date-fns';
import { ru } from 'date-fns/locale';

const PERIODS = [
  { key: 'today',      label: 'Сегодня',        icon: CalendarClock },
  { key: 'yesterday',  label: 'Вчера',           icon: CalendarClock },
  { key: 'this_week',  label: 'Эта неделя',     icon: CalendarClock },
  { key: 'this_month',  label: 'Этот месяц',      icon: CalendarClock },
  { key: 'this_year',   label: 'Этот год',       icon: CalendarClock },
  { key: 'all_time',    label: 'За всё время',   icon: CalendarClock },
  { key: 'custom',      label: 'Свой период',    icon: CalendarClock },
];

function getRange(periodKey, customRange) {
  const now = new Date();
  switch (periodKey) {
    case 'today':      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case 'this_week':  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month':  return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_year':   return { start: startOfYear(now), end: endOfYear(now) };
    case 'all_time':    return { start: new Date(0), end: now };
    case 'custom':      return { start: startOfDay(customRange.from || now), end: endOfDay(customRange.to || now) };
    default:            return { start: startOfDay(now), end: endOfDay(now) };
  }
}

const periodKeyFor = (key, range) =>
  key === 'custom' ? `custom_${range.start.toISOString()}_${range.end.toISOString()}` : key;

export default function OwnerProfitControl({ business }) {
  const [periodKey, setPeriodKey] = useState('this_month');
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expectation, setExpectation] = useState(null);
  const [expectedInput, setExpectedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getRange(periodKey, customRange), [periodKey, customRange]);
  const periodKeyStr = useMemo(() => periodKeyFor(periodKey, range), [periodKey, range]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, e, emps, exps] = await Promise.all([
        base44.entities.Sale.filter({ business_id: business.id }),
        base44.entities.Expense.filter({ business_id: business.id }),
        base44.entities.Employee.filter({ business_id: business.id }),
        base44.entities.ProfitExpectation.filter({ business_id: business.id }),
      ]);
      setSales(s);
      setExpenses(e);
      setEmployees(emps);
      const match = exps.find(x => x.period_key === periodKeyStr);
      setExpectation(match || null);
      setExpectedInput(match ? String(match.expected_net_profit) : '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [periodKeyStr]);

  // Compute metrics
  const inRange = (dateStr) => {
    try { return isWithinInterval(parseISO(dateStr), { start: range.start, end: range.end }); }
    catch { return false; }
  };

  const activeSales = sales.filter(s => !s.is_cancelled && inRange(s.sale_date));
  const revenue = activeSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const salesProfit = activeSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  const periodExpenses = expenses.filter(e => inRange(e.expense_date));
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const actualNet = revenue - totalExpenses;
  const expected = expectation ? (expectation.expected_net_profit || 0) : (expectedInput ? parseFloat(expectedInput) || 0 : 0);
  const gap = expected - actualNet; // positive = actual less than expected → unrecorded expenses suspected

  // Per-author expense breakdown (employees + owner)
  const byAuthor = useMemo(() => {
    const map = new Map();
    for (const e of periodExpenses) {
      const name = e.created_by_name || '—';
      const role = e.created_by_role || (e.created_by_name ? 'employee' : 'owner');
      const key = name;
      if (!map.has(key)) map.set(key, { name, role, total: 0, count: 0 });
      const rec = map.get(key);
      rec.total += (e.amount || 0);
      rec.count += 1;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [periodExpenses]);

  // Active employees who entered NOTHING in the period → suspects
  const suspects = useMemo(() => {
    const authorsNames = new Set(byAuthor.map(a => a.name));
    return employees.filter(emp => emp.is_active && !authorsNames.has(emp.name));
  }, [byAuthor, employees]);

  const saveExpectation = async () => {
    const val = parseFloat(expectedInput) || 0;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: '', full_name: '' }));
      const payload = {
        business_id: business.id,
        period_key: periodKeyStr,
        period_label: PERIODS.find(p => p.key === periodKey)?.label || 'Период',
        period_start: range.start.toISOString(),
        period_end: range.end.toISOString(),
        expected_net_profit: val,
        declared_by_name: user.full_name || user.email || 'Владелец',
        declared_by_email: user.email || '',
      };
      if (expectation?.id) {
        const updated = await base44.entities.ProfitExpectation.update(expectation.id, payload);
        setExpectation(updated);
      } else {
        const created = await base44.entities.ProfitExpectation.create(payload);
        setExpectation(created);
      }
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map(p => {
            const active = periodKey === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPeriodKey(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  active ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {periodKey === 'custom' && (
          <div className="flex items-center gap-2 mt-3">
            <Input type="date" value={customRange.from ? format(customRange.from, 'yyyy-MM-dd') : ''} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value ? new Date(e.target.value) : null }))} className="h-9 text-xs w-36" />
            <span className="text-slate-400 text-xs">—</span>
            <Input type="date" value={customRange.to ? format(customRange.to, 'yyyy-MM-dd') : ''} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value ? new Date(e.target.value) : null }))} className="h-9 text-xs w-36" />
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
          <CalendarClock className="w-3 h-3" />
          Период: {format(range.start, 'dd MMM yyyy', { locale: ru })} — {format(range.end, 'dd MMM yyyy', { locale: ru })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : (
        <>
          {/* Net profit control panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Выручка (продажи)
              </div>
              <p className="text-2xl font-bold text-emerald-600">{fmt(revenue)} с.</p>
              <p className="text-[11px] text-slate-400 mt-1">Прибыль от продаж: {fmt(salesProfit)} с.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Расходы (введённые)
              </div>
              <p className="text-2xl font-bold text-red-600">−{fmt(totalExpenses)} с.</p>
              <p className="text-[11px] text-slate-400 mt-1">Записей: {periodExpenses.length}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                <Wallet className="w-4 h-4 text-indigo-500" /> Фактическая чистая прибыль
              </div>
              <p className={`text-2xl font-bold ${actualNet >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(actualNet)} с.</p>
              <p className="text-[11px] text-slate-400 mt-1">Выручка − расходы</p>
            </div>
          </div>

          {/* Expected vs actual — gap detection */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-indigo-500" />
              Контроль чистой прибыли
            </h3>
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1.5">
                  Ожидаемая чистая прибыль за этот период (сколько вы должны были заработать)
                </label>
                <Input
                  type="number"
                  placeholder="например, 50000"
                  value={expectedInput}
                  onChange={e => setExpectedInput(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
              <Button onClick={saveExpectation} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </Button>
            </div>

            {expected > 0 && (
              <div className="mt-4">
                {gap > 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-700 dark:text-red-300">
                          ⚠️ Кто-то не ввёл расходы! Чистая прибыль ниже ожидаемой.
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Вы ожидали <b>{fmt(expected)} с.</b>, но по системе получилось <b>{fmt(actualNet)} с.</b>
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Разница <b>{fmt(gap)} с.</b> — это деньги, потраченные из бизнеса, но не записанные в расходы.
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          На самом деле чистая прибыль должна быть {fmt(expected)} с., но у вас меньше на {fmt(gap)} с. — кто-то сделал расходы и не ввёл их в систему.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-700 dark:text-emerald-300">Всё сходится ✓</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                          Фактическая чистая прибыль ({fmt(actualNet)} с.) не ниже ожидаемой ({fmt(expected)} с.). Все расходы, похоже, введены.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Per-employee expense breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Расходы по сотрудникам за период</h3>
              <span className="ml-auto text-xs text-slate-400">Всего: {fmt(totalExpenses)} с.</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto custom-scroll">
              {byAuthor.length === 0 && suspects.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Нет сотрудников и расходов за период</div>
              ) : (
                <>
                  {byAuthor.map(a => (
                    <div key={a.name} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                        <UserCircle className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{a.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {a.role === 'owner' ? 'Владелец' : a.role === 'admin' ? 'Админ' : 'Сотрудник'} · {a.count} запис.
                        </p>
                      </div>
                      <p className="text-sm font-bold text-red-600">−{fmt(a.total)} с.</p>
                    </div>
                  ))}
                  {suspects.map(emp => (
                    <div key={emp.id} className="flex items-center gap-3 px-4 py-3 bg-red-50/50 dark:bg-red-900/20">
                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{emp.name}</p>
                        <p className="text-[11px] text-red-500">
                          Не вводил расходы за этот период — возможно потратил деньги из бизнеса, но не записал
                        </p>
                      </div>
                      <p className="text-sm font-bold text-red-500">0 с.</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}