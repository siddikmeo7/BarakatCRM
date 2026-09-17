import React, { useMemo } from 'react';
import { Package, ShoppingCart, Boxes, Warehouse as WarehouseIcon, Layers, DollarSign, Layers3 } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { createPageUrl } from '@/utils';

// Сводка по найденным товарам: верхняя плашка закреплена (sticky), ниже — склады с их товарами
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

  const matchedSales = useMemo(
    () => sales.filter(s => matchedIds.has(s.product_id) && !s.is_cancelled),
    [sales, matchedIds]
  );

  // Группировка по складам (с товарами внутри)
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
    return Object.values(map).filter(g => g.products.length > 0);
  }, [matched, matchedSales, warehouses]);

  const totalStock = matched.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
  const totalSold = matchedSales.reduce((s, sale) => s + (sale.boxes_sold || 0), 0);
  const totalEver = totalStock + totalSold;
  // Общая сумма закупки остатков
  const totalPurchaseValue = matched.reduce((s, p) => s + ((p.boxes_in_stock || 0) * (p.purchase_price || 0)), 0);

  // По моделям: бренд+модель → остаток, продано, закупка остатков
  const byModel = useMemo(() => {
    const map = {};
    matched.forEach(p => {
      const key = `${p.brand || ''}|${p.model || ''}`;
      if (!map[key]) map[key] = { brand: p.brand, model: p.model, product_type: p.product_type, color: p.color, photo_url: p.photo_url, stock: 0, sold: 0, purchase: 0 };
      map[key].stock += (p.boxes_in_stock || 0);
      map[key].purchase += ((p.boxes_in_stock || 0) * (p.purchase_price || 0));
    });
    matchedSales.forEach(s => {
      const p = matched.find(mp => mp.id === s.product_id);
      if (!p) return;
      const key = `${p.brand || ''}|${p.model || ''}`;
      if (!map[key]) return;
      map[key].sold += (s.boxes_sold || 0);
    });
    return Object.values(map);
  }, [matched, matchedSales]);

  if (!q) return null;

  return (
    <div className="space-y-3">
      {/* === Закреплённая верхняя сводка === */}
      <div className="sticky top-0 z-20 bg-white rounded-xl shadow-md border border-indigo-200 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="font-bold text-indigo-700 text-sm">Поиск: «{query}»</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-indigo-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-[11px] text-slate-500 font-medium">Всего было</p>
            </div>
            <p className="text-xl font-bold text-indigo-600">{can('view_warehouse_quantities') ? totalEver : '•••'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] text-slate-500 font-medium">Продано</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{can('view_warehouse_quantities') ? totalSold : '•••'}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[11px] text-slate-500 font-medium">Осталось</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{can('view_warehouse_quantities') ? totalStock : '•••'}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <WarehouseIcon className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-[11px] text-slate-500 font-medium">Складов</p>
            </div>
            <p className="text-xl font-bold text-purple-600">{byWarehouse.length}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <DollarSign className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-[11px] text-slate-500 font-medium">Закупка (остаток)</p>
            </div>
            <p className="text-base font-bold text-orange-600">
              {can('view_warehouse_cost') ? `${totalPurchaseValue.toLocaleString()} с.` : '•••••'}
            </p>
          </div>
        </div>
      </div>

      {/* === По моделям: остаток, продано, закупка === */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5 px-1">
          <Layers3 className="w-4 h-4 text-indigo-500" /> По моделям
        </h4>
        <div className="space-y-2">
          {byModel.map((g, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ProductPhoto
                  photoUrl={g.photo_url}
                  brand={g.brand}
                  className="w-9 h-9 rounded-lg flex-shrink-0"
                  placeholderClassName="bg-slate-100"
                  textClassName="text-slate-500 text-[8px]"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{g.brand} {g.model}</p>
                  <p className="text-xs text-slate-400">{g.color} • {g.product_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs flex-shrink-0">
                <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">Всего: {(g.stock + g.sold)}</span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Прод: {g.sold}</span>
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Ост: {g.stock}</span>
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-bold">
                  {can('view_warehouse_cost') ? `${g.purchase.toLocaleString()} с.` : '•••••'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === Склады с товарами внутри === */}
      <div className="space-y-3">
        {byWarehouse.map(({ warehouse, products: whProds, stock, sold }) => (
          <div key={warehouse?.id || 'unknown'} className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            {/* Заголовок склада */}
            <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <WarehouseIcon className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-semibold text-slate-800 text-sm">{warehouse?.name || 'Без склада'}</span>
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Продано: {sold} кор.</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Осталось: {stock} кор.</span>
              </div>
            </div>
            {/* Товары этого склада */}
            <div className="divide-y divide-slate-50">
              {whProds.map(p => {
                const boxes = p.boxes_in_stock || 0;
                const prodSold = matchedSales.filter(s => s.product_id === p.id).reduce((s, sale) => s + (sale.boxes_sold || 0), 0);
                const noStock = boxes === 0;
                const lowStock = boxes > 0 && boxes <= 3;
                return (
                  <div
                    key={p.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-indigo-50 cursor-pointer group transition-colors"
                    onClick={() => window.location.href = createPageUrl('ProductDetail') + '?id=' + p.id}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductPhoto
                        photoUrl={p.photo_url}
                        brand={p.brand}
                        className="w-9 h-9 rounded-lg flex-shrink-0"
                        placeholderClassName={noStock ? 'bg-red-100' : lowStock ? 'bg-orange-100' : 'bg-slate-100'}
                        textClassName={noStock ? 'text-red-500 text-[8px]' : lowStock ? 'text-orange-500 text-[8px]' : 'text-slate-500 text-[8px]'}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-700 truncate">{p.brand} {p.model}</p>
                        <p className="text-xs text-slate-400">{p.color} • {p.product_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-blue-600 font-medium">Прод: {prodSold}</span>
                      <span className={`font-bold text-sm px-2.5 py-1 rounded-full ${
                        noStock ? 'bg-red-100 text-red-600'
                        : lowStock ? 'bg-orange-100 text-orange-600'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {boxes} кор.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}