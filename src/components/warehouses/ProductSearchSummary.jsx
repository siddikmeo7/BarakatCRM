import React, { useMemo } from 'react';
import { Package, TrendingUp, ShoppingCart, Boxes, Warehouse as WarehouseIcon, Layers } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';

// Сводка по найденным товарам: всего коробок было, продано, осталось, по складам и по моделям
export default function ProductSearchSummary({ query, products, sales, warehouses, can }) {
  const q = query.trim().toLowerCase();

  const matched = useMemo(() => {
    if (!q) return [];
    return products.filter(p =>
      p.model?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.product_type?.toLowerCase().includes(q)
    );
  }, [q, products]);

  const matchedIds = useMemo(() => new Set(matched.map(p => p.id)), [matched]);

  // Продажи по найденным товарам (без отменённых)
  const matchedSales = useMemo(
    () => sales.filter(s => matchedIds.has(s.product_id) && !s.is_cancelled),
    [sales, matchedIds]
  );

  // Группировка по складам
  const byWarehouse = useMemo(() => {
    const map = {};
    matched.forEach(p => {
      const key = p.warehouse_id || 'unknown';
      if (!map[key]) map[key] = { warehouse: warehouses.find(w => w.id === p.warehouse_id), products: [], stock: 0, sold: 0 };
      map[key].products.push(p);
      map[key].stock += (p.boxes_in_stock || 0);
    });
    matchedSales.forEach(s => {
      const p = matched.find(mp => mp.id === s.product_id);
      const key = (p?.warehouse_id) || 'unknown';
      if (!map[key]) map[key] = { warehouse: warehouses.find(w => w.id === key), products: [], stock: 0, sold: 0 };
      map[key].sold += (s.boxes_sold || 0);
    });
    return Object.values(map).filter(g => g.products.length > 0 || g.sold > 0);
  }, [matched, matchedSales, warehouses]);

  // Группировка по модели (brand + model)
  const byModel = useMemo(() => {
    const map = {};
    matched.forEach(p => {
      const key = `${p.brand || ''}|${p.model || ''}`;
      if (!map[key]) map[key] = { brand: p.brand, model: p.model, product_type: p.product_type, color: p.color, photo_url: p.photo_url, stock: 0, sold: 0, warehouses: new Set() };
      map[key].stock += (p.boxes_in_stock || 0);
      if (p.warehouse_id) map[key].warehouses.add(p.warehouse_id);
    });
    matchedSales.forEach(s => {
      const p = matched.find(mp => mp.id === s.product_id);
      if (!p) return;
      const key = `${p.brand || ''}|${p.model || ''}`;
      if (!map[key]) return;
      map[key].sold += (s.boxes_sold || 0);
    });
    return Object.values(map).map(g => ({ ...g, warehousesCount: g.warehouses.size }));
  }, [matched, matchedSales]);

  const totalStock = matched.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
  const totalSold = matchedSales.reduce((s, sale) => s + (sale.boxes_sold || 0), 0);
  const totalEver = totalStock + totalSold;

  if (!q) return null;

  return (
    <div className="space-y-4">
      {/* Общая сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Boxes className="w-4 h-4 text-indigo-500" />
            <p className="text-xs text-slate-500 font-medium">Всего было</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{can('view_warehouse_quantities') ? totalEver : '•••'} кор.</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-slate-500 font-medium">Продано</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{can('view_warehouse_quantities') ? totalSold : '•••'} кор.</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-slate-500 font-medium">Сейчас на складах</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{can('view_warehouse_quantities') ? totalStock : '•••'} кор.</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <WarehouseIcon className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-slate-500 font-medium">Складов</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{byWarehouse.length}</p>
        </div>
      </div>

      {/* По складам */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <WarehouseIcon className="w-4 h-4 text-purple-500" /> По складам
        </h4>
        <div className="space-y-2">
          {byWarehouse.map(({ warehouse, stock, sold }) => (
            <div key={warehouse?.id || 'unknown'} className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                  <WarehouseIcon className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="font-medium text-slate-800 text-sm truncate">{warehouse?.name || 'Без склада'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                <span className="text-blue-600 font-semibold">Продано: {sold} кор.</span>
                <span className="text-emerald-600 font-bold">Осталось: {stock} кор.</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* По моделям */}
      {byModel.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" /> По моделям
          </h4>
          <div className="space-y-2">
            {byModel.map((g, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ProductPhoto
                    photoUrl={g.photo_url}
                    brand={g.brand}
                    className="w-9 h-9 rounded-lg flex-shrink-0"
                    placeholderClassName="bg-slate-100"
                    textClassName="text-slate-500 text-[8px]"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{g.brand} {g.model}</p>
                    <p className="text-xs text-slate-400">{g.color} • {g.product_type} • {g.warehousesCount} скл.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <span className="text-indigo-600 font-semibold">Всего: {(g.stock + g.sold)} кор.</span>
                  <span className="text-blue-600 font-semibold">Прод: {g.sold} кор.</span>
                  <span className="text-emerald-600 font-bold">Ост: {g.stock} кор.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}