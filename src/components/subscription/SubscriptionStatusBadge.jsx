import React from 'react';
import { getSubscriptionState } from '@/lib/subscription';
import { cn } from '@/lib/utils';

const TONES = {
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  exempt: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  blocked: 'bg-slate-200 text-slate-600 border-slate-300',
  admin: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function SubscriptionStatusBadge({ business, isPlatformAdmin = false, className }) {
  const state = getSubscriptionState(business, { isPlatformAdmin });
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
      TONES[state.status] || TONES.trial,
      className
    )}>
      {state.label}
    </span>
  );
}