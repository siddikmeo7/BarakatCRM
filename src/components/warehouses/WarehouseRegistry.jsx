import React from 'react';
import { Search, MapPin, Edit2 } from 'lucide-react';

// Левая колонка раздела «Склады»: реестр складов.
// Вид «Сетка» — строки с остатком и полосой заполнения, вид «Список» — компактная таблица.
export default function WarehouseRegistry({
  warehouses = [],
  getStats,
  selectedId,
  onSelect,
  onEdit,
  canEdit,
  can,
  IconComponent,
  search,
  setSearch,
  view,
  onCreate,
  canCreate,
}) {
  const rows = warehouses.map(w => ({ w, s: getStats(w.id) }));
  const totalBoxes = rows.reduce((sum, r) => sum + (r.s.totalBoxes || 0), 0);

  return (
    <div className="wh-reg">
      <div className="h">
        <span className="wh-cap">Склад</span>
        <span className="wh-cap">Товаров · Коробок</span>
      </div>

      {/* Поиск склада по названию */}
      <div className="search">
        <div className="wh-srch full">
          <Search className="w-3.5 h-3.5" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск склада"
          />
        </div>
      </div>

      {view === 'list' ? (
        <div className="wh-list">
          <div className="row">
            <span className="wh-cap">Склад</span>
            <span className="wh-cap">Товаров</span>
            <span className="wh-cap">Коробок</span>
            <span className="wh-cap">Стоимость</span>
            <span className="wh-cap">Продано</span>
          </div>
          {rows.map(({ w, s }) => (
            <div key={w.id} className="wh-entry" onClick={() => onSelect(w)}>
              <strong>{w.name}</strong>
              <span>{can('view_warehouse_quantities') ? s.productsCount : '•••'}</span>
              <span>{can('view_warehouse_quantities') ? s.totalBoxes : '•••'}</span>
              <span>{can('view_warehouse_value') ? s.totalValue.toLocaleString() : '•••••'}</span>
              <span>{s.soldBoxes}</span>
            </div>
          ))}
        </div>
      ) : (
        rows.map(({ w, s }) => {
          const on = w.id === selectedId;
          const share = totalBoxes > 0 ? Math.round(((s.totalBoxes || 0) / totalBoxes) * 100) : 0;
          return (
            <div key={w.id} className={`wh-wh ${on ? 'on' : ''}`} onClick={() => onSelect(w)}>
              <strong>{w.name}</strong>
              {w.address && (
                <small>
                  <MapPin style={{ width: 10, height: 10 }} />
                  {w.address}
                </small>
              )}
              <div className="r">
                <span>Товаров {can('view_warehouse_quantities') ? s.productsCount : '•••'}</span>
                <span>Коробок {can('view_warehouse_quantities') ? s.totalBoxes : '•••'}</span>
              </div>
              <div className="wh-bar">
                <span style={{ width: `${(s.totalBoxes || 0) > 0 ? Math.max(share, 6) : 0}%` }} />
              </div>
              {canEdit && (
                <button
                  className="edit"
                  title="Редактировать склад"
                  onClick={e => { e.stopPropagation(); onEdit(w); }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })
      )}

      {rows.length === 0 && (
        <div className="wh-reg-empty">
          <p>Склады не найдены</p>
          {canCreate && (
            <button className="wh-btn pr" onClick={onCreate}>Добавить первый склад</button>
          )}
        </div>
      )}
    </div>
  );
}