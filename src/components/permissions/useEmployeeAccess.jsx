/**
 * Hook to get current employee info and check permissions.
 * Owner = null employee = all permissions granted.
 */
export function useEmployeeAccess() {
  const employee = window.__barakatEmployee || null;
  const business = window.__barakatBusiness || null;
  const isOwner = !employee;

  const can = (permKey) => {
    if (isOwner) return true;
    if (employee?.is_admin) return true; // администратор — полный доступ как у владельца
    return !!(employee?.permissions?.[permKey]);
  };

  return { employee, business, isOwner, can };
}