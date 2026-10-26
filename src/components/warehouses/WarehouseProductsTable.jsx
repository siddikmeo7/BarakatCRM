import React from 'react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

// Таблица товаров склада: полоса остатка слева, метки состояния, зебра и липкие итоги
export default function WarehouseProductsTable({
  rows = [],
  sales = [],
  business,
  can,
  canBulk,
  selectMode,
  selectedIds = [],
  toggleSelect,
  toggleAll,
  unsoldIds,
  dateFilter,
  onOpenProduct,
  onDeleteProduct,
  onDeleteUnsoldWarehouse,
  onDeleteUnsoldAll,
}) {
  const lowLimit = business?.low_stock_limit || 2;

  const totals = rows.reduce((acc, p) => {
    const boxes = p.boxes_in_stock || 0;
    const pairs = boxes * (p.pairs_per_box || 6);
    acc.products += 1;
    acc.boxes += boxes;
    acc.pairs += pairs;
    acc.items += pairs * 2;
    acc.wholesale += boxes * (p.purchase_price || 0);
    acc.retail += boxes * (p.sale_price || 0);
    return acc;
  }, { products: 0, boxes: 0, pairs: 0, items: 0, wholesale: 0, retail: 0 });
  totals.profit = totals.retail - totals.wholesale;

  const unsoldList = unsoldIds(rows);
  const allSelected = unsoldList.length > 0 && unsoldList.every(id => selectedIds.includes(id));

  return (
    <div className="wh-tbl">
      <div className="tt">
        <h3>Товары на складе</h3>
        <span className="wh-sp" />
        {canBulk && (
          <>
            <button className="wh-btn dg" onClick={onDeleteUnsoldWarehouse}>
              <Trash2 className="w-3.5 h-3.5" />
              Удалить непроданные склада
            </button>
            <button className="wh-btn dg" onClick={onDeleteUnsoldAll}>
              <Trash2 className="w-3.5 h-3.5" />
              Удалить непроданные всех складов
            </button>
          </>
        )}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[62vh]">
        <table>
          <thead>
            <tr>
              <th className="wh-ind" />
              <th style={{ width: 40 }}>№</th>
              <th>Товар</th>
              <th>Коробок</th>
              <th>Пар</th>
              <th>Штук</th>
              <th>Опт.</th>
              <th>Прибыль</th>
              <th>Продажа</th>
              {selectMode && (
                <th style={{ width: 40 }}>
                  <button onClick={toggleAll} title="Выбрать всё непроданное">
                    {allSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                </th>
              )}
              {can('delete_products') && <th style={{ width: 40 }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((product, index) => {
              const boxes = product.boxes_in_stock || 0;
              const pairs = boxes * (product.pairs_per_box || 6);
              const items = pairs * 2;
              const wholesaleValue = boxes * (product.purchase_price || 0);
              const saleValue = boxes * (product.sale_price || 0);
              const potentialProfit = saleValue - wholesaleValue;
              const noStock = boxes === 0;
              const lowStock = boxes > 0 && boxes <= lowLimit;
              const isSold = sales.some(s => s.product_id === product.id);
              const isSelected = selectedIds.includes(product.id);

              const color = noStock
                ? '#dc2626'
                : (lowStock && !isSold)
                  ? '#f59e0b'
                  : isSold ? '#10b981' : '#94a3b8';

              return (
                <tr
                  key={product.id}
                  style={{ '--c': color, animationDelay: `${Math.min(index, 10) * 0.02}s`, cursor: selectMode ? 'default' : 'pointer' }}
                  onClick={() => selectMode ? (!isSold && toggleSelect(product.id)) : onOpenProduct(product)}
                >
                  <td className="wh-ind" />
                  <td>{index + 1}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <ProductPhoto
                        photoUrl={product.photo_url}
                        brand={product.brand}
                        className="wh-th"
                        textClassName="text-[8px]"
                      />
                      <div>
                        <span className="wh-pn">{product.brand} {product.model}</span>
                        {isSold && <span className="wh-tag a">продавался</span>}
                        {!isSold && lowStock && <span className="wh-tag a">Мало</span>}
                        {noStock && !isSold && <span className="wh-tag rd">Нет</span>}
                      </div>
                    </div>
                  </td>
                  <td>{boxes}</td>
                  <td>{pairs}</td>
                  <td>{items}</td>
                  <td>{can('view_stock_value') ? wholesaleValue.toLocaleString() : '•••••'}</td>
                  <td className="wh-pos">{can('view_profit') ? `+${potentialProfit.toLocaleString()}` : '•••••'}</td>
                  <td>{can('view_stock_value') ? saleValue.toLocaleString() : '•••••'}</td>
                  {selectMode && (
                    <td onClick={e => { e.stopPropagation(); if (!isSold) toggleSelect(product.id); }}>
                      {isSold
                        ? <span title="Нельзя удалить — товар был продан"><Square className="w-4 h-4 text-slate-300" /></span>
                        : isSelected
                          ? <CheckSquare className="w-4 h-4 text-blue-600" />
                          : <Square className="w-4 h-4 text-slate-400" />}
                    </td>
                  )}
                  {can('delete_products') && (
                    <td onClick={e => e.stopPropagation()}>
                      {!isSold && (
                        <button onClick={() => onDeleteProduct(product)} title="Удалить товар">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td />
                <td />
                <td>Товаров {totals.products}</td>
                <td>{totals.boxes}</td>
                <td>{totals.pairs}</td>
                <td>{totals.items}</td>
                <td>{can('view_stock_value') ? totals.wholesale.toLocaleString() : '•••••'}</td>
                <td>{can('view_profit') ? `+${totals.profit.toLocaleString()}` : '•••••'}</td>
                <td>{can('view_stock_value') ? totals.retail.toLocaleString() : '•••••'}</td>
                {selectMode && <td />}
                {can('delete_products') && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-[12px] text-slate-500">
          {dateFilter !== 'all' ? 'Нет товаров за выбранный период' : 'На этом складе пока нет товаров'}
        </div>
      )}
    </div>
  );
}