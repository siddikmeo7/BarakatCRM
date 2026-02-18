import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper: convert array of objects to CSV string
function toCSV(rows, columns) {
  if (!rows || rows.length === 0) return columns.join(',') + '\n';
  const header = columns.join(',');
  const lines = rows.map(row =>
    columns.map(col => {
      const val = row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

// Build multi-sheet "Excel" as a ZIP of CSVs wrapped in a simple HTML table file
// We'll return a JSON with all sheets as CSV strings, and the frontend will handle download
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    if (!businesses.length) return Response.json({ error: 'No business found' }, { status: 404 });
    const biz = businesses[0];

    const [sales, products, customers, warehouses, returns_, employees, debts] = await Promise.all([
      base44.entities.Sale.filter({ business_id: biz.id }),
      base44.entities.Product.filter({ business_id: biz.id }),
      base44.entities.Customer.filter({ business_id: biz.id }),
      base44.entities.Warehouse.filter({ business_id: biz.id }),
      base44.entities.Return.filter({ business_id: biz.id }),
      base44.entities.Employee.filter({ business_id: biz.id }),
      base44.entities.DebtPayment.filter({ business_id: biz.id }),
    ]);

    // Build product map for names
    const productMap = {};
    products.forEach(p => { productMap[p.id] = `${p.brand} ${p.model}`; });

    const customerMap = {};
    customers.forEach(c => { customerMap[c.id] = c.name; });

    const warehouseMap = {};
    warehouses.forEach(w => { warehouseMap[w.id] = w.name; });

    // Sales sheet
    const salesRows = sales.map(s => ({
      'Дата': s.sale_date ? new Date(s.sale_date).toLocaleDateString('ru-RU') : '',
      'Товар': productMap[s.product_id] || s.product_id || '',
      'Склад': warehouseMap[s.warehouse_id] || '',
      'Коробок': s.boxes_sold || 0,
      'Пар': s.pairs_sold || 0,
      'Цена продажи': s.sale_price || 0,
      'Сумма': s.total_amount || 0,
      'Прибыль': s.profit || 0,
      'Тип': s.is_debt ? 'Долг' : 'Наличные',
      'Клиент': s.customer_name || customerMap[s.customer_id] || '',
      'Статус': s.is_cancelled ? 'Отменена' : 'Активна',
    }));

    // Products / Inventory sheet
    const productsRows = products.map(p => ({
      'Бренд': p.brand || '',
      'Модель': p.model || '',
      'Тип': p.product_type || '',
      'Цвет': p.color || '',
      'Размер от': p.size_from || '',
      'Размер до': p.size_to || '',
      'Пар в коробке': p.pairs_per_box || '',
      'Цена закупки': p.purchase_price || 0,
      'Цена продажи': p.sale_price || 0,
      'Коробок на складе': p.boxes_in_stock || 0,
      'Склад': warehouseMap[p.warehouse_id] || '',
    }));

    // Customers sheet
    const customersRows = customers.map(c => ({
      'Имя': c.name || '',
      'Телефон': c.phone || '',
      'WhatsApp': c.whatsapp || '',
      'Telegram': c.telegram || '',
      'Адрес': c.address || '',
      'Общий долг': c.total_debt || 0,
      'Оплачено': c.total_paid || 0,
    }));

    // Returns sheet
    const returnsRows = returns_.map(r => ({
      'Дата': r.return_date ? new Date(r.return_date).toLocaleDateString('ru-RU') : '',
      'Товар': productMap[r.product_id] || '',
      'Клиент': customerMap[r.customer_id] || '',
      'Склад': warehouseMap[r.warehouse_id] || '',
      'Коробок': r.boxes_returned || 0,
      'Состояние': r.condition || '',
      'Сумма возврата': r.refund_amount || 0,
      'Причина': r.reason || '',
    }));

    // Debt Payments sheet
    const paymentsRows = debts.map(d => ({
      'Дата': d.payment_date ? new Date(d.payment_date).toLocaleDateString('ru-RU') : '',
      'Клиент': customerMap[d.customer_id] || '',
      'Сумма': d.amount || 0,
      'Примечание': d.note || '',
    }));

    // Employees sheet
    const employeesRows = employees.map(e => ({
      'Имя': e.name || '',
      'Email': e.user_email || '',
      'Телефон': e.phone || '',
      'Роль': e.role || '',
      'Статус': e.is_active ? 'Активен' : 'Неактивен',
    }));

    return Response.json({
      success: true,
      business_name: biz.name,
      exported_at: new Date().toISOString(),
      sheets: {
        'Продажи': { rows: salesRows, columns: Object.keys(salesRows[0] || { 'Дата': '' }) },
        'Товары': { rows: productsRows, columns: Object.keys(productsRows[0] || { 'Бренд': '' }) },
        'Клиенты': { rows: customersRows, columns: Object.keys(customersRows[0] || { 'Имя': '' }) },
        'Возвраты': { rows: returnsRows, columns: Object.keys(returnsRows[0] || { 'Дата': '' }) },
        'Оплаты долгов': { rows: paymentsRows, columns: Object.keys(paymentsRows[0] || { 'Дата': '' }) },
        'Сотрудники': { rows: employeesRows, columns: Object.keys(employeesRows[0] || { 'Имя': '' }) },
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});