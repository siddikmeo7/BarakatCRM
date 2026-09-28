import { base44 } from '@/api/base44Client';

/**
 * Роль «Менеджер» — проверяет все данные, может изменять введённые товары,
 * работает по расчётам и отчётам. Полный просмотр + редактирование данных,
 * но без разрушительных админ-прав (удаление сотрудников/ролей/настроек/данных).
 */
export const MANAGER_PERMISSIONS = {
  // 📊 Дашборд и аналитика — полный просмотр
  view_analytics: true,
  view_revenue: true,
  view_profit: true,
  view_stock_value: true,
  view_purchase_price: true,
  view_employee_analytics: true,

  // 📦 Товары — добавление/редактирование/перемещение/цены; БЕЗ удаления
  view_products: true,
  add_products: true,
  edit_products: true,
  delete_products: false,
  move_products: true,
  view_products_cost: true,
  edit_product_purchase_price: true,
  edit_product_sale_price: true,

  // 🛒 Продажи — полное управление, отмена любых продаж, скидки, прибыль/закупка
  view_sales: true,
  view_own_sales_only: false,
  add_sales: true,
  edit_sales: true,
  cancel_sales: true,
  cancel_any_sale: true,
  manage_discounts: true,
  edit_sale_price: true,
  view_sale_profit: true,
  view_sale_purchase_price: true,
  view_sale_customer: true,

  // 🏢 Склады — просмотр всех метрик + управление
  view_warehouses: true,
  manage_warehouses: true,
  view_warehouse_value: true,
  view_warehouse_revenue: true,
  view_warehouse_cost: true,
  view_warehouse_quantities: true,

  // 👥 Клиенты — управление; БЕЗ удаления
  view_customers: true,
  manage_customers: true,
  delete_customers: false,
  view_customer_debt: true,
  view_customer_contacts: true,

  // 💳 Долги — полное управление
  view_debts: true,
  manage_debts: true,
  add_debt_manual: true,
  send_debt_reminders: true,

  // 💰 Расходы — полный доступ
  view_expenses: true,
  view_all_expenses: true,
  manage_expenses: true,
  record_expenses_on_behalf: true,

  // ↩️ Возвраты — полный доступ
  view_returns: true,
  manage_returns: true,

  // 📋 Отчёты и история — детальные отчёты + экспорт; БЕЗ удаления истории
  view_reports: true,
  view_reports_detailed: true,
  view_activity_log: true,
  export_reports: true,
  export_excel: true,
  delete_activity_log: false,

  // 🤖 AI и уведомления
  view_ai_assistant: true,
  manage_telegram: false,
  send_notifications: true,

  // ⚙️ Настройки — только язык и просмотр; БЕЗ админ-настроек
  view_settings_language: true,
  view_settings_defaults: true,
  manage_settings_defaults: false,
  view_settings_custom: true,
  manage_settings_custom: false,
  view_settings_security: false,
  view_settings_codes: false,
  manage_settings: false,
  manage_employees: false,
  manage_roles: false,
  backup_data: false,
  delete_all_data: false,
};

export const MANAGER_ROLE_NAME = 'Менеджер';
export const MANAGER_ROLE_DESCRIPTION = 'Проверяет все данные, редактирует товары и продажи, работает с расчётами и отчётами. Полный доступ к данным без разрушительных админ-прав.';

/**
 * Создаёт роль «Менеджер» для бизнеса, если её ещё нет.
 * Идемпотентно — безопасно вызывать多次. Проверка по имени (case-insensitive).
 */
export async function ensureManagerRole(businessId) {
  if (!businessId) return;
  try {
    const existing = await base44.entities.Role.filter({ business_id: businessId });
    const hasManager = existing.some(
      r => (r.name || '').trim().toLowerCase() === MANAGER_ROLE_NAME.toLowerCase()
    );
    if (!hasManager) {
      await base44.entities.Role.create({
        business_id: businessId,
        name: MANAGER_ROLE_NAME,
        description: MANAGER_ROLE_DESCRIPTION,
        is_default: false,
        permissions: { ...MANAGER_PERMISSIONS },
      });
    }
  } catch (e) {
    console.error('ensureManagerRole error:', e);
  }
}