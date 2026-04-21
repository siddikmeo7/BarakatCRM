import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function GrowthBadge({ current, previous, unit = '%', suffix = '' }) {
  if (!previous && previous !== 0) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isFlat = diff === 0;

  if (isFlat) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
      <Minus className="w-3 h-3" /> без изменений
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct}{unit}{suffix}
    </span>
  );
}