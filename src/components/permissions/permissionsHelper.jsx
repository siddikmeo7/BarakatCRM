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
  // Аналитика
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_PROFIT: 'view_profit',
  VIEW_STOCK_VALUE: 'view_stock_value',

  // Товары
  VIEW_PRODUCTS: 'view_products',
  ADD_PRODUCTS: 'add_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',

  // Продажи
  VIEW_SALES: 'view_sales',
  ADD_SALES: 'add_sales',
  EDIT_SALES: 'edit_sales',
  CANCEL_SALES: 'cancel_sales',

  // Склады
  VIEW_WAREHOUSES: 'view_warehouses',
  MANAGE_WAREHOUSES: 'manage_warehouses',

  // Клиенты
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',

  // Долги
  VIEW_DEBTS: 'view_debts',
  MANAGE_DEBTS: 'manage_debts',

  // Возвраты
  MANAGE_RETURNS: 'manage_returns',

  // Логи и управление
  VIEW_ACTIVITY_LOG: 'view_activity_log',
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_ROLES: 'manage_roles',
};