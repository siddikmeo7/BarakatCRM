import { useEffect, useState } from 'react';

/**
 * Оформление интерфейса: тёмный «терминал» (по умолчанию) или светлый вариант.
 * Выбор хранится в браузере, применяется до первой отрисовки и сразу меняет
 * цвета всех разделов, меню, кнопок, таблиц и графиков.
 */

const THEME_KEY = 'barakatcrm_theme';
const LEGACY_KEY = 'barakatcrm_style_mode';

export function getThemeMode() {
  try {
    const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_KEY);
    if (saved === 'light') return 'light';
  } catch (_) {}
  return 'dark';
}

/** Применяет режим ко всему приложению и запоминает выбор. */
export function applyThemeMode(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', next === 'dark');
  }
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('barakatThemeChanged'));
  return next;
}

/** Вызывается до первой отрисовки — чтобы не было «мигания» оформления. */
export function initAppTheme() {
  return applyThemeMode(getThemeMode());
}

export function useAppTheme() {
  const [mode, setMode] = useState(getThemeMode);

  useEffect(() => {
    const onChange = () => setMode(getThemeMode());
    window.addEventListener('barakatThemeChanged', onChange);
    return () => window.removeEventListener('barakatThemeChanged', onChange);
  }, []);

  return {
    mode,
    isDark: mode === 'dark',
    styleId: mode,
    styleName: mode === 'dark' ? 'Тёмное оформление' : 'Светлое оформление',
    colors: tkColors(),
  };
}

/**
 * Цвета терминальных элементов для текущего оформления.
 * accent — выручка/акцент, pos — прибыль, neg — убыток и долг.
 */
export function tkColors() {
  const dark = getThemeMode() === 'dark';
  return dark ? {
    accent: '#f5b23e', pos: '#6ee7b7', neg: '#f87171',
    text: '#f2f4f8', text2: '#d7dbe2', muted: '#aab2bf', dim: '#7c8594',
    line: '#232a35', line2: '#1b212a', panel: '#12161d', deep: '#0f131a', hover: '#171c25',
    onAccent: '#0b0e13',
  } : {
    accent: '#b45309', pos: '#059669', neg: '#dc2626',
    text: '#0f172a', text2: '#334155', muted: '#64748b', dim: '#94a3b8',
    line: '#e2e8f0', line2: '#eef1f5', panel: '#ffffff', deep: '#f8fafc', hover: '#f1f5f9',
    onAccent: '#ffffff',
  };
}