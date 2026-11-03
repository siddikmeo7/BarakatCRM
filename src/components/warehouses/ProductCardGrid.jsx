import React from 'react';
import ProductPhoto from '@/components/products/ProductPhoto';

/**
 * Карточки товаров — представление «Сетка» для списков товаров склада и поиска.
 * meta(p) — показатели под названием, status(p) — метка состояния поверх фото.
 */
export default function ProductCardGrid({
  products = [],
  onOpen,
  meta,
  status,
  selectMode,
  selectedIds = [],
  toggleSelect,
  isSelectable,
  emptyText,
}) {
  if (products.length === 0) {
    return <div className="sh-empty">{emptyText || 'Товары не найдены'}</div>;
  }

  return (
    <div className="sh-pgrid">
      {products.map(p => {
        const selectable = isSelectable ? isSelectable(p) : true;
        const selected = selectedIds.includes(p.id);

        return (
          <div
            key={p.id}
            className={`sh-pcard${selected ? ' on' : ''}${selectMode && !selectable ? ' off' : ''}`}
            onClick={() => {
              if (selectMode) {
                if (selectable) toggleSelect?.(p.id);
              } else {
                onOpen?.(p);
              }
            }}
          >
            <div className="sh-pcard-ph">
              <ProductPhoto
                photoUrl={p.photo_url}
                brand={p.brand}
                className="w-full h-full"
                textClassName="text-[10px]"
              />
              {selectMode && selectable && (
                <span className={`sh-pcard-cb${selected ? ' on' : ''}`}>{selected ? '✓' : ''}</span>
              )}
              {status && <span className="sh-pcard-st">{status(p)}</span>}
            </div>

            <div className="sh-pcard-b">
              <p className="sh-pcard-n">{p.brand} {p.model}</p>
              <p className="sh-pcard-s">
                {[p.color, p.product_type].filter(Boolean).join(' • ') || '—'}
              </p>
              {meta && <div className="sh-pcard-m">{meta(p)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}