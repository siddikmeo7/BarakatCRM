/**
 * Стили оформления приложения.
 *
 * Стиль — это набор цветов, которые применяются к <html> как CSS-переменные
 * (--sf-*). Поэтому выбранное оформление сразу меняет всё: фон, панели, меню,
 * кнопки, таблицы, графики и терминальные элементы разделов.
 *
 * Выбор хранится в аккаунте пользователя (поле app_style) и дублируется в
 * localStorage, чтобы стиль применялся мгновенно при каждом новом входе.
 */

const STORAGE_KEY = 'barakatcrm_style';
const MODE_KEY = 'barakatcrm_style_mode';
const LEGACY_KEY = 'barakatcrm_theme';
const modeStyleKey = (mode) => `barakatcrm_style_${mode}`;

export const DEFAULT_DARK_STYLE = 'terminal';
export const DEFAULT_LIGHT_STYLE = 'light';

/* ------------------------------------------------------------------ */
/* Стили                                                              */
/* ------------------------------------------------------------------ */

export const APP_STYLES = [
  {
    id: 'terminal',
    name: 'Тёмный терминал',
    hint: 'Прежнее оформление: графит и янтарь',
    mode: 'dark',
    colors: {
      bg: '#0b0e13', chrome: '#0b0e13', panel: '#12161d', deep: '#0f131a', deep2: '#171c25', soft: '#1b212a',
      line: '#232a35', line2: '#1b212a', line3: '#2b333f', mid: '#3b4553',
      text: '#f2f4f8', text2: '#d7dbe2', muted: '#aab2bf', dim: '#7c8594',
      accent: '#f5b23e', onAccent: '#0b0e13', nav: '#f5b23e',
      primary: '#2563eb', onPrimary: '#ffffff',
      pos: '#6ee7b7', posSolid: '#059669',
      neg: '#f87171', negSolid: '#dc2626',
      info: '#7dd3fc', infoSolid: '#2563eb',
      warn: '#f5b23e', onWarn: '#0b0e13',
      charts: ['#f5b23e', '#6ee7b7', '#3b82f6', '#a78bfa', '#f87171'],
    },
  },
  {
    id: 'light',
    name: 'Светлый терминал',
    hint: 'Прежнее оформление в светлых тонах',
    mode: 'light',
    colors: {
      bg: '#f9f9fb', chrome: '#ffffff', panel: '#ffffff', deep: '#f8fafc', deep2: '#f1f5f9', soft: '#e2e8f0',
      line: '#e2e8f0', line2: '#eef1f5', line3: '#cbd5e1', mid: '#94a3b8',
      text: '#0f172a', text2: '#334155', muted: '#64748b', dim: '#94a3b8',
      accent: '#b45309', onAccent: '#ffffff', nav: '#4f46e5',
      primary: '#4f46e5', onPrimary: '#ffffff',
      pos: '#059669', posSolid: '#059669',
      neg: '#dc2626', negSolid: '#dc2626',
      info: '#2563eb', infoSolid: '#2563eb',
      warn: '#b45309', onWarn: '#ffffff',
      charts: ['#4f46e5', '#059669', '#d97706', '#8b5cf6', '#e11d48'],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Вспомогательные функции                                            */
/* ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** '#4f46e5' → '243 75% 59%' (формат токенов темы: hsl(var(--token))) */
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStyle(id) {
  return APP_STYLES.find(s => s.id === id) || APP_STYLES[0];
}

/* ------------------------------------------------------------------ */
/* Текущий стиль                                                      */
/* ------------------------------------------------------------------ */

export function getCachedStyleId() {
  if (typeof localStorage === 'undefined') return DEFAULT_DARK_STYLE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && APP_STYLES.some(s => s.id === saved)) return saved;
    // Перенос старого выбора «тёмная/светлая тема»
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light') return DEFAULT_LIGHT_STYLE;
    if (legacy === 'dark') return DEFAULT_DARK_STYLE;
    const mode = localStorage.getItem(MODE_KEY);
    return mode === 'light' ? DEFAULT_LIGHT_STYLE : DEFAULT_DARK_STYLE;
  } catch (_) {
    return DEFAULT_DARK_STYLE;
  }
}

export function getActiveStyleId() {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-style');
    if (attr && APP_STYLES.some(s => s.id === attr)) return attr;
  }
  return getCachedStyleId();
}

export function getActiveStyle() {
  return getStyle(getActiveStyleId());
}

/* ------------------------------------------------------------------ */
/* Подписка на изменения стиля                                        */
/* ------------------------------------------------------------------ */

let listeners = [];

export function subscribeStyle(listener) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}

function emit(style) {
  listeners.forEach(l => {
    try { l(style); } catch (_) {}
  });
}

/* ------------------------------------------------------------------ */
/* Применение стиля                                                   */
/* ------------------------------------------------------------------ */

