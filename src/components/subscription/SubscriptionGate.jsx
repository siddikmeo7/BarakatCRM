import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, RefreshCw, LogOut, CreditCard, AlertTriangle } from 'lucide-react';
import { loadPlan, formatPrice, startSubscriptionCheckout } from '@/lib/subscription';

export default function SubscriptionGate({ business, isEmployee = false, onRefresh }) {
  const [plan, setPlan] = useState(null);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlan().then(setPlan).catch(() => setPlan(null));
  }, []);

  const blocked = business?.subscription_status === 'blocked';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_12px_40px_rgba(15,23,42,.12)] p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          {blocked ? <Lock className="w-8 h-8 text-red-500" /> : <AlertTriangle className="w-8 h-8 text-red-500" />}
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {blocked ? 'Доступ закрыт' : 'Бесплатный месяц закончился'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {blocked
              ? 'Доступ к системе для этого бизнеса приостановлен.'
              : 'Чтобы продолжить работу в BarakatCRM, оформите подписку.'}
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 pt-1">{business?.name}</p>
        </div>

        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-4 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[.12em] text-indigo-600 dark:text-indigo-300">Стоимость</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{formatPrice(plan) || '—'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">в месяц, с автопродлением</p>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

        {isEmployee ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Оплату подписки делает владелец бизнеса. Обратитесь к нему, чтобы возобновить доступ.
          </p>
        ) : (
          <Button
            onClick={handlePay}
            disabled={paying || !plan}
            className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-2"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {paying ? 'Переходим к оплате...' : 'Оплатить подписку'}
          </Button>
        )}

        <Button variant="outline" onClick={handleRefresh} disabled={checking} className="w-full rounded-full gap-2">
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Проверить оплату
        </Button>

        <button
          onClick={() => base44.auth.logout()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Выйти из аккаунта
        </button>

        <p className="text-[11px] text-slate-400">
          Оплата защищена Base44 Payments. Если вы уже оплатили, нажмите «Проверить оплату» через минуту.
        </p>
      </div>
    </div>
  );
}