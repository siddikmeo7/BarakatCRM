import React from 'react';
import { CARD, CAP, fmtMoney } from './expenseDesign';

// Кольцевая диаграмма расходов по категориям + легенда с полосами-метрами.
// Дуги рисуются через pathLength=1000: длина дуги = доля категории.
export default function ExpenseDonut({ categories = [], total = 0 }) {
  let cumulative = 0;
  const arcs = categories
    .filter(cat => cat.total > 0)
    .map((cat, i) => {
      const share = total > 0 ? cat.total / total : 0;
      const arc = {
        key: cat.value,
        bar: cat.bar,
        len: share * 1000,
        rotate: cumulative * 360,
        delay: 0.1 + i * 0.4,
      };
      cumulative += share;
      return arc;
    });

  return (
    <div className={`${CARD} p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-7 items-center`}>
      <div className="relative w-[260px] h-[260px] mx-auto">
        <svg viewBox="0 0 120 120" className="w-[260px] h-[260px] -rotate-90">
          <circle cx="60" cy="60" r="44" fill="none" stroke="#e8edf4" strokeWidth="30" />
          {arcs.map(arc => (
            <circle
              key={arc.key}
              className="expense-arc"
              cx="60"
              cy="60"
              r="44"
              pathLength="1000"
              stroke={arc.bar}
              strokeDasharray={`${arc.len} 1000`}
              style={{
                '--l': arc.len,
                '--d': `${arc.delay}s`,
                transform: `rotate(${arc.rotate}deg)`,
                transformOrigin: '60px 60px',
              }}
            />
          ))}
        </svg>
        <div className="expense-pop absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className={CAP}>Итого за период</span>
          <b className="text-[34px] font-bold text-red-600 tabular-nums tracking-[-.5px]">−{fmtMoney(total)} с.</b>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const share = total > 0 ? cat.total / total : 0;
          return (
            <div key={cat.value} className="flex flex-col gap-[5px]">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                <span className={`w-[26px] h-[26px] rounded-[9px] flex items-center justify-center flex-none ${cat.color}`}>
                  <Icon className="w-[15px] h-[15px]" />
                </span>
                {cat.label}
                <span className="ml-auto tabular-nums font-bold text-[13px]">{fmtMoney(cat.total)} с.</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <i
                  className="expense-meter"
                  style={{
                    width: `${cat.total > 0 ? Math.max(2, share * 100) : 2}%`,
                    background: cat.bar,
                    animationDelay: `${0.2 + i * 0.06}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}