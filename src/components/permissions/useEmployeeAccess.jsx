import { useState, useEffect } from 'react';

/**
 * Hook to get current employee info and check permissions.
 * Reacts to Layout's async initialization via a custom event.
 * Owner = null employee = all permissions granted.
 */
export function useEmployeeAccess() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('barakatAccessReady', handler);
    return () => window.removeEventListener('barakatAccessReady', handler);
  }, []);

  const employee = window.__barakatEmployee || null;
  const business = window.__barakatBusiness || null;
  const isOwner = window.__barakatAccessReady ? !employee : false; // wait until ready

  const can = (permKey) => {
    if (!window.__barakatAccessReady) return false; // still loading
    if (!employee) return true; // owner
    if (employee?.is_admin) return true;
    const mergedPerms = window.__barakatMergedPermissions;
    if (mergedPerms) return !!(mergedPerms[permKey]);
    return !!(employee?.permissions?.[permKey]);
  };

  return { employee, business, isOwner, can };
}