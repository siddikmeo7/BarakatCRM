/**
 * Находит дубликат товара среди существующих.
 *
 * Дубликат = совпадение ВСЕХ атрибутов:
 *  - brand + model (case-insensitive, trim)
 *  - color (case-insensitive, trim)
 *  - product_type (case-insensitive, trim)
 *  - size_from + size_to (как числа)
 *  - для обычного товара: ТОТ ЖЕ склад (warehouse_id).
 *    Одинаковый товар на РАЗНЫХ складах — НЕ дубликат.
 *  - для реализации (чужой товар): без склада.
 *
 * Если хотя бы одно поле отличается (например цвет) — это НЕ дубликат,
 * и товар можно добавить.
 *
 * @param {Array} products — все товары (обычные + реализация, с флагом _isConsignment)
 * @param {Object} opts — { brand, model, warehouseId, isConsignment, color, productType, sizeFrom, sizeTo, excludeId }
 * @returns {Object|null} найденный дубликат или null
 */
const norm = (s) => String(s ?? '').trim().toLowerCase();
const normNum = (n) => {
  const v = parseInt(n, 10);
  return Number.isFinite(v) ? String(v) : '';
};

export function findDuplicateProduct(products, opts = {}) {
  const { brand, model, warehouseId, isConsignment, color, productType, sizeFrom, sizeTo, excludeId } = opts;
  const b = norm(brand);
  const m = norm(model);
  if (!b || !m) return null;
  const c = norm(color);
  const pt = norm(productType);
  const sf = normNum(sizeFrom);
  const st = normNum(sizeTo);
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
    // Размеры
    if (normNum(p.size_from) !== sf) return false;
    if (normNum(p.size_to) !== st) return false;
    // Обычный товар: тот же склад; реализация — без склада
    if (!isConsignment) {
      if (!warehouseId) return true; // склад не выбран — любой совпадающий
      return String(p.warehouse_id || '') === String(warehouseId);
    }
    return true;
  });
}

/**
 * Проверяет дубликаты ВНУТРИ списка строк массового добавления
 * (две строки с одинаковыми бренд+модель+цвет+тип+размеры+склад).
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
      const sameSizeFrom = parseInt(a.size_from, 10) === parseInt(b.size_from, 10);
      const sameSizeTo = parseInt(a.size_to, 10) === parseInt(b.size_to, 10);
      if (sameBrand && sameModel && sameWh && sameColor && sameType && sameSizeFrom && sameSizeTo) {
        return { rowIndex: i, dupIndex: j };
      }
    }
  }
  return null;
}