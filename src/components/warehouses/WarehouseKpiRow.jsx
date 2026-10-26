import React from 'react';

// Цвета и задержки появления плиток — как в утверждённом макете «Пульт склада»
const TILES = [
  { key: 'products', label: 'Товаров', color: '#2563eb', delay: '0s' },
  { key: 'boxes', label: 'Коробок', color: '#0ea5e9', delay: '.04s' },
  { key: 'wholesale', label: 'Опт. стоимость', color: '#6366f1', delay: '.08s' },
  { key: 'retail', label: 'Розн. стоимость', color: '#8b5cf6', delay: '.12s' },
  { key: 'profit', label: 'Потенц. прибыль', color: '#16a34a', delay: '.16s' },
  { key: 'revenue', label: 'Выручка', color: '#f59e0b', delay: '.2s' },
];

// KPI-строка раздела «Склады»: итоги по всем складам бизнеса
export default function WarehouseKpiRow({ values = {} }) {
  return (
    <div className="wh-kpi">
      {TILES.map(t => (
        <div key={t.key} className="wh-k" style={{ '--c': t.color, animationDelay: t.delay }}>
          <span className="wh-cap">{t.label}</span>
          <b style={t.key === 'profit' ? { color: '#16a34a' } : undefined}>{values[t.key]}</b>
        </div>
      ))}
    </div>
  );
}