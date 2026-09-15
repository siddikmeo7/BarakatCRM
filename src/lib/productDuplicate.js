/**
 * Находит дубликат товара среди существующих.
 *
 * Дубликат = совпадение 4 основных факторов:
 *  - brand + model (case-insensitive, trim)
 *  - product_type (case-insensitive, trim)
 *  - color (case-insensitive, trim)
 *  - для обычного товара: ТОТ ЖЕ склад (warehouse_id).
 *    Одинаковый товар на РАЗНЫХ складах — НЕ дубликат.
 *  - для реализации (чужой товар): без склада.
 *
 * Размеры, пары/коробка и фото НЕ учитываются.
 *
 * @param {Array} products — все товары (обычные + реализация, с флагом _isConsignment)
 * @param {Object} opts — { brand, model, warehouseId, isConsignment, color, productType, excludeId }
 * @returns {Object|null} найденный дубликат или null
 */
const norm = (s) => String(s ?? '').trim().toLowerCase();

export function findDuplicateProduct(products, opts = {}) {
  const { brand, model, warehouseId, isConsignment, color, productType, excludeId } = opts;
  const b = norm(brand);
  const m = norm(model);
  if (!b || !m) return null;
  const c = norm(color);
  const pt = norm(productType);
  return (products || []).find(p => {
    if (excludeId && p.id === excludeId) return false;
    if (norm(p.brand) !== b) return false;
    if (norm(p.model) !== m) return false;
    // Тип записи (реализация/обычный) должен совпадать
    if (!!p._isConsignment !== !!isConsignment) return false;
    // Цвет
    if (norm(p.color) !== c) return false;
    // Тип товара
    if (norm(p.product_type) !== pt) return false;
    // Обычный товар: тот же склад; реализация — без склада
    if (!isConsignment) {
      if (!warehouseId) return true; // склад не выбран — любой совпадающий
      return String(p.warehouse_id || '') === String(warehouseId);
    }
    return true;
  });
}

/**
 * Ключ дубликата: 4 фактора (бренд + модель + тип + цвет) + склад для обычных товаров.
 * Товары в разных складах — разные ключи. Цены и количество коробок не учитываются.
 */
export function duplicateKey(p) {
  return [
    norm(p.brand),
    norm(p.model),
    norm(p.product_type),
    norm(p.color),
    p._isConsignment ? 'c' : 'o',
    p._isConsignment ? '' : String(p.warehouse_id || '')
  ].join('|');
}

/**
 * Проверяет дубликаты ВНУТРИ списка строк массового добавления
 * (две строки с одинаковыми бренд+модель+тип+цвет+склад).
 * Размеры, пары/коробка и фото НЕ учитываются.
 * @returns {Object|null} { rowIndex, dupIndex } или null
 */
export function findDuplicateInRows(rows) {
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    if (!String(a.brand || '').trim() || !String(a.model || '').trim()) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (!String(b.brand || '').trim() || !String(b.model || '').trim()) continue;
      const sameBrand = String(a.brand).trim().toLowerCase() === String(b.brand).trim().toLowerCase();
      const sameModel = String(a.model).trim().toLowerCase() === String(b.model).trim().toLowerCase();
      const sameWh = String(a.warehouse_id || '') === String(b.warehouse_id || '');
      const sameColor = String(a.color || '').trim().toLowerCase() === String(b.color || '').trim().toLowerCase();
      const sameType = String(a.product_type || '').trim().toLowerCase() === String(b.product_type || '').trim().toLowerCase();
      if (sameBrand && sameModel && sameWh && sameColor && sameType) {
        return { rowIndex: i, dupIndex: j };
      }
    }
  }
  return null;
}