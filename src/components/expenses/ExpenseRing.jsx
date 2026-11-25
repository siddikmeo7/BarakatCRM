import React from 'react';
import { fmtMoney } from './expenseDesign';

// Кольцо расходов: дуги категорий рисуются по кругу, в центре — итог периода.
// Длина дуги — доля категории (pathLength=100), смещение — сумма предыдущих.
export default function ExpenseRing({ categories = [], total = 0, count = 0 }) {
  const active = categories.filter(c => c.total > 0);
  let start = 0;
  const arcs = active.map((c, i) => {
    const share = total > 0 ? c.total / total : 0;
    const arc = {
      value: c.value,
      bar: c.bar,
      len: Math.max(share * 100, 0.6),
      start,
      delay: 0.6 + i * 0.3,
    };
    start += share * 100;
    return arc;
  });

  return (
    <div className="ep-ring">
      <div className="ep-rw">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="46" fill="none" stroke="#eef1ea" strokeWidth="26" />
          {arcs.map((arc) => (
            <circle
              key={arc.value}
              className="ep-arc"
              cx="60"
              cy="60"
              r="46"
              pathLength="100"
              stroke={arc.bar}
              style={{
                '--d': arc.len,
                animationDelay: `${arc.delay}s`,
                strokeDashoffset: -arc.start,
              }}
            />
          ))}
        </svg>
        <div className="ep-rc">
          <span className="ep-cap">Итого за период</span>
          <b className="ep-tot">
            −{fmtMoney(total)}
            <i>с.</i>
          </b>
          <span className="ep-note">{count} записей в книге</span>
        </div>
      </div>
    </div>
  );
}