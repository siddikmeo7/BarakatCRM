import React from 'react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { X as XIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Товары всех складов (главный экран раздела)
export default function AllWarehouseProductsTable({
  products = [],
  warehouses = [],
  creators = [],
  can,
  onOpen,
  onReset,
  filtersRow,
  breakdown,
}) {
  return (
    <div className="sh-tbl">
      <div className="sh-tt">
        <h3>Товары всех складов ({products.length})</h3>
        <span className="sh-sp" />
        <button className="sh-btn dg" onClick={onReset}>
          <XIcon className="w-3.5 h-3.5" />
          Сбросить фильтры
        </button>
      </div>

      {filtersRow && <div className="sh-fl">{filtersRow}</div>}

      {breakdown}

      <div className="sh-scroll">
        <div className="sh-scroll-in">
          <div className="sh-th">
            <span className="sh-cap">Товар</span>
            <span className="sh-cap">Склад</span>
            <span className="sh-cap">Тип</span>
            <span className="sh-cap">Коробок</span>
            <span className="sh-cap">Цена</span>
            <span className="sh-cap">Добавил</span>
            <span className="sh-cap">Дата</span>
          </div>

          {products.map(p => {
            const wh = warehouses.find(w => w.id === p.warehouse_id);
            const creator = creators.find(c => c.id === p.created_by_id);
            return (
              <div key={p.id} className="sh-tr" onClick={() => onOpen(p)}>
                <div className="sh-pn">
                  <ProductPhoto photoUrl={p.photo_url} brand={p.brand} className="sh-sw" textClassName="text-[8px]" />
                  <span className="sh-pn-name">{p.brand} {p.model}</span>
                </div>
                <span>{wh?.name || '—'}</span>
                <span>{p.product_type || '—'}</span>
                <span>{p.boxes_in_stock || 0}</span>
                <span>{can('view_stock_value') ? (p.sale_price || 0).toLocaleString() : '•••••'}</span>
                <span>{creator?.name || '—'}</span>
                <span className="sh-dt">{p.created_date ? format(parseISO(p.created_date), 'dd.MM.yyyy') : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {products.length === 0 && (
        <div className="sh-empty">Товары не найдены</div>
      )}
    </div>
  );
}