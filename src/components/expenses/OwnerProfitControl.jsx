import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckCircle2,
  Users, Loader2, Save, CalendarClock, UserCircle, HandCoins
} from 'lucide-react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subDays, isWithinInterval, parseISO, format
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

const PERIODS = [
  { key: 'today',      label: 'Сегодня' },
  { key: 'yesterday',  label: 'Вчера' },
  { key: 'this_week',  label: 'Эта неделя' },
  { key: 'this_month',  label: 'Этот месяц' },
  { key: 'this_year',   label: 'Этот год' },
  { key: 'all_time',    label: 'За всё время' },
  { key: 'custom',      label: 'Свой период' },
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
  const { can } = useEmployeeAccess();
  const showRevenue = can('view_expense_sales_revenue');
  const showMoneyInHand = can('view_expense_money_in_hand');
  const showAllExpenses = can('view_all_expenses');
  const [periodKey, setPeriodKey] = useState('this_month');
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [declaration, setDeclaration] = useState(null);
  const [moneyInput, setMoneyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getRange(periodKey, customRange), [periodKey, customRange]);
  const periodKeyStr = useMemo(() => periodKeyFor(periodKey, range), [periodKey, range]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, e, emps, decls] = await Promise.all([
        base44.entities.Sale.filter({ business_id: business.id }),
        base44.entities.Expense.filter({ business_id: business.id }),
        base44.entities.Employee.filter({ business_id: business.id }),
        base44.entities.ProfitExpectation.filter({ business_id: business.id }),
      ]);
      setSales(s);
      setExpenses(e);
      setEmployees(emps);
      const match = decls.find(x => x.period_key === periodKeyStr);
      setDeclaration(match || null);
      setMoneyInput(match ? String(match.money_in_hand) : '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [periodKeyStr]);

  const inRange = (dateStr) => {
    try { return isWithinInterval(parseISO(dateStr), { start: range.start, end: range.end }); }
    catch { return false; }
  };

  const activeSales = sales.filter(s => !s.is_cancelled && inRange(s.sale_date));
  const revenue = activeSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const salesProfit = activeSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  const periodExpenses = expenses.filter(e => inRange(e.expense_date));
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Что система считает, что должно быть у владельца на руках
  // = выручка − все введённые расходы
  const calculatedNet = revenue - totalExpenses;

  // Что владелец реально держит в руках (по его словам)
  const inHand = declaration ? (declaration.money_in_hand || 0) : (moneyInput ? parseFloat(moneyInput) || 0 : 0);

  // Если на руках МЕНЬШЕ, чем система насчитала → разница = нераспределённые/невведённые расходы
  const gap = calculatedNet - inHand; // positive → у владельца меньше, чем должно быть

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

  const suspects = useMemo(() => {
    const authorsNames = new Set(byAuthor.map(a => a.name));
    return employees.filter(emp => emp.is_active && !authorsNames.has(emp.name));
  }, [byAuthor, employees]);

  const saveDeclaration = async () => {
    const val = parseFloat(moneyInput) || 0;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({ email: '', full_name: '' }));
      const payload = {
        business_id: business.id,
        period_key: periodKeyStr,
        period_label: PERIODS.find(p => p.key === periodKey)?.label || 'Период',
        period_start: range.start.toISOString(),
        period_end: range.end.toISOString(),
        money_in_hand: val,
        declared_by_name: user.full_name || user.email || 'Владелец',
        declared_by_email: user.email || '',
      };
      if (declaration?.id) {
        const updated = await base44.entities.ProfitExpectation.update(declaration.id, payload);
        setDeclaration(updated);
      } else {
        const created = await base44.entities.ProfitExpectation.create(payload);
        setDeclaration(created);
      }
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  return (
    <div className="space-y-4">
      {/* Объяснение для владельца */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-200 flex items-start gap-2">
          <HandCoins className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <b>Как это работает:</b> система считает, сколько чистой прибыли у вас <i>должно быть</i> за период (выручка минус все введённые расходы).
            Вы вводите, сколько денег у вас <i>реально на руках</i>. Если на руках меньше, чем насчитала система — значит кто-то потратил деньги из бизнеса, но не ввёл их в расходы.
          </span>
        </p>
      </div>

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
          {/* Метрики периода */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {showRevenue && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Выручка (продажи)
                </div>
                <p className="text-2xl font-bold text-emerald-600">{fmt(revenue)} с.</p>
                <p className="text-[11px] text-slate-400 mt-1">Прибыль от продаж: {fmt(salesProfit)} с.</p>
              </div>
            )}

            {showAllExpenses && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Расходы (введённые)
                </div>
                <p className="text-2xl font-bold text-red-600">−{fmt(totalExpenses)} с.</p>
                <p className="text-[11px] text-slate-400 mt-1">Записей: {periodExpenses.length}</p>
              </div>
            )}

            {showMoneyInHand && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                  <Wallet className="w-4 h-4 text-indigo-500" /> Должно быть на руках
                </div>
                <p className={`text-2xl font-bold ${calculatedNet >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmt(calculatedNet)} с.</p>
                <p className="text-[11px] text-slate-400 mt-1">Выручка − все расходы (по системе)</p>
              </div>
            )}
          </div>

          {/* Ввод реальной суммы на руках + контроль */}
          {showMoneyInHand && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <HandCoins className="w-5 h-5 text-indigo-500" />
              Сколько денег у вас реально на руках за этот период?
            </h3>
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1.5">
                  Введите сумму, которая у вас сейчас физически есть (наличные, касса, счёт)
                </label>
                <Input
                  type="number"
                  placeholder="например, 4000"
                  value={moneyInput}
                  onChange={e => setMoneyInput(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
              <Button onClick={saveDeclaration} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </Button>
            </div>

            {inHand > 0 && (
              <div className="mt-4">
                {gap > 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-700 dark:text-red-300">
                          ⚠️ Кто-то потратил деньги из бизнеса, но не ввёл в систему!
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          По расчёту у вас должно быть на руках <b>{fmt(calculatedNet)} с.</b>, но вы ввели, что у вас <b>{fmt(inHand)} с.</b>
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Разница <b>{fmt(gap)} с.</b> — это деньги, которые забрали из бизнеса и потратили, но не записали в расходы.
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          Проверьте сотрудников ниже — кто не вводил расходы в этом периоде, тот под подозрением.
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
                          То, что у вас на руках ({fmt(inHand)} с.), не меньше того, что насчитала система ({fmt(calculatedNet)} с.). Все расходы, похоже, введены.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Расходы по сотрудникам */}
          {showAllExpenses && (
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
          )}
        </>
      )}
    </div>
  );
}