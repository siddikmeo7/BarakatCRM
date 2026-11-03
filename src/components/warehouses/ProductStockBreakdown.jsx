import React, { useMemo } from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ProductPhoto from '@/components/products/ProductPhoto';
import { createPageUrl } from '@/utils';

const fmtDate = (d) => (d ? format(parseISO(d), 'dd.MM.yyyy') : '—');

// Сколько конкретного товара есть на складах: итоги и разбивка по складам
// (остаток, сумма, продано и когда товар создан/закуплен).
export default function ProductStockBreakdown({ query, products = [], warehouses = [], sales = [], can }) {
  const showQty = can('view_warehouse_quantities');
  const showValue = can('view_stock_value');
  const showCost = can('view_warehouse_cost');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matched = products.filter(p =>
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.product_type?.toLowerCase().includes(q)
    );
    const map = new Map();
    matched.forEach(p => {
      const key = p.warehouse_id || 'none';
      if (!map.has(key)) {
        map.set(key, {
          warehouse: warehouses.find(w => w.id === p.warehouse_id),
          rows: [], boxes: 0, value: 0, cost: 0, sold: 0,
        });
      }
      const g = map.get(key);
      const boxes = p.boxes_in_stock || 0;
      const sold = sales
        .filter(s => s.product_id === p.id && !s.is_cancelled)
        .reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
      g.rows.push({ p, boxes, sold, value: boxes * (p.sale_price || 0), cost: boxes * (p.purchase_price || 0) });
      g.boxes += boxes;
      g.sold += sold;
      g.value += boxes * (p.sale_price || 0);
      g.cost += boxes * (p.purchase_price || 0);
    });
    return [...map.values()].sort((a, b) => b.boxes - a.boxes);
  }, [query, products, warehouses, sales]);

  if (!query.trim() || groups.length === 0) return null;

  const totalBoxes = groups.reduce((s, g) => s + g.boxes, 0);
  const totalSold = groups.reduce((s, g) => s + g.sold, 0);
  const totalValue = groups.reduce((s, g) => s + g.value, 0);
  const totalCost = groups.reduce((s, g) => s + g.cost, 0);

  return (
    <div className="sh-bd">
      {/* Итоги по найденному товару */}
      <div className="sh-bd-tot">
        <span className="sh-cap">Найдено: «{query.trim()}»</span>
        <div className="sh-bd-k"><b>{showQty ? totalBoxes : '•••'}</b><span>Остаток, кор.</span></div>
        <div className="sh-bd-k"><b>{showQty ? totalSold : '•••'}</b><span>Продано, кор.</span></div>
        <div className="sh-bd-k"><b>{showValue ? totalValue.toLocaleString() : '•••••'}</b><span>На сумму, с.</span></div>
        <div className="sh-bd-k"><b>{showCost ? totalCost.toLocaleString() : '•••••'}</b><span>Закуп, с.</span></div>
        <div className="sh-bd-k"><b>{groups.length}</b><span>Складов</span></div>
      </div>

      {/* Где и сколько лежит: по складам — прокрутка внутри окна */}
      <div className="sh-bd-scroll">
      {groups.map(g => (
        <div key={g.warehouse?.id || 'none'} className="sh-bd-wh">
          <div className="sh-bd-head">
            <WarehouseIcon className="w-3.5 h-3.5" />
            <strong>{g.warehouse?.name || 'Без склада'}</strong>
            <span className="sh-bd-sp" />
            <span className="sh-bd-chip">{showQty ? `${g.boxes} кор.` : '•••'}</span>
            <span className="sh-bd-chip g">{showValue ? `${g.value.toLocaleString()} с.` : '•••••'}</span>
            <span className="sh-bd-chip b">Продано: {showQty ? g.sold : '•••'}</span>
          </div>

          {g.rows.map(({ p, boxes, sold, value, cost }) => (
            <div
              key={p.id}
              className="sh-bd-row"
              onClick={() => { window.location.href = createPageUrl('ProductDetail') + '?id=' + p.id; }}
            >
              <span className="sh-bd-name">
                <ProductPhoto photoUrl={p.photo_url} brand={p.brand} className="sh-bd-ph" textClassName="text-[8px]" />
                <span>
                  {p.brand} {p.model}
                  <small>{p.color} • {p.product_type}</small>
                </span>
              </span>
              <span className="sh-bd-v">{showQty ? `${boxes} кор.` : '•••'}<small>Остаток</small></span>
              <span className="sh-bd-v">{showValue ? `${value.toLocaleString()} с.` : '•••••'}<small>На сумму</small></span>
              <span className="sh-bd-v">{showCost ? `${cost.toLocaleString()} с.` : '•••••'}<small>Закуп</small></span>
              <span className="sh-bd-v">{showQty ? `${sold} кор.` : '•••'}<small>Продано</small></span>
              <span className="sh-bd-v">{fmtDate(p.created_date)}<small>Создан</small></span>
            </div>
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}