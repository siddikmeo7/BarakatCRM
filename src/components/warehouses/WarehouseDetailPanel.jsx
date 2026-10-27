import React from 'react';
import WarehouseProductsTable from '@/components/warehouses/WarehouseProductsTable';
import WarehouseProductFilters from '@/components/warehouses/WarehouseProductFilters';
import WarehouseBulkActionBar from '@/components/warehouses/WarehouseBulkActionBar';
import { createPageUrl } from '@/utils';
import { AlertTriangle, AlertCircle, Search, X as XIcon } from 'lucide-react';

// Экран выбранного склада: фото-шапка, действия, показатели, фильтры, товары и массовые действия
export default function WarehouseDetailPanel({
  warehouse,
  stats,
  rows = [],
  warehouseAll = [],
  sales = [],
  business,
  can,
  canBulk,
  IconComponent,
  filters,
  search,
  setSearch,
  hideSoldOut,
  setHideSoldOut,
  selectMode,
  setSelectMode,
  selectedIds = [],
  toggleSelect,
  toggleAll,
  unsoldIds,
  onOpenProduct,
  onBack,
  onMove,
  onDeleteWarehouse,
  onDeleteProduct,
  onDeleteUnsoldWarehouse,
  onDeleteUnsoldAll,
  onCreateBulkEdit,
  onMoveSelected,
  onDeleteSelected,
  onClearSelection,
  photo,
}) {
  const lowLimit = business?.low_stock_limit ?? 2;
  const lowStockCount = warehouseAll.filter(p => (p.boxes_in_stock || 0) <= lowLimit && (p.boxes_in_stock || 0) > 0).length;
  const emptyCount = warehouseAll.filter(p => (p.boxes_in_stock || 0) === 0).length;
  const revenue = sales
    .filter(s => s.warehouse_id === warehouse.id && !s.is_cancelled)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const potentialProfit = stats.totalValue - stats.totalWholesaleValue;

  const maskQty = value => (can('view_warehouse_quantities') ? value : '•••');
  const maskValue = value => (can('view_warehouse_value') ? value : '•••••');

  const filtersRow = (
    <>
      <div className="sh-srch" style={{ width: 280 }}>
        <Search className="w-4 h-4" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Поиск товара на складе «${warehouse.name}»`}
        />
        {search && (
          <button onClick={() => setSearch('')} title="Очистить">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <WarehouseProductFilters {...filters} />
      <button
        className="sh-btn"
        onClick={() => setHideSoldOut(v => !v)}
        title="Скрывать товары с 0 коробок на складе"
      >
        {hideSoldOut ? 'Скрыть распроданные' : 'Показать распроданные'}
      </button>
      {canBulk && (
        <button className="sh-btn" onClick={() => setSelectMode(v => !v)}>
          {selectMode ? 'Отмена выбора' : 'Выбрать'}
        </button>
      )}
    </>
  );

  return (
    <div>
      {/* Фото-шапка склада и действия */}
      <div className="sh-dh">
        <div className="sh-ph">
          <img src={photo} alt="" />
          <div className="sh-ov">
            <div className="sh-ib">
              <IconComponent iconKey={warehouse.icon} className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="sh-cap">Склад</span>
              <h2>{warehouse.name}</h2>
              {warehouse.address && <div className="adr">{warehouse.address}</div>}
            </div>
          </div>
        </div>

        <div className="sh-dacts">
          <button className="sh-btn" onClick={onBack}>Назад</button>
          {can('move_products') && (
            <button className="sh-btn" onClick={onMove}>Переместить товары</button>
          )}
          <button
            className="sh-btn"
            onClick={() => window.location.href = createPageUrl('WarehouseSalesHistory') + '?id=' + warehouse.id}
          >
            История продаж
          </button>
          <button
            className="sh-btn"
            onClick={() => window.location.href = createPageUrl('Products') + '?warehouse=' + warehouse.id}
          >
            Все товары
          </button>
          {can('manage_warehouses') && (
            <button className="sh-btn dg" onClick={onDeleteWarehouse}>Удалить склад</button>
          )}
        </div>
      </div>

      {/* Показатели склада */}
      <div className="sh-dst">
        <div className="sh-k"><span className="sh-cap">Товаров</span><b>{maskQty(stats.productsCount)}</b></div>
        <div className="sh-k"><span className="sh-cap">Коробок</span><b>{maskQty(stats.totalBoxes)}</b></div>
        <div className="sh-k"><span className="sh-cap">Опт. стоимость</span><b>{maskValue(stats.totalWholesaleValue.toLocaleString())}</b></div>
        <div className="sh-k"><span className="sh-cap">Розн. стоимость</span><b>{maskValue(stats.totalValue.toLocaleString())}</b></div>
        <div className="sh-k">
          <span className="sh-cap">Потенц. прибыль</span>
          <b className="sh-pos">{can('view_warehouse_cost') ? `+${potentialProfit.toLocaleString()}` : '•••••'}</b>
        </div>
        <div className="sh-k">
          <span className="sh-cap">Выручка</span>
          <b>{can('view_warehouse_revenue') ? revenue.toLocaleString() : '•••••'}</b>
        </div>
      </div>

      {/* Предупреждения по остаткам */}
      {(lowStockCount > 0 || emptyCount > 0) && (
        <div className="sh-warn">
          {lowStockCount > 0 && (
            <span className="sh-wc y">
              <AlertTriangle className="w-4 h-4" />
              Мало остатков: <strong>{lowStockCount}</strong> товаров
            </span>
          )}
          {emptyCount > 0 && (
            <span className="sh-wc r">
              <AlertCircle className="w-4 h-4" />
              Нет в наличии: <strong>{emptyCount}</strong> товаров
            </span>
          )}
        </div>
      )}

      {/* Товары склада */}
      <div className="sh-block">
        <WarehouseProductsTable
          rows={rows}
          sales={sales}
          business={business}
          can={can}
          canBulk={canBulk}
          selectMode={selectMode}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleAll={toggleAll}
          unsoldIds={unsoldIds}
          dateFilter={filters.dateFilter}
          onOpenProduct={onOpenProduct}
          onDeleteProduct={onDeleteProduct}
          onDeleteUnsoldWarehouse={onDeleteUnsoldWarehouse}
          onDeleteUnsoldAll={onDeleteUnsoldAll}
          filtersRow={filtersRow}
        />
      </div>

      {selectMode && (
        <WarehouseBulkActionBar
          count={selectedIds.length}
          canEdit={can('edit_products')}
          canMove={can('move_products')}
          canDelete={can('delete_products')}
          onEdit={onCreateBulkEdit}
          onMove={onMoveSelected}
          onDelete={onDeleteSelected}
          onClear={onClearSelection}
        />
      )}
    </div>
  );
}