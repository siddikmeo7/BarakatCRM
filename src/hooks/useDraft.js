import { useCallback, useEffect, useState } from 'react';

/**
 * useDraft — сохраняет состояние формы в localStorage как черновик.
 * Ключ должен быть уникален для формы (передаётся снаружи).
 *
 * Возвращает:
 *  - draft: объект-черновик из localStorage (или null)
 *  - saveDraft(data): сохраняет данные
 *  - clearDraft(): удаляет черновик
 *  - hasDraft: boolean
 */
export function useDraft(key) {
  const storageKey = `barakat_draft_${key}`;

  const [hasDraft, setHasDraft] = useState(() => {
    try { return !!localStorage.getItem(storageKey); } catch { return false; }
  });

  const readDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [storageKey]);

  const saveDraft = useCallback((data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setHasDraft(true);
    } catch (e) {
      console.warn('Не удалось сохранить черновик', e);
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch (e) {
      console.warn('Не удалось удалить черновик', e);
    }
  }, [storageKey]);

  // Следим за появлением/удалением черновика (на случай очистки снаружи)
  useEffect(() => {
    const handler = () => {
      try { setHasDraft(!!localStorage.getItem(storageKey)); } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageKey]);

  return { draft: readDraft(), saveDraft, clearDraft, hasDraft, readDraft };
}