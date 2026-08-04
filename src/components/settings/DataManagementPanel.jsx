import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Package, ShoppingCart, Users, CreditCard, TrendingDown, RotateCcw, Warehouse, Bot, History, Layers, AlertCircle } from 'lucide-react';

// Категории данных, которые можно удалить по отдельности
// bg/text — статичные классы (Tailwind не вычищает литералы)
const CATEGORIES = [
  { key: 'Sale',               label: 'Продажи',            icon: ShoppingCart,   bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-600 dark:text-green-400' },
  { key: 'DebtPayment',        label: 'Оплаты долгов',      icon: CreditCard,    bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'Expense',            label: 'Расходы',            icon: TrendingDown,  bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-600 dark:text-red-400' },
  { key: 'Customer',           label: 'Клиенты',           icon: Users,         bg: 'bg-pink-100 dark:bg-pink-900/40',     text: 'text-pink-600 dark:text-pink-400' },
  { key: 'Product',            label: 'Товары',            icon: Package,       bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-600 dark:text-blue-400' },
  { key: 'ConsignmentProduct', label: 'Товары на реализации', icon: Layers,      bg: 'bg-cyan-100 dark:bg-cyan-900/40',     text: 'text-cyan-600 dark:text-cyan-400' },
  { key: 'ConsignmentSale',    label: 'Продажи реализации', icon: ShoppingCart,  bg: 'bg-teal-100 dark:bg-teal-900/40',    text: 'text-teal-600 dark:text-teal-400' },
  { key: 'ConsignmentPayout',  label: 'Выплаты владельцам', icon: CreditCard,    bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-600 dark:text-amber-400' },
  { key: 'Return',             label: 'Возвраты',          icon: RotateCcw,     bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'Warehouse',          label: 'Склады',            icon: Warehouse,     bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400' },
  { key: 'AIChat',              label: 'Чаты с ИИ',        icon: Bot,           bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400' },
  { key: 'ActivityLog',        label: 'История действий',  icon: History,       bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-400' },
];

export default function DataManagementPanel({ business }) {
  const [busy, setBusy] = useState(null); // key удаляемой категории
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [result, setResult] = useState(null);

  const refreshCounts = async () => {
    if (!business?.id) return;
    setLoadingCounts(true);
    try {
      const entries = await Promise.all(
        CATEGORIES.map(async (c) => {
          try {
            const items = await base44.entities[c.key].filter({ business_id: business.id });
            return [c.key, items.length];
          } catch (_) {
            return [c.key, 0];
          }
        })
      );
      setCounts(Object.fromEntries(entries));
    } finally {
      setLoadingCounts(false);
    }
  };

  React.useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const deleteCategory = async (cat) => {
    const n = counts[cat.key] ?? 0;
    if (n === 0) { setResult({ ok: false, msg: `В разделе «${cat.label}» уже пусто.` }); return; }
    if (!confirm(`Удалить ВСЕ записи из раздела «${cat.label}»? (${n} шт.)\nЭто действие необратимо!`)) return;
    setBusy(cat.key);
    setResult(null);
    try {
      await base44.entities[cat.key].deleteMany({ business_id: business.id });
      setResult({ ok: true, msg: `✅ Удалено: ${cat.label} (${n} шт.)` });
      await refreshCounts();
    } catch (e) {
      setResult({ ok: false, msg: `❌ Ошибка: ${e?.message || 'неизвестная'}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Здесь можно выборочно удалить все записи определённого раздела.
          Удаляются только данные текущего бизнеса. Действия необратимы — перед удалением сделайте резервную копию.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Количество записей в каждом разделе:</p>
        <Button variant="ghost" size="sm" onClick={refreshCounts} disabled={loadingCounts} className="gap-1.5 text-xs">
          {loadingCounts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CATEGORIES.map((cat) => {
          const n = counts[cat.key] ?? 0;
          const isBusy = busy === cat.key;
          return (
            <div
              key={cat.key}
              className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                  <cat.icon className={`w-4 h-4 ${cat.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cat.label}</p>
                  <p className="text-xs text-slate-500">{n} записей</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy || n === 0}
                onClick={() => deleteCategory(cat)}
                className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Удалить
              </Button>
            </div>
          );
        })}
      </div>

      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}