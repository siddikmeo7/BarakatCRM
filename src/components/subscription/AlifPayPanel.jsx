import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard, Loader2, RefreshCw, Repeat, CalendarClock, AlertTriangle, CheckCircle2, Phone, X,
} from 'lucide-react';
import { fetchAccessState, alifSubscriptionAction } from '@/lib/subscription';

// Ежемесячная подписка через Alif Bank: автопродление или оплата за месяц.
// Пока банк не подключён, показываем честное состояние и что для этого нужно.
export default function AlifPayPanel({ business, canPay = false, onRefresh }) {
  const [access, setAccess] = useState(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const state = await fetchAccessState(business?.id);
      setAccess(state);
      return state;
    } catch (_) {
      setAccess(null);
      return null;
    }
  };

  useEffect(() => {
    if (!business?.id) return;
    setPhone(business.phone || '');
    load();
  }, [business?.id]);

  const run = async (action, payload = {}, redirect = false) => {
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const data = await alifSubscriptionAction(action, { business_id: business?.id, ...payload });
      if (data?.redirectUrl && redirect) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data?.error) setError(data.error);
      else if (data?.message) setMessage(data.message);
      else if (payload.mode === 'auto' && data?.step === 'subscription_created') {
        setMessage('Подписка создана. Первое списание активирует автопродление.');
      } else if (action === 'cancel') {
        setMessage('Автопродление отключено. Доступ сохранится до конца оплаченного месяца.');
      } else if (action === 'check') {
        setMessage(data?.note || `Состояние оплаты: ${data?.status || 'нет данных'}`);
      }
      await load();
      await onRefresh?.();
    } catch (e) {
      setError(e?.message || 'Не удалось выполнить действие');
    } finally {
      setBusy('');
    }
  };

  const price = access?.price || 100;
  const currency = access?.currency || 'TJS';
  const autoRenew = !!access?.autoRenew;
  const configured = !!access?.alifConfigured;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-indigo-500 flex-none" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          Ежемесячная подписка через Alif Bank
        </p>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {price} {currency} в месяц. Автопродление списывает сумму каждый месяц автоматически —
        заходить и оплачивать вручную не нужно.
      </p>

      {!configured && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">Alif Bank ещё не подключён к приложению</p>
            <p>
              Нужен договор эквайринга: банк выдаёт ID терминала и пароль к нему, а адрес приложения
              для уведомлений указывается в договоре. После этого доступ к оплате включится сам.
            </p>
          </div>
        </div>
      )}

      {autoRenew && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Автопродление включено
          </p>
          <p className="text-xs text-emerald-900 dark:text-emerald-200">
            {access?.alifAccount ? `Платёжное средство: ${access.alifAccount}. ` : ''}
            {access?.nextChargeAt
              ? `Следующее списание: ${new Date(access.nextChargeAt).toLocaleDateString('ru-RU')}`
              : 'Списание — каждый месяц по дате подключения'}
          </p>
          {access?.paidUntil && (
            <p className="text-xs text-emerald-900 dark:text-emerald-200">
              Доступ оплачен до {new Date(access.paidUntil).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
      )}

      {!autoRenew && configured && access?.hasAlifSubscription && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Подписка в банке оформлена, автопродление отключено. Доступ сохраняется до конца
          оплаченного периода.
        </p>
      )}

      {!autoRenew && configured && !access?.hasAlifSubscription && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Номер телефона для привязки карты
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+992XXXXXXXXX"
            className="rounded-xl"
          />
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</div>}
      {message && <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{message}</div>}

      {canPay && configured && (
        <div className="flex flex-col gap-2">
          {!autoRenew && (
            <Button
              onClick={() => run('start', { mode: 'auto', phone }, true)}
              disabled={!!busy}
              className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-2"
            >
              {busy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
              Подключить автопродление
            </Button>
          )}

          {autoRenew && (
            <Button
              variant="outline"
              onClick={() => run('cancel')}
              disabled={!!busy}
              className="w-full rounded-full gap-2"
            >
              {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Отключить автопродление
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => run('start', { mode: 'once', phone }, true)}
              disabled={!!busy}
              className="rounded-full gap-2"
            >
              {busy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Оплатить месяц
            </Button>
            <Button variant="ghost" onClick={() => run('check')} disabled={!!busy} className="rounded-full gap-2">
              {busy === 'check' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Проверить оплату
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            Оплата проходит на защищённой странице банка
          </p>
        </div>
      )}

      {!canPay && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Оплату и автопродление настраивает владелец бизнеса.
        </p>
      )}
    </div>
  );
}

// Панель обновляется после каждой оплаты — отдельные обработчики не нужны.