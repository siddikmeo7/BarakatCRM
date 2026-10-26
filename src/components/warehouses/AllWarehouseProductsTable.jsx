import React from 'react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { X as XIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Товары по фильтру — общий вид раздела (когда конкретный склад не выбран)
export default function AllWarehouseProductsTable({ products = [], warehouses = [], creators = [], can, onOpen, onReset }) {
  return (
    <div className="wh-tbl all">
      <div className="tt">
        <h3>Товары по фильтру ({products.length})</h3>
        <span className="wh-sp" />
        <button className="wh-btn dg" onClick={onReset}>
          <XIcon className="w-3.5 h-3.5" />
          Сбросить фильтры
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[62vh]">
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Склад</th>
              <th>Тип</th>
              <th>Коробок</th>
              <th>Цена</th>
              <th>Добавил</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, index) => {
              const wh = warehouses.find(w => w.id === p.warehouse_id);
              const creator = creators.find(c => c.id === p.created_by_id);
              return (
                <tr
                  key={p.id}
                  style={{ animationDelay: `${Math.min(index, 10) * 0.02}s`, cursor: 'pointer' }}
                  onClick={() => onOpen(p)}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <ProductPhoto photoUrl={p.photo_url} brand={p.brand} className="wh-th" textClassName="text-[8px]" />
                      <span className="wh-pn">{p.brand} {p.model}</span>
                    </div>
                  </td>
                  <td>{wh?.name || '—'}</td>
                  <td>{p.product_type || '—'}</td>
                  <td>{p.boxes_in_stock || 0}</td>
                  <td>{can('view_stock_value') ? (p.sale_price || 0).toLocaleString() : '•••••'}</td>
                  <td>{creator?.name || '—'}</td>
                  <td>{p.created_date ? format(parseISO(p.created_date), 'dd.MM.yyyy') : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-8 text-[12px] text-slate-500">Нет товаров по выбранному фильтру</div>
      )}
    </div>
  );
}