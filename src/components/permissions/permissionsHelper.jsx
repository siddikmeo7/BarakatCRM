/**
 * Помощник для работы с системой прав доступа
 */

export function checkPermission(employee, roleData, permissionKey) {
  if (!employee) return false;
  if (employee.permissions && employee.permissions[permissionKey] !== undefined) {
    return employee.permissions[permissionKey];
  }
  if (roleData && roleData.permissions) {
    return roleData.permissions[permissionKey] || false;
  }
  return false;
}

export function mergePermissions(rolePermissions, employeeOverrides) {
  if (!rolePermissions) return employeeOverrides || {};
  if (!employeeOverrides) return rolePermissions;
  return {
    ...rolePermissions,
    ...Object.fromEntries(
      Object.entries(employeeOverrides).filter(([_, v]) => v !== undefined)
    ),
  };
}

export const PERMISSIONS = {
  // Главная / Аналитика
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REVENUE: 'view_revenue',
  VIEW_PROFIT: 'view_profit',
  VIEW_STOCK_VALUE: 'view_stock_value',
  VIEW_PURCHASE_PRICE: 'view_purchase_price',
  VIEW_EMPLOYEE_ANALYTICS: 'view_employee_analytics',

  // Товары
  VIEW_PRODUCTS: 'view_products',
  ADD_PRODUCTS: 'add_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  MOVE_PRODUCTS: 'move_products',
  VIEW_PRODUCTS_COST: 'view_products_cost',
  EDIT_PRODUCT_PURCHASE_PRICE: 'edit_product_purchase_price',
  EDIT_PRODUCT_SALE_PRICE: 'edit_product_sale_price',

  // Продажи
  VIEW_SALES: 'view_sales',
  VIEW_OWN_SALES_ONLY: 'view_own_sales_only',
  ADD_SALES: 'add_sales',
  EDIT_SALES: 'edit_sales',
  CANCEL_SALES: 'cancel_sales',
  CANCEL_ANY_SALE: 'cancel_any_sale',
  MANAGE_DISCOUNTS: 'manage_discounts',
  EDIT_SALE_PRICE: 'edit_sale_price',
  VIEW_SALE_PROFIT: 'view_sale_profit',
  VIEW_SALE_PURCHASE_PRICE: 'view_sale_purchase_price',
  VIEW_SALE_CUSTOMER: 'view_sale_customer',

  // Склады
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',
  VIEW_WAREHOUSE_VALUE: 'view_warehouse_value',
  VIEW_WAREHOUSE_REVENUE: 'view_warehouse_revenue',
  VIEW_WAREHOUSE_COST: 'view_warehouse_cost',
  VIEW_WAREHOUSE_QUANTITIES: 'view_warehouse_quantities',

  // Клиенты
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',
  DELETE_CUSTOMERS: 'delete_customers',
  VIEW_CUSTOMER_DEBT: 'view_customer_debt',
  VIEW_CUSTOMER_CONTACTS: 'view_customer_contacts',

  // Долги
  VIEW_DEBTS: 'view_debts',
  MANAGE_DEBTS: 'manage_debts',
  ADD_DEBT_MANUAL: 'add_debt_manual',
  SEND_DEBT_REMINDERS: 'send_debt_reminders',

  // Расходы
  VIEW_EXPENSES: 'view_expenses',
  VIEW_ALL_EXPENSES: 'view_all_expenses',
  MANAGE_EXPENSES: 'manage_expenses',
  RECORD_EXPENSES_ON_BEHALF: 'record_expenses_on_behalf',
  VIEW_EXPENSE_SALES_REVENUE: 'view_expense_sales_revenue',
  VIEW_EXPENSE_MONEY_IN_HAND: 'view_expense_money_in_hand',

  // Возвраты
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',

  // Отчёты
  VIEW_REPORTS: 'view_reports',
  VIEW_REPORTS_DETAILED: 'view_reports_detailed',
  VIEW_ACTIVITY_LOG: 'view_activity_log',
  EXPORT_REPORTS: 'export_reports',
  EXPORT_EXCEL: 'export_excel',
  DELETE_ACTIVITY_LOG: 'delete_activity_log',
  RESTORE_ACTIVITY_LOG: 'restore_activity_log',

  // AI
  VIEW_AI_ASSISTANT: 'view_ai_assistant',

  // Уведомления
  MANAGE_TELEGRAM: 'manage_telegram',
  SEND_NOTIFICATIONS: 'send_notifications',

  // Управление
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',
  VIEW_SETTINGS_CODES: 'view_settings_codes',
  BACKUP_DATA: 'backup_data',
  DELETE_ALL_DATA: 'delete_all_data',

  // Зарплата
  VIEW_SALARY: 'view_salary',
  MANAGE_SALARY: 'manage_salary',
};