import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import SubscriptionStatusBadge from '@/components/subscription/SubscriptionStatusBadge';
import SubscriptionActiveMark from '@/components/subscription/SubscriptionActiveMark';
import { getSubscriptionState, loadPlan, formatPrice, fetchAccessState, providerLabel } from '@/lib/subscription';
import { CreditCard, RefreshCw, Loader2, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

// Сколько неудачных попыток оплаты показываем построчно
const ATTEMPTS_LIMIT = 5;

// Шапка карточки окрашивается по статусу подписки
const HEADER_TONES = {
  active: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600',
  exempt: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600',
  trial: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500',
  expired: 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-600',
  blocked: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
  admin: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600',
};

// Подписка бизнеса: статус, сроки, стоимость и оплата — всё внутри профиля
export default function ProfileSubscriptionCard({ business, canPay, isPlatformAdmin, onPay, onRefresh }) {
  const [plan, setPlan] = useState(null);
  const [access, setAccess] = useState(null);
  const [payments, setPayments] = useState([]);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    loadPlan().then(setPlan).catch(() => setPlan(null));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    fetchAccessState(business.id).then(setAccess).catch(() => setAccess(null));
    // История оплат — из записей Base44 Payments (владелец видит свои оплаты)
    base44.entities.Base44Purchase.filter({ status: 'paid' }, { sort: '-paid_at', limit: 20 })
      .then((page) => setPayments((page?.items || []).map(p => ({
        status: 'ok',
        date: p.paidAt || p.created_date,
        amount: p.amount ? `${p.amount} ${p.currency || ''}`.trim() : '',
        type: 'subscription',
      }))))
      .catch(() => setPayments([]));
  }, [business?.id, business?.subscription_status]);

  const state = getSubscriptionState(business, { isPlatformAdmin });

  // Успешные оплаты показываем полностью, а неудачные попытки — отдельным списком «Не оплачено»
  const paidPayments = payments.filter(p => p.status === 'ok');
  const unpaidPayments = payments.filter(p => p.status !== 'ok');

  // Проверка оплаты: после проверки показываем результат, чтобы было понятно, нашлась оплата или нет
  const refresh = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      await onRefresh?.();
      const fresh = business?.id ? await fetchAccessState(business.id) : null;
      if (fresh) setAccess(fresh);
      if (!fresh) {
        setCheckResult({ ok: false, text: 'Не удалось проверить оплату. Попробуйте ещё раз через минуту.' });
      } else if (fresh.allowed === false) {
        setCheckResult({ ok: false, text: 'Оплата пока не найдена. Если вы только что оплатили, подождите минуту и нажмите снова.' });
      } else {
        setCheckResult({
          ok: true,
          text: fresh.paidUntil
            ? `Оплата найдена — подписка активна до ${format(new Date(fresh.paidUntil), 'dd.MM.yyyy')}`
            : 'Доступ открыт — оплата не требуется'
        });
      }
    } catch (e) {
      setCheckResult({ ok: false, text: 'Не удалось проверить оплату. Попробуйте ещё раз через минуту.' });
    } finally {
      setChecking(false);
    }
  };

  const tone = HEADER_TONES[state.status] || HEADER_TONES.trial;
  const isActive = ['active', 'exempt'].includes(state.status);

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      {/* Шапка: статус подписки крупно, с галочкой */}
      <div className={cn('relative px-5 py-5 text-white', tone)}>
        <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-16 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            {isActive ? <BadgeCheck className="w-7 h-7" /> : <CreditCard className="w-6 h-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Подписка</p>
            <p className="text-xl font-black leading-tight flex items-center gap-1.5 mt-0.5">
              {state.label}
              <SubscriptionActiveMark business={business} size={17} className="text-white" />
            </p>
            <p className="text-xs text-white/80 mt-0.5 truncate">
              {business?.name || 'Бизнес'}
            </p>
          </div>

          <SubscriptionStatusBadge business={business} isPlatformAdmin={isPlatformAdmin} className="flex-shrink-0" />
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/70">Оплачено до</p>
            <p className="text-sm font-bold">
              {access?.paidUntil ? format(new Date(access.paidUntil), 'dd.MM.yyyy') : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/70">Стоимость в месяц</p>
            <p className="text-sm font-bold">
              {access?.price ? `${access.price} ${access.currency || ''}`.trim() : (formatPrice(plan) || '—')}
            </p>
          </div>
        </div>
      </div>

      {/* Сроки и способ оплаты */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          <p className="text-[11px] text-slate-400">Автопродление</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {access?.autoRenew ? 'Включено' : 'Выключено'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 col-span-2 sm:col-span-3">
          <p className="text-[11px] text-slate-400">Способ оплаты</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{providerLabel(access)}</p>
        </div>
      </div>

      {access?.exempt && (
        <p className="px-4 pt-3 text-xs text-emerald-700 dark:text-emerald-300">
          Бесплатный доступ{access.exemptReason ? `: ${access.exemptReason}` : ''}
          {access.exemptUntil ? ` (до ${format(new Date(access.exemptUntil), 'dd.MM.yyyy')})` : ''}
        </p>
      )}

      {business?.subscription_note && (
        <p className="px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
          Способ оплаты / примечание: {business.subscription_note}
        </p>
      )}

      {(paidPayments.length > 0 || unpaidPayments.length > 0) && (
        <div className="px-4 pt-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">История оплат</p>

          {paidPayments.map((p, index) => (
            <div key={`paid-${p.date}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                {p.date ? format(new Date(p.date), 'dd.MM.yyyy') : '—'} · {p.type === 'subscription' ? 'автопродление' : 'оплата за месяц'}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{p.amount}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Оплачено</span>
              </span>
            </div>
          ))}

          {unpaidPayments.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pt-1.5">
              Не оплачено · {unpaidPayments.length} попытк(и) оплаты
            </p>
          )}
          {unpaidPayments.slice(0, ATTEMPTS_LIMIT).map((p, index) => (
            <div key={`unpaid-${p.date}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {p.date ? format(new Date(p.date), 'dd.MM.yyyy') : '—'} · попытка оплаты
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums text-slate-500 dark:text-slate-400">{p.amount}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">Не оплачено</span>
              </span>
            </div>
          ))}
          {unpaidPayments.length > ATTEMPTS_LIMIT && (
            <p className="text-[11px] text-slate-400">и ещё {unpaidPayments.length - ATTEMPTS_LIMIT} попыток оплаты</p>
          )}
        </div>
      )}

      <div className="px-4 py-4 flex flex-wrap gap-2">
        {canPay && (
          <Button onClick={onPay} className="gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700">
            <CreditCard className="w-4 h-4" />
            {state.status === 'active' ? 'Продлить подписку' : 'Оплатить подписку'}
          </Button>
        )}
        <Button variant="outline" onClick={refresh} disabled={checking} className="gap-2 rounded-full">
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {checking ? 'Проверяем...' : 'Проверить оплату'}
        </Button>
      </div>

      {checkResult && (
        <p className={`mx-4 mb-4 rounded-xl px-3 py-2 text-xs ${checkResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
          {checkResult.text}
        </p>
      )}
    </div>
  );
}