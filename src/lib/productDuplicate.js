/**
 * Находит дубликат товара среди существующих.
 *
 * Правила:
 *  - Обычный товар: дубликат = тот же бренд + модель + ТОТ ЖЕ склад.
 *    Одинаковый бренд+модель на РАЗНЫХ складах — НЕ дубликат.
 *  - Реализация (чужой товар): дубликат = тот же бренд + модель (без учёта склада,
 *    так как у реализационных товаров нет склада).
 *  - Если склад не указан у обычного товара — любой совпадающий по бренд+модель
 *    считается дубликатом (нельзя гарантировать уникальность).
 *
 * Сравнение бренд/модель — case-insensitive, с trim().
 *
 * @param {Array} products — все товары (обычные + реализация, с флагом _isConsignment)
 * @param {Object} opts — { brand, model, warehouseId, isConsignment, excludeId }
 * @returns {Object|null} найденный дубликат или null
 */
export function findDuplicateProduct(products, { brand, model, warehouseId, isConsignment, excludeId }) {
  const b = String(brand || '').trim().toLowerCase();
  const m = String(model || '').trim().toLowerCase();
  if (!b || !m) return null;
  return (products || []).find(p => {
    if (excludeId && p.id === excludeId) return false;
    if (String(p.brand || '').trim().toLowerCase() !== b) return false;
    if (String(p.model || '').trim().toLowerCase() !== m) return false;
    // Реализация: дубликат по бренд+модель среди реализационных товаров
    if (isConsignment || p._isConsignment) {
      return !!p._isConsignment === !!isConsignment;
    }
    // Обычный товар: тот же склад; если склад не выбран — любой совпадающий
    if (!warehouseId) return true;
    return String(p.warehouse_id || '') === String(warehouseId);
  });
}

/**
 * Проверяет дубликаты ВНУТРИ списка строк массового добавления
 * (две строки с одинаковыми бренд+модель+склад).
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
      if (sameBrand && sameModel && sameWh) {
        return { rowIndex: i, dupIndex: j };
      }
    }
  }
  return null;
}