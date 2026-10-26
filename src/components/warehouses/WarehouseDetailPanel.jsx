import React from 'react';
import WarehouseProductsTable from '@/components/warehouses/WarehouseProductsTable';
import WarehouseProductFilters from '@/components/warehouses/WarehouseProductFilters';
import WarehouseBulkActionBar from '@/components/warehouses/WarehouseBulkActionBar';
import { createPageUrl } from '@/utils';
import { AlertTriangle, AlertCircle, Search, X as XIcon } from 'lucide-react';

// Фото склада для паспорта (утверждённый макет раздела)
const PASSPORT_IMAGE = 'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/0efb985f4_generated_56924db0.jpg';

// Рабочая область выбранного склада: паспорт, показатели, фильтры, товары и массовые действия
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

  return (
    <div>
      {/* Паспорт склада */}
      <div className="wh-pass">
        <div className="wh-hero">
          <img className="bg" src={PASSPORT_IMAGE} alt="" />
          <div className="wh-ib">
            <IconComponent iconKey={warehouse.icon} className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="wh-cap">Склад</span>
            <h2>{warehouse.name}</h2>
            {warehouse.address && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{warehouse.address}</div>}
          </div>
          <div className="wh-acts">
            <button className="wh-btn" onClick={onBack}>Назад</button>
            {can('move_products') && (
              <button className="wh-btn" onClick={onMove}>Переместить товары</button>
            )}
            <button
              className="wh-btn"
              onClick={() => window.location.href = createPageUrl('WarehouseSalesHistory') + '?id=' + warehouse.id}
            >
              История продаж
            </button>
            <button
              className="wh-btn"
              onClick={() => window.location.href = createPageUrl('Products') + '?warehouse=' + warehouse.id}
            >
              Все товары
            </button>
            {can('manage_warehouses') && (
              <button className="wh-btn dg" onClick={onDeleteWarehouse}>Удалить склад</button>
            )}
          </div>
        </div>

        {/* Показатели склада */}
        <div className="wh-stats">
          <div className="wh-st"><span className="wh-cap">Товаров</span><b>{maskQty(stats.productsCount)}</b></div>
          <div className="wh-st"><span className="wh-cap">Коробок</span><b>{maskQty(stats.totalBoxes)}</b></div>
          <div className="wh-st"><span className="wh-cap">Опт. стоимость</span><b>{maskValue(stats.totalWholesaleValue.toLocaleString())}</b></div>
          <div className="wh-st"><span className="wh-cap">Розн. стоимость</span><b>{maskValue(stats.totalValue.toLocaleString())}</b></div>
          <div className="wh-st">
            <span className="wh-cap">Потенц. прибыль</span>
            <b style={{ color: '#16a34a' }}>{can('view_warehouse_cost') ? `+${potentialProfit.toLocaleString()}` : '•••••'}</b>
          </div>
          <div className="wh-st">
            <span className="wh-cap">Выручка</span>
            <b>{can('view_warehouse_revenue') ? revenue.toLocaleString() : '•••••'}</b>
          </div>
        </div>

        {/* Предупреждения по остаткам */}
        {(lowStockCount > 0 || emptyCount > 0) && (
          <div className="wh-alerts">
            {lowStockCount > 0 && (
              <span className="wh-alert a">
                <AlertTriangle className="w-3.5 h-3.5" />
                Мало остатков: <strong>{lowStockCount}</strong> товаров
              </span>
            )}
            {emptyCount > 0 && (
              <span className="wh-alert rd">
                <AlertCircle className="w-3.5 h-3.5" />
                Нет в наличии: <strong>{emptyCount}</strong> товаров
              </span>
            )}
          </div>
        )}
      </div>

      {/* Панель фильтров: поиск по складу, дата, сотрудник, тип, цена */}
      <div className="wh-filt">
        <div className="wh-srch wide">
          <Search className="w-3.5 h-3.5" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Поиск товара на складе «${warehouse.name}»`}
          />
          {search && (
            <button onClick={() => setSearch('')} title="Очистить">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <WarehouseProductFilters {...filters} />
        <span className="wh-sp" />
        <button
          className="wh-btn"
          onClick={() => setHideSoldOut(v => !v)}
          title="Скрывать товары с 0 коробок на складе"
        >
          {hideSoldOut ? 'Скрыть распроданные' : 'Показать распроданные'}
        </button>
        {canBulk && (
          <button className="wh-btn" onClick={() => setSelectMode(v => !v)}>
            {selectMode ? 'Отмена выбора' : 'Выбрать'}
          </button>
        )}
      </div>

      {/* Товары склада */}
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
      />

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