import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PaymentRow from './PaymentRow';

const PERIODS = [
  { key: 'all', label: 'Всё время', days: null },
  { key: 'month', label: 'Месяц', days: 30 },
  { key: 'quarter', label: '3 месяца', days: 90 },
  { key: 'year', label: 'Год', days: 365 },
];

// История всех платежей за подписку с выбором периода
export default function PaymentHistoryCard({ ownerEmail }) {
  const [purchases, setPurchases] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!ownerEmail) { setLoading(false); return; }
    setLoading(true);
    base44.entities.Base44Purchase
      .filter({ buyerEmail: ownerEmail }, { sort: '-created_date', limit: 100 })
      .then(res => {
        if (!alive) return;
        setPurchases(res?.items ?? (Array.isArray(res) ? res : []));
        setLoading(false);
      })
      .catch(() => { if (alive) { setPurchases([]); setLoading(false); } });
    return () => { alive = false; };
  }, [ownerEmail]);

  const days = PERIODS.find(p => p.key === period)?.days;
  const from = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  const rows = purchases.filter(p => !from || new Date(p.paidAt || p.created_date).getTime() >= from);
  const paidRows = rows.filter(p => p.status === 'paid');
  const total = paidRows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const currency = paidRows[0]?.currency || '';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">История платежей</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Оплачено за период: <span className="font-semibold text-slate-700 dark:text-slate-200">{total.toFixed(2)} {currency}</span>
            {' · '}{paidRows.length} платёж(ей)
          </p>
        </div>
      </div>

      <div className="px-4 pt-3 flex flex-wrap gap-1.5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              period === p.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Платежей за этот период нет.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
          {rows.map(p => <PaymentRow key={p.id} purchase={p} />)}
        </div>
      )}
    </div>
  );
}