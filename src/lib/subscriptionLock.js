import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Режим «только просмотр» при неоплаченной подписке.
 * Владелец бизнеса и сотрудники входят и видят все свои данные,
 * но любые изменения (добавить, изменить, удалить) заблокированы.
 */

const LOCK_EVENT = 'barakatSubscriptionLock';

let lockState = { frozen: false, access: null, isOwner: false };

export function getLockState() {
  return lockState;
}

export function isLocked() {
  return lockState.frozen === true;
}

export function setLockState(next) {
  const merged = { ...lockState, ...next };
  const changed =
    merged.frozen !== lockState.frozen ||
    merged.isOwner !== lockState.isOwner ||
    merged.access !== lockState.access;
  lockState = merged;
  if (changed) window.dispatchEvent(new Event(LOCK_EVENT));
}

export function useSubscriptionLock() {
  const [state, setState] = useState(lockState);
  useEffect(() => {
    const sync = () => setState(lockState);
    window.addEventListener(LOCK_EVENT, sync);
    sync();
    return () => window.removeEventListener(LOCK_EVENT, sync);
  }, []);
  return state;
}

// --- Блокировка изменений на уровне данных ---
const WRITE_METHODS = ['create', 'bulkCreate', 'update', 'bulkUpdate', 'updateMany', 'delete', 'deleteMany'];

// Эти записи нужны самому входу в систему, журналу активности и оплате подписки
const SERVICE_ENTITIES = new Set([
  'DeviceSession',
  'UsageEvent',
  'ActivityLog',
  'SubscriptionEvent',
  'BusinessSubscription',
  'AlifPayment',
  'AlifSubscription',
  'Base44Purchase',
  'AccessGrant',
  'SubscriptionPlan',
]);

function blockWrite(entityName) {
  const error = new Error('Подписка не оплачена — изменения заблокированы');
  error.code = 'SUBSCRIPTION_LOCKED';
  window.dispatchEvent(new CustomEvent('barakatWriteBlocked', { detail: { entity: entityName } }));
  return Promise.reject(error);
}

function wrapEntities(raw) {
  return new Proxy(raw, {
    get(target, entityName) {
      const handler = target[entityName];
      if (typeof entityName !== 'string' || !handler) return handler;
      return new Proxy(handler, {
        get(entityHandler, method) {
          const value = entityHandler[method];
          if (typeof value !== 'function') return value;
          if (WRITE_METHODS.includes(method) && !SERVICE_ENTITIES.has(entityName)) {
            return (...args) => (isLocked() ? blockWrite(entityName) : value.apply(entityHandler, args));
          }
          return value.bind(entityHandler);
        },
      });
    },
  });
}

if (!base44.__entitiesGuarded) {
  base44.entities = wrapEntities(base44.entities);
  base44.__entitiesGuarded = true;
}