import { useState, useEffect } from 'react';

/**
 * Hook to get current employee info and check permissions.
 * Reacts to Layout's async initialization via a custom event.
 * Owner = null employee = all permissions granted.
 *
 * Безопасность по времени: если событие ready не пришло за 10с —
 * считаем готовым (чтобы страницы не крутились вечно), и выставляем timedOut.
 */
const READY_TIMEOUT_MS = 10000;

export function useEmployeeAccess() {
  const [, setTick] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (window.__barakatAccessReady) {
      setTick(n => n + 1);
    }
    const handler = () => { setTimedOut(false); setTick(n => n + 1); };
    window.addEventListener('barakatAccessReady', handler);

    // Safety: если ready не пришло за 10с — форсируем готовность
    let safety;
    if (!window.__barakatAccessReady) {
      safety = setTimeout(() => {
        if (!window.__barakatAccessReady) {
          window.__barakatAccessReady = true;
          setTimedOut(true);
          setTick(n => n + 1);
        }
      }, READY_TIMEOUT_MS);
    }

    return () => {
      window.removeEventListener('barakatAccessReady', handler);
      if (safety) clearTimeout(safety);
    };
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

  return { employee, business, isOwner, can, isReady, timedOut };
}