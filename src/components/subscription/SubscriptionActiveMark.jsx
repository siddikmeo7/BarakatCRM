import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { getSubscriptionState } from '@/lib/subscription';
import { cn } from '@/lib/utils';

/**
 * Зелёная галочка «подписка активирована» для бизнеса.
 * Показывается владельцу и сотрудникам — в меню и в профиле.
 */
export default function SubscriptionActiveMark({ business, size = 14, withLabel = false, className }) {
  const state = getSubscriptionState(business);
  if (!business || !['active', 'exempt'].includes(state.status)) return null;

  return (
    <span
      title={state.label}
      className={cn('inline-flex items-center gap-1 flex-shrink-0 text-emerald-600 dark:text-emerald-400', className)}
    >
      <BadgeCheck style={{ width: size, height: size }} />
      {withLabel && (
        <span className="text-[10px] font-bold uppercase tracking-[.1em]">{state.label}</span>
      )}
    </span>
  );
}