export function applyAppStyle(id) {
  const style = getStyle(id);
  if (typeof document === 'undefined') return style;

  const root = document.documentElement;
  const c = style.colors;
  root.classList.toggle('dark', style.mode === 'dark');
  root.setAttribute('data-style', style.id);

  const set = (name, value) => root.style.setProperty(name, value);

  // Поверхности, линии, текст
  set('--sf-bg', c.bg);
  // Шапка и панель меню: в прежнем тёмном оформлении — в цвет холста, в светлом — белые
  set('--sf-chrome', c.chrome || c.panel);
  set('--sf-panel', c.panel);
  set('--sf-deep', c.deep);
  set('--sf-deep2', c.deep2);
  set('--sf-soft', c.soft);
  set('--sf-line', c.line);
  set('--sf-line2', c.line2);
  set('--sf-line3', c.line3);
  set('--sf-mid', c.mid);
  set('--sf-text', c.text);
  set('--sf-text2', c.text2);
  set('--sf-muted', c.muted);
  set('--sf-dim', c.dim);

  // Акцент и смысловые цвета
  set('--sf-accent', c.accent);
  set('--sf-on-accent', c.onAccent);
  // Акцент меню: янтарь в тёмном оформлении, индиго в светлом — как было раньше
  set('--sf-nav', c.nav || c.accent);
  set('--sf-nav-1', rgba(c.nav || c.accent, 0.08));
  set('--sf-primary', c.primary);
  set('--sf-on-primary', c.onPrimary);
  set('--sf-pos', c.pos);
  set('--sf-pos-solid', c.posSolid);
  set('--sf-neg', c.neg);
  set('--sf-neg-solid', c.negSolid);
  set('--sf-info', c.info);
  set('--sf-info-solid', c.infoSolid);
  set('--sf-warn', c.warn);
  set('--sf-on-warn', c.onWarn);

  // Мягкие заливки (плашки, метки, подсветки)
  [['accent', c.accent], ['pos', c.pos], ['neg', c.neg], ['info', c.info], ['warn', c.warn]].forEach(([key, hex]) => {
    set(`--sf-${key}-1`, rgba(hex, 0.08));
    set(`--sf-${key}-2`, rgba(hex, 0.14));
    set(`--sf-${key}-3`, rgba(hex, 0.35));
    set(`--sf-${key}-4`, rgba(hex, 0.55));
  });

  // Токены интерфейса (shadcn): выводятся из палитры стиля
  set('--background', hexToHsl(c.bg));
  set('--foreground', hexToHsl(c.text2));
  set('--card', hexToHsl(c.panel));
  set('--card-foreground', hexToHsl(c.text2));
  set('--popover', hexToHsl(c.panel));
  set('--popover-foreground', hexToHsl(c.text2));
  set('--primary', hexToHsl(c.primary));
  set('--primary-foreground', hexToHsl(c.onPrimary));
  set('--secondary', hexToHsl(c.deep2));
  set('--secondary-foreground', hexToHsl(c.text2));
  set('--muted', hexToHsl(c.deep2));
  set('--muted-foreground', hexToHsl(c.muted));
  set('--accent', hexToHsl(c.deep2));
  set('--accent-foreground', hexToHsl(c.text));
  set('--destructive', hexToHsl(c.negSolid));
  set('--destructive-foreground', hexToHsl('#ffffff'));
  set('--border', hexToHsl(c.line));
  set('--input', hexToHsl(c.line));
  set('--ring', hexToHsl(c.nav || c.accent));
  set('--sidebar-background', hexToHsl(c.bg));
  set('--sidebar-foreground', hexToHsl(c.text2));
  set('--sidebar-primary', hexToHsl(c.nav || c.accent));
  set('--sidebar-primary-foreground', hexToHsl(c.onAccent));
  set('--sidebar-accent', hexToHsl(c.deep2));
  set('--sidebar-accent-foreground', hexToHsl(c.text));
  set('--sidebar-border', hexToHsl(c.line));
  set('--sidebar-ring', hexToHsl(c.nav || c.accent));
  (c.charts || []).forEach((hex, i) => set(`--chart-${i + 1}`, hexToHsl(hex)));

  try {
    localStorage.setItem(STORAGE_KEY, style.id);
    localStorage.setItem(MODE_KEY, style.mode);
    localStorage.setItem(modeStyleKey(style.mode), style.id);
  } catch (_) {}

  emit(style);
  return style;
}

/** Стиль при запуске приложения: сохранённый выбор пользователя на этом устройстве */
export function initAppStyle() {
  return applyAppStyle(getCachedStyleId());
}

/** Быстрое переключение тёмное ↔ светлое: возвращает оформление того же режима, что выбрал пользователь */
export function switchStyleMode(mode) {
  let remembered = null;
  try { remembered = localStorage.getItem(modeStyleKey(mode)); } catch (_) {}
  const fallback = mode === 'dark' ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE;
  const style = getStyle(remembered || fallback);
  return applyAppStyle(style.mode === mode ? style.id : fallback);
}