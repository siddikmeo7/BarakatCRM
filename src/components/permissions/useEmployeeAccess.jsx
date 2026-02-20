import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let cachedAccess = null;
let cacheTime = 0;

/**
 * Хук для получения прав доступа текущего пользователя.
 * Если пользователь — владелец бизнеса или не найден как сотрудник — возвращает полный доступ.
 * Если пользователь — сотрудник — возвращает его права.
 */
export function useEmployeeAccess() {
  const [access, setAccess] = useState(null); // null = loading
  const [isOwner, setIsOwner] = useState(false);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    // Кэш на 60 секунд
    if (cachedAccess && Date.now() - cacheTime < 60000) {
      setAccess(cachedAccess.permissions);
      setIsOwner(cachedAccess.isOwner);
      setEmployee(cachedAccess.employee);
      return;
    }
    loadAccess();
  }, []);

  const loadAccess = async () => {
    try {
      const user = await base44.auth.me();

      // Проверяем — является ли владельцем какого-либо бизнеса
      const ownedBiz = await base44.entities.Business.filter({ owner_email: user.email });
      if (ownedBiz.length > 0) {
        const fullAccess = { isOwner: true, permissions: null, employee: null };
        cachedAccess = fullAccess;
        cacheTime = Date.now();
        setIsOwner(true);
        setAccess(null); // null = полный доступ
        setEmployee(null);
        return;
      }

      // Проверяем — является ли сотрудником
      const employees = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
      if (employees.length > 0) {
        const emp = employees[0];
        const perms = emp.permissions || {};
        cachedAccess = { isOwner: false, permissions: perms, employee: emp };
        cacheTime = Date.now();
        setIsOwner(false);
        setAccess(perms);
        setEmployee(emp);
      } else {
        // Пользователь не найден ни как владелец, ни как сотрудник — полный доступ (новый пользователь)
        cachedAccess = { isOwner: true, permissions: null, employee: null };
        cacheTime = Date.now();
        setIsOwner(true);
        setAccess(null);
        setEmployee(null);
      }
    } catch (e) {
      // При ошибке — полный доступ
      setIsOwner(true);
      setAccess(null);
    }
  };

  /**
   * Проверка конкретного права. Если владелец — всегда true.
   */
  const can = (permissionKey) => {
    if (isOwner || access === null) return true;
    return !!access[permissionKey];
  };

  return { can, isOwner, employee, loading: access === undefined };
}

export function clearAccessCache() {
  cachedAccess = null;
  cacheTime = 0;
}