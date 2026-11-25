import React from 'react';
import { fmtMoney } from './expenseDesign';

// Разбивка расходов по категориям: карточки с мягким кружком категории,
// полосой доли и суммой за период.
export default function ExpenseBreakdown({ categories = [], total = 0 }) {
  return (
    <div className="ep-brk">
      {categories.map((cat, i) => {
        const Icon = cat.icon;
        const share = total > 0 ? cat.total / total : 0;
        return (
          <div className="ep-br" key={cat.value} style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
            <span className="ep-ico" style={{ '--soft': cat.soft }}>
              <Icon style={{ color: cat.tone }} />
            </span>
            <span className="ep-bn">
              {cat.label}
              <span className="ep-trk">
                <i style={{ width: `${cat.total > 0 ? Math.max(2, share * 100) : 0}%`, background: cat.bar }} />
              </span>
            </span>
            <span className="ep-bv">
              {fmtMoney(cat.total)} с.
              <em>{total > 0 ? Math.round(share * 100) : 0}%</em>
            </span>
          </div>
        );
      })}
    </div>
  );
}