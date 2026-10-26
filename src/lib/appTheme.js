import { useEffect, useState } from 'react';

const readIsDark = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/**
 * Тема оформления приложения: тёмный «терминал» или светлая.
 * Следит за классом на <html>, поэтому переключатель в шапке, переключатель
 * в настройках и начальная загрузка страницы работают одинаково.
 */
export function useAppTheme() {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const sync = () => setIsDark(readIsDark());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { isDark };
}

/**
 * Цвета терминальных элементов для текущей темы.
 * accent — выручка/акцент, pos — прибыль, neg — убыток и долг.
 */
export function tkColors(isDark) {
  return isDark
    ? {
        accent: '#f5b23e',
        pos: '#6ee7b7',
        neg: '#f87171',
        text: '#f2f4f8',
        text2: '#d7dbe2',
        muted: '#7c8594',
        dim: '#4b5563',
        line: '#232a35',
        line2: '#1b212a',
        panel: '#12161d',
        deep: '#0f131a',
        hover: '#171c25',
        onAccent: '#0b0e13',
      }
    : {
        accent: '#d97706',
        pos: '#059669',
        neg: '#dc2626',
        text: '#0f172a',
        text2: '#334155',
        muted: '#64748b',
        dim: '#94a3b8',
        line: '#e2e8f0',
        line2: '#eef1f5',
        panel: '#ffffff',
        deep: '#f8fafc',
        hover: '#f1f5f9',
        onAccent: '#ffffff',
      };
}