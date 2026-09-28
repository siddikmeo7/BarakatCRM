/**
 * Унифицированное разрешение товара/клиента продажи.
 * Гарантирует, что название, фото и мета купленного товара, а также данные
 * клиента сохраняются в истории продаж даже после удаления карточки товара
 * или клиента. Источник снимка удалённой записи — журнал активности
 * (ActivityLog, action_type='delete'), куда платформа кладёт entity_data.
 */

export const buildDeletedMaps = (productLogs = [], customerLogs = []) => {
  const products = {};
  (productLogs || []).forEach(log => {
    if (log.entity_id && log.entity_data && !products[log.entity_id]) {
      products[log.entity_id] = log.entity_data;
    }
  });
  const customers = {};
  (customerLogs || []).forEach(log => {
    if (log.entity_id && log.entity_data && !customers[log.entity_id]) {
      customers[log.entity_id] = log.entity_data;
    }
  });
  return { products, customers };
};

// Возвращает «товар» продажи: живой продукт, либо снимок удалённого из журнала,
// либо snapshot реализации (ConsignmentSale хранит brand/model прямо в записи).
// Удалённые/неживые товары помечаются _deleted, чтобы UI не пытался менять их остаток.
export const resolveSaleProduct = (sale, products = [], consignmentProducts = [], deletedProductsMap = {}) => {
  if (!sale || !sale.product_id) return null;
  const live = sale._isConsignment
    ? consignmentProducts.find(p => p.id === sale.product_id)
    : products.find(p => p.id === sale.product_id);
  if (live) return live;
  if (sale._isConsignment && (sale.brand || sale.model)) {
    return {
      brand: sale.brand || '',
      model: sale.model || '',
      photo_url: null,
      color: '',
      product_type: '',
      size_from: null,
      size_to: null,
      _deleted: true,
    };
  }
  const snap = deletedProductsMap[sale.product_id];
  return snap ? { ...snap, _deleted: true } : null;
};

// Возвращает «клиента» продажи: живого, либо снимок удалённого из журнала,
// либо fallback из полей самой продажи (customer_name/customer_address).
export const resolveCustomerForSale = (sale, customers = [], deletedCustomersMap = {}) => {
  if (!sale) return null;
  if (sale.customer_id) {
    const live = customers.find(c => c.id === sale.customer_id);
    if (live) return live;
    const snap = deletedCustomersMap[sale.customer_id];
    if (snap) return { ...snap, id: sale.customer_id, _deleted: true };
  }
  return {
    id: sale.customer_id || '',
    name: sale.customer_name || 'Клиент',
    phone: sale.customer_phone || '',
    address: sale.customer_address || '',
    _deleted: true,
  };
};