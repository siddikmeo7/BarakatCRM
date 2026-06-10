import { useState, useEffect } from 'react';

/**
 * Hook to get current employee info and check permissions.
 * Reacts to Layout's async initialization via a custom event.
 * Owner = null employee = all permissions granted.
 */
export function useEmployeeAccess() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // If already ready when component mounts, trigger a re-render
    if (window.__barakatAccessReady) {
      setTick(n => n + 1);
    }
    const handler = () => setTick(n => n + 1);
    window.addEventListener('barakatAccessReady', handler);
    return () => window.removeEventListener('barakatAccessReady', handler);
  }, []);

  const isReady = window.__barakatAccessReady || false;
  const employee = window.__barakatEmployee || null;
  const business = window.__barakatBusiness || null;
  const isOwner = isReady ? !employee : false;

  const can = (permKey) => {
    if (!isReady) return false; // still loading
    if (!employee) return true; // owner — full access
    if (employee.is_admin) {
      // Admin has all permissions UNLESS explicitly set to false
      const override = employee.permissions?.[permKey];
      if (override === false) return false;
      return true;
    }
    const mergedPerms = window.__barakatMergedPermissions;
    if (mergedPerms && mergedPerms[permKey] !== undefined) return mergedPerms[permKey] === true;
    return employee?.permissions?.[permKey] === true;
  };

  return { employee, business, isOwner, can, isReady };
}