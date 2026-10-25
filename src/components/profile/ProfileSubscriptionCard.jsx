import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import SubscriptionStatusBadge from '@/components/subscription/SubscriptionStatusBadge';
import { getSubscriptionState, loadPlan, formatPrice, fetchAccessState, providerLabel, fetchPaymentHistory } from '@/lib/subscription';
import { CreditCard, RefreshCw, Loader2 } from 'lucide-react';

// Подписка бизнеса: статус, сроки, стоимость и оплата — всё внутри профиля
export default function ProfileSubscriptionCard({ business, canPay, isPlatformAdmin, onPay, onRefresh }) {
  const [plan, setPlan] = useState(null);
  const [access, setAccess] = useState(null);
  const [payments, setPayments] = useState([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadPlan().then(setPlan).catch(() => setPlan(null));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    fetchAccessState(business.id).then(setAccess).catch(() => setAccess(null));
    fetchPaymentHistory(business.id).then(setPayments).catch(() => setPayments([]));
  }, [business?.id, business?.subscription_status]);

  const state = getSubscriptionState(business, { isPlatformAdmin });

  const refresh = async () => {
    setChecking(true);
    try { await onRefresh?.(); } finally { setChecking(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">Подписка</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{state.label}</p>
        </div>
        <SubscriptionStatusBadge business={business} isPlatformAdmin={isPlatformAdmin} />
      </div>

      <div className="p-4 grid sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Бесплатный период до</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {state.trialEndsAt ? format(state.trialEndsAt, 'dd.MM.yyyy') : '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Подписка оплачена с</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {business?.subscription_started_at ? format(new Date(business.subscription_started_at), 'dd.MM.yyyy') : '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Стоимость в месяц</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {access?.price ? `${access.price} ${access.currency || ''}`.trim() : (formatPrice(plan) || '—')}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Оплачено до</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {access?.paidUntil ? format(new Date(access.paidUntil), 'dd.MM.yyyy') : '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Автопродление</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {access?.autoRenew ? 'Включено' : 'Выключено'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Способ оплаты</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{providerLabel(access)}</p>
        </div>
      </div>

      {access?.exempt && (
        <p className="px-4 pb-3 text-xs text-emerald-700 dark:text-emerald-300">
          Бесплатный доступ{access.exemptReason ? `: ${access.exemptReason}` : ''}
          {access.exemptUntil ? ` (до ${format(new Date(access.exemptUntil), 'dd.MM.yyyy')})` : ''}
        </p>
      )}

      {business?.subscription_note && (
        <p className="px-4 pb-3 text-xs text-slate-500 dark:text-slate-400">
          Способ оплаты / примечание: {business.subscription_note}
        </p>
      )}

      {payments.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">История оплат</p>
          {payments.slice(0, 5).map((p, index) => (
            <div key={`${p.date}-${index}`} className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span>
                {p.date ? format(new Date(p.date), 'dd.MM.yyyy') : '—'} · {p.type === 'subscription' ? 'автопродление' : 'оплата за месяц'}
              </span>
              <span className="font-medium tabular-nums">
                {p.amount}
                {p.status === 'ok' ? '' : p.status === 'failed' ? ' (не прошло)' : ' (ожидает)'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {canPay && (
          <Button onClick={onPay} className="gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700">
            <CreditCard className="w-4 h-4" />
            {state.status === 'active' ? 'Продлить подписку' : 'Оплатить подписку'}
          </Button>
        )}
        <Button variant="outline" onClick={refresh} disabled={checking} className="gap-2 rounded-full">
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Проверить оплату
        </Button>
      </div>
    </div>
  );
}