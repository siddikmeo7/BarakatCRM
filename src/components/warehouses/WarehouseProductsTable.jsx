import React, { useState } from 'react';
import ProductPhoto from '@/components/products/ProductPhoto';
import ProductCardGrid from '@/components/warehouses/ProductCardGrid';
import WarehouseViewSwitch from '@/components/warehouses/WarehouseViewSwitch';
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
  filtersRow,
}) {
  const lowLimit = business?.low_stock_limit || 2;
  const [view, setView] = useState('list');

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

  // Колонки строки: полоса, №, товар, коробки, пары, штуки, опт., прибыль, продажа, выбор и удаление
  const columns = selectMode
    ? '5px 36px 2.6fr 1fr 1fr 1fr 1.2fr 1.2fr 1.2fr 40px 40px'
    : '5px 36px 2.6fr 1fr 1fr 1fr 1.2fr 1.2fr 1.2fr 40px';

  return (
    <div className="sh-tbl">
      <div className="sh-tt">
        <h3>Товары на складе</h3>
        <span className="sh-sp" />
        <WarehouseViewSwitch view={view} onChange={setView} />
        {canBulk && (
          <>
            <button className="sh-btn dg" onClick={onDeleteUnsoldWarehouse}>
              <Trash2 className="w-3.5 h-3.5" />
              Удалить непроданные склада
            </button>
            <button className="sh-btn dg" onClick={onDeleteUnsoldAll}>
              <Trash2 className="w-3.5 h-3.5" />
              Удалить непроданные всех складов
            </button>
          </>
        )}
      </div>

      {filtersRow && <div className="sh-fl">{filtersRow}</div>}

      {view === 'list' ? (
      <div className="sh-scroll">
        <div className="sh-scroll-in">
          <div className="sh-dtr h" style={{ gridTemplateColumns: columns }}>
            <span />
            <span className="sh-cap">№</span>
            <span className="sh-cap">Товар</span>
            <span className="sh-cap">Коробок</span>
            <span className="sh-cap">Пар</span>
            <span className="sh-cap">Штук</span>
            <span className="sh-cap">Опт.</span>
            <span className="sh-cap">Прибыль</span>
            <span className="sh-cap">Продажа</span>
            {selectMode && (
              <span style={{ display: 'flex' }}>
                <button onClick={toggleAll} title="Выбрать всё непроданное">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4" style={{ color: '#0f766e' }} />
                    : <Square className="w-4 h-4" style={{ color: '#94a3b8' }} />}
                </button>
              </span>
            )}
            {can('delete_products') && <span />}
          </div>

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
              <div
                key={product.id}
                className="sh-dtr"
                style={{ gridTemplateColumns: columns, cursor: selectMode ? 'default' : 'pointer' }}
                onClick={() => selectMode ? (!isSold && toggleSelect(product.id)) : onOpenProduct(product)}
              >
                <span className="ind" style={{ background: color }} />
                <span>{index + 1}</span>
                <div className="sh-pn">
                  <ProductPhoto
                    photoUrl={product.photo_url}
                    brand={product.brand}
                    className="sh-sw"
                    textClassName="text-[8px]"
                  />
                  <div style={{ minWidth: 0 }}>
                    <span className="sh-pn-name">{product.brand} {product.model}</span>
                    {isSold && <span className="sh-tag y">продавался</span>}
                    {!isSold && lowStock && <span className="sh-tag y">Мало</span>}
                    {noStock && !isSold && <span className="sh-tag r">Нет</span>}
                  </div>
                </div>
                <span>{boxes}</span>
                <span>{pairs}</span>
                <span>{items}</span>
                <span>{can('view_stock_value') ? wholesaleValue.toLocaleString() : '•••••'}</span>
                <span className="sh-pos">{can('view_profit') ? `+${potentialProfit.toLocaleString()}` : '•••••'}</span>
                <span>{can('view_stock_value') ? saleValue.toLocaleString() : '•••••'}</span>
                {selectMode && (
                  <span
                    style={{ display: 'flex' }}
                    onClick={e => { e.stopPropagation(); if (!isSold) toggleSelect(product.id); }}
                  >
                    {isSold
                      ? <span title="Нельзя удалить — товар был продан"><Square className="w-4 h-4" style={{ color: '#cbd5e1' }} /></span>
                      : isSelected
                        ? <CheckSquare className="w-4 h-4" style={{ color: '#0f766e' }} />
                        : <Square className="w-4 h-4" style={{ color: '#94a3b8' }} />}
                  </span>
                )}
                {can('delete_products') && (
                  <span style={{ display: 'flex' }} onClick={e => e.stopPropagation()}>
                    {!isSold && (
                      <button onClick={() => onDeleteProduct(product)} title="Удалить товар">
                        <Trash2 className="w-4 h-4" style={{ color: '#f87171' }} />
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <div className="sh-scroll">
          <ProductCardGrid
            products={rows}
            onOpen={onOpenProduct}
            selectMode={selectMode}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            isSelectable={(p) => !sales.some(s => s.product_id === p.id)}
            emptyText={dateFilter !== 'all' ? 'Нет товаров за выбранный период' : 'На этом складе пока нет товаров'}
            status={(p) => {
              const boxes = p.boxes_in_stock || 0;
              if (boxes === 0) return <span className="sh-tag r">Нет</span>;
              if (boxes <= lowLimit) return <span className="sh-tag y">Мало</span>;
              if (sales.some(s => s.product_id === p.id)) return <span className="sh-tag g">продавался</span>;
              return null;
            }}
            meta={(p) => {
              const boxes = p.boxes_in_stock || 0;
              const pairs = boxes * (p.pairs_per_box || 6);
              const wholesaleValue = boxes * (p.purchase_price || 0);
              const saleValue = boxes * (p.sale_price || 0);
              return (
                <>
                  <span><em>Коробок</em>{boxes}</span>
                  <span><em>Пар</em>{pairs}</span>
                  <span><em>Опт.</em>{can('view_stock_value') ? wholesaleValue.toLocaleString() : '•••••'}</span>
                  <span><em>Продажа</em>{can('view_stock_value') ? saleValue.toLocaleString() : '•••••'}</span>
                </>
              );
            }}
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="sh-tot">
          <span>Товаров {totals.products}</span>
          <span>Коробок {totals.boxes}</span>
          <span>Пар {totals.pairs}</span>
          <span>Штук {totals.items}</span>
          <span>Опт. {can('view_stock_value') ? totals.wholesale.toLocaleString() : '•••••'}</span>
          <span>Прибыль {can('view_profit') ? `+${totals.profit.toLocaleString()}` : '•••••'}</span>
          <span>Продажа {can('view_stock_value') ? totals.retail.toLocaleString() : '•••••'}</span>
        </div>
      )}

      {view === 'list' && rows.length === 0 && (
        <div className="sh-empty">
          {dateFilter !== 'all' ? 'Нет товаров за выбранный период' : 'На этом складе пока нет товаров'}
        </div>
      )}
    </div>
  );
}