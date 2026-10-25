import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, RefreshCw, ShieldCheck, CalendarClock, Info } from 'lucide-react';
import { getSubscriptionState, loadPlan, formatPrice, startSubscriptionCheckout, TRIAL_DAYS } from '@/lib/subscription';
import SubscriptionStatusBadge from './SubscriptionStatusBadge';
import AlifPayPanel from './AlifPayPanel';

export default function SubscriptionDialog({ business, open, onOpenChange, onRefresh, canPay = false }) {
  const [plan, setPlan] = useState(null);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    loadPlan().then(setPlan).catch(() => setPlan(null));
  }, [open]);

  const state = getSubscriptionState(business);
  const trialEnds = state.trialEndsAt ? state.trialEndsAt.toLocaleDateString('ru-RU') : '—';
  const trialDays = plan?.trial_days || TRIAL_DAYS;

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      await startSubscriptionCheckout();
    } catch (e) {
      setError(e?.message || 'Не удалось начать оплату');
      setPaying(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    try { await onRefresh?.(); } finally { setChecking(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-white">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Подписка BarakatCRM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{business?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {state.status === 'trial'
                  ? `Бесплатно до ${trialEnds}`
                  : state.status === 'active'
                    ? 'Подписка оплачена'
                    : state.status === 'exempt'
                      ? 'Доступ предоставлен бесплатно'
                      : 'Доступ ограничен'}
              </p>
            </div>
            <SubscriptionStatusBadge business={business} />
          </div>

          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-4 space-y-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-indigo-600 dark:text-indigo-300">Стоимость подписки</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{formatPrice(plan) || '—'}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">в месяц, списание каждый месяц с автопродлением</p>
          </div>

          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-none" />
              Первый месяц бесплатно — {trialDays} дней с момента создания бизнеса
            </li>
            <li className="flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-500 mt-0.5 flex-none" />
              Подписка продлевается автоматически, отказаться можно в любой момент
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-none" />
              Оплата проходит на защищённой странице банка или платёжного сервиса
            </li>
          </ul>

          <AlifPayPanel business={business} canPay={canPay} onRefresh={onRefresh} />

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

          {canPay ? (
            <div className="flex flex-col gap-2">
              <Button
                onClick={handlePay}
                disabled={paying || !plan}
                className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-2"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paying ? 'Переходим к оплате...' : 'Оплатить через Base44 Payments'}
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={checking} className="w-full rounded-full gap-2">
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                Проверить оплату
              </Button>
              <p className="text-xs text-slate-400 text-center">После оплаты доступ откроется автоматически, обычно в течение минуты</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Оплату подписки выполняет владелец бизнеса.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}