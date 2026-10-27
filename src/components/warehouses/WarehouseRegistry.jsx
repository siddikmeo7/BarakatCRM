import React from 'react';
import { MapPin, Edit2 } from 'lucide-react';
import { warehousePhoto } from '@/lib/warehousePhotos';

// Витрина складов: карточки с фото (вид «Сетка») или строки реестра (вид «Список»).
// Клик по складу открывает его экран ниже — карточка остаётся подсвеченной.
export default function WarehouseRegistry({
  warehouses = [],
  getStats,
  selectedId,
  onSelect,
  onEdit,
  canEdit,
  can,
  view,
  onCreate,
  canCreate,
}) {
  const rows = warehouses.map((w, i) => ({ w, i, s: getStats(w.id) }));
  const allBoxes = rows.reduce((sum, r) => sum + (r.s.totalBoxes || 0), 0);

  if (rows.length === 0) {
    return (
      <div className="sh-reg">
        <div className="sh-empty">
          <p>Склады не найдены</p>
          {canCreate && (
            <button className="sh-btn pri" style={{ marginTop: 12 }} onClick={onCreate}>
              Добавить первый склад
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="sh-reg">
        <div className="h">
          <span className="sh-cap">Склад</span>
          <span className="sh-cap">Товаров · Коробок</span>
        </div>
        <div className="sh-lr hd">
          <span className="sh-cap">Склад</span>
          <span className="sh-cap">Товаров</span>
          <span className="sh-cap">Коробок</span>
          <span className="sh-cap">Стоимость</span>
          <span className="sh-cap">Продано</span>
        </div>
        {rows.map(({ w, s }) => (
          <div
            key={w.id}
            className={`sh-lr ${w.id === selectedId ? 'on' : ''}`}
            onClick={() => onSelect(w)}
          >
            <span className="sh-lr-name">
              <strong>{w.name}</strong>
              {canEdit && (
                <button
                  className="sh-lr-edit"
                  title="Редактировать склад"
                  onClick={e => { e.stopPropagation(); onEdit(w); }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span>{can('view_warehouse_quantities') ? s.productsCount : '•••'}</span>
            <span>{can('view_warehouse_quantities') ? s.totalBoxes : '•••'}</span>
            <span>{can('view_warehouse_value') ? s.totalValue.toLocaleString() : '•••••'}</span>
            <span>{s.soldBoxes}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="sh-grid">
      {rows.map(({ w, i, s }) => {
        const share = allBoxes > 0 ? Math.round(((s.totalBoxes || 0) / allBoxes) * 100) : 0;
        return (
          <div
            key={w.id}
            tabIndex={0}
            className={`sh-card ${w.id === selectedId ? 'on' : ''}`}
            onClick={() => onSelect(w)}
          >
            <div className="sh-ph">
              <img src={warehousePhoto(i)} alt="" />
              {canEdit && (
                <button
                  className="sh-btn sh-ed"
                  onClick={e => { e.stopPropagation(); onEdit(w); }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Редактировать
                </button>
              )}
            </div>
            <div className="sh-cb">
              <h3>{w.name}</h3>
              <div className="ad">
                {w.address
                  ? (<><MapPin style={{ width: 12, height: 12 }} />{w.address}</>)
                  : 'Склад'}
              </div>
              <div className="r">
                <span>Товаров {can('view_warehouse_quantities') ? s.productsCount : '•••'}</span>
                <span>Коробок {can('view_warehouse_quantities') ? s.totalBoxes : '•••'}</span>
              </div>
              <div className="sh-bar">
                <span style={{ width: `${(s.totalBoxes || 0) > 0 ? Math.max(share, 6) : 0}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}