/**
 * Помощник для работы с системой прав доступа
 */

export function checkPermission(employee, roleData, permissionKey) {
  if (!employee) return false;

  // Если есть переопределенное разрешение сотрудника, используем его
  if (employee.permissions && employee.permissions[permissionKey] !== undefined) {
    return employee.permissions[permissionKey];
  }

  // Если есть роль, проверяем права в роли
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
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REVENUE: 'view_revenue',
  VIEW_PROFIT: 'view_profit',
  VIEW_STOCK_VALUE: 'view_stock_value',
  VIEW_PURCHASE_PRICE: 'view_purchase_price',

  // Товары
  VIEW_PRODUCTS: 'view_products',
  ADD_PRODUCTS: 'add_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  MOVE_PRODUCTS: 'move_products',
  VIEW_PRODUCTS_COST: 'view_products_cost',

  // Продажи
  VIEW_SALES: 'view_sales',
  ADD_SALES: 'add_sales',
  EDIT_SALES: 'edit_sales',
  CANCEL_SALES: 'cancel_sales',
  MANAGE_DISCOUNTS: 'manage_discounts',
  VIEW_SALE_PROFIT: 'view_sale_profit',
  VIEW_SALE_PURCHASE_PRICE: 'view_sale_purchase_price',

  // Склады
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',
  VIEW_WAREHOUSE_VALUE: 'view_warehouse_value',

  // Клиенты
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',
  DELETE_CUSTOMERS: 'delete_customers',
  VIEW_CUSTOMER_DEBT: 'view_customer_debt',

  // Долги
  VIEW_DEBTS: 'view_debts',
  MANAGE_DEBTS: 'manage_debts',
  ADD_DEBT_MANUAL: 'add_debt_manual',

  // Возвраты
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',

  // Отчёты
  VIEW_REPORTS: 'view_reports',
  VIEW_ACTIVITY_LOG: 'view_activity_log',
  EXPORT_REPORTS: 'export_reports',

  // AI
  VIEW_AI_ASSISTANT: 'view_ai_assistant',

  // Управление
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SETTINGS: 'manage_settings',
};