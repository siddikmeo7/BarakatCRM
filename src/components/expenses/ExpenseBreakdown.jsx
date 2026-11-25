import React from 'react';
import { fmtMoney } from './expenseDesign';

// Разбивка расходов по категориям в виде строк «книги»: значок, название,
// полоса доли и сумма. Категория окрашивает только значок и полосу.
export default function ExpenseBreakdown({ categories = [], total = 0, count = 0 }) {
  return (
    <section className="ex-brk">
      <div className="ex-sec">
        <h2>Разбивка по категориям</h2>
        <span className="ex-sp" />
        <span className="ex-note">−{fmtMoney(total)} с. · {count} записей</span>
      </div>
      <div className="ex-brk-grid">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const share = total > 0 ? cat.total / total : 0;
          return (
            <div className="ex-brk-row" key={cat.value} style={{ color: cat.bar }}>
              <span className="ex-ico">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="ex-brk-name">
                <span style={{ color: 'var(--ex-ink)' }}>{cat.label}</span>
                <span className="ex-brk-trk">
                  <i style={{ width: `${cat.total > 0 ? Math.max(2, share * 100) : 0}%` }} />
                </span>
              </span>
              <span className="ex-brk-v">
                {fmtMoney(cat.total)} с.
                <em>{total > 0 ? Math.round(share * 100) : 0}%</em>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}