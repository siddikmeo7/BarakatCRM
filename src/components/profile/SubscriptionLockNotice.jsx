import React, { useState } from 'react';
import { Lock, CreditCard, Loader2, EyeOff, Check, Info } from 'lucide-react';
import { useSubscriptionLock } from '@/lib/subscriptionLock';
import { startSubscriptionCheckout } from '@/lib/subscription';

/**
 * Уведомление в профиле: подписка не оплачена, поэтому система работает
 * только для просмотра. Владелец видит сумму и кнопку оплаты,
 * сотрудник — пояснение, что оплату делает владелец бизнеса.
 */
export default function SubscriptionLockNotice() {
  const { frozen, access, isOwner } = useSubscriptionLock();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (!frozen) return null;

  const price = access?.price ? `${access.price} ${access.currency || ''}`.trim() : '';
  const planName = access?.planName || 'BarakatCRM — подписка';

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

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {isOwner ? 'Подписка за этот месяц не оплачена' : 'Бизнес-аккаунт сейчас не работает'}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-1 leading-relaxed">
            {isOwner
              ? 'Все функции заморожены: вы можете просматривать товары, продажи, клиентов, склады и отчёты, но не можете добавлять или изменять данные. Чтобы продолжить работу, оплатите подписку.'
              : 'Владелец бизнеса не оплатил подписку, поэтому система сейчас не работает. Вам доступен только просмотр данных, которые вам разрешены.'}
          </p>

          {price && (
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mt-2">
              {planName} · {price} в месяц
            </p>
          )}

          {error && <p className="text-xs text-red-700 dark:text-red-400 mt-2">{error}</p>}
        </div>
      </div>

      <div className="border-t border-amber-200/70 dark:border-amber-800/50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-amber-900/80 dark:text-amber-200/80">
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          Просмотр данных и отчётов — доступен
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-900/80 dark:text-amber-200/80">
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          Добавление, изменение и удаление — заблокировано
        </div>

        {isOwner ? (
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full mt-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {paying ? 'Переход к оплате...' : price ? `Оплатить ${price}` : 'Оплатить подписку'}
          </button>
        ) : (
          <div className="flex items-start gap-2 text-xs text-amber-900/80 dark:text-amber-200/80 pt-1">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Оплату подписки делает владелец бизнеса. Обратитесь к нему, чтобы возобновить работу системы.
          </div>
        )}
      </div>
    </div>
  );
}