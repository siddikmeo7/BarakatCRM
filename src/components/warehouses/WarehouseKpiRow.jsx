import React from 'react';

// Итоги по всем складам: приборная полоса под шапкой раздела
const ITEMS = [
  { key: 'products', label: 'Товаров' },
  { key: 'boxes', label: 'Коробок' },
  { key: 'wholesale', label: 'Опт. стоимость' },
  { key: 'retail', label: 'Розн. стоимость' },
  { key: 'profit', label: 'Потенц. прибыль' },
  { key: 'revenue', label: 'Выручка' },
];

export default function WarehouseKpiRow({ values = {} }) {
  return (
    <div className="sh-report">
      {ITEMS.map(item => (
        <div key={item.key} className="sh-item">
          <span className="sh-cap">{item.label}</span>
          <b>{values[item.key]}</b>
        </div>
      ))}
    </div>
  );
}