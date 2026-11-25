import React, { useState } from 'react';
import { Lock, CreditCard, Loader2, Eye } from 'lucide-react';
import { useSubscriptionLock } from '@/lib/subscriptionLock';
import { startSubscriptionCheckout } from '@/lib/subscription';

/**
 * Полоса над содержимым: подписка не оплачена — все изменения заблокированы,
 * но данные бизнеса остаются доступными для просмотра.
 */
export default function SubscriptionLockBanner() {
  const { frozen, access, isOwner } = useSubscriptionLock();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (!frozen) return null;

  const price = access?.price ? `${access.price} ${access.currency || ''}`.trim() : '';

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
    <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
        </div>

        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-bold text-red-800 dark:text-red-300">
            {isOwner ? 'Подписка не оплачена — функции заморожены' : 'Бизнес-аккаунт не работает: подписка не оплачена'}
          </p>
          <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-0.5">
            {isOwner
              ? 'Данные доступны только для просмотра. Чтобы снова добавлять и изменять, оплатите подписку.'
              : 'Владелец бизнеса не оплатил подписку. Вам доступен только просмотр данных.'}
          </p>
          {error && <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700/80 dark:text-red-300/70">
            <Eye className="w-3.5 h-3.5" />
            Только просмотр
          </span>
          {isOwner && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold transition-colors"
            >
              {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              {paying ? 'Переход к оплате...' : price ? `Оплатить ${price}` : 'Оплатить подписку'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}