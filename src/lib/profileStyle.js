/**
 * Профильные стикеры и рамки аватара.
 * Используются во ВСЕХ разделах через EmployeeAvatar.
 */

// Стикеры — эмодзи-бейдж на аватаре
export const PROFILE_STICKERS = [
  { id: 'none',  emoji: '',    label: 'Без стикера' },
  { id: 'fire',  emoji: '🔥',  label: 'Огонь' },
  { id: 'star',  emoji: '⭐',  label: 'Звезда' },
  { id: 'crown', emoji: '👑',  label: 'Корона' },
  { id: 'diamond', emoji: '💎', label: 'Бриллиант' },
  { id: 'rocket', emoji: '🚀', label: 'Ракета' },
  { id: 'trophy', emoji: '🏆', label: 'Кубок' },
  { id: 'bolt',  emoji: '⚡',  label: 'Молния' },
  { id: 'heart', emoji: '❤️', label: 'Сердце' },
  { id: 'check', emoji: '✅',  label: 'Галочка' },
  { id: 'ice',   emoji: '🧊',  label: 'Лёд' },
  { id: 'sun',   emoji: '☀️',  label: 'Солнце' },
];

// Рамки — однотонные + узоры (patterns).
//  · ring/glow — Tailwind-классы для однотонной рамки (кольцо + свечение)
//  · style — React style object для декоративной рамки (узор как круглая обводка вокруг аватара)
export const PROFILE_FRAMES = [
  { id: 'none',    label: 'Без рамки',  ring: '',  glow: '', style: null },
  // Однотонные
  { id: 'gold',    label: 'Золото',      ring: 'ring-2 ring-amber-400',  glow: '',  style: null },
  { id: 'neon',    label: 'Неон',        ring: 'ring-2 ring-fuchsia-500', glow: 'shadow-[0_0_10px_2px_rgba(217,70,239,0.55)]', style: null },
  { id: 'emerald', label: 'Изумруд',     ring: 'ring-2 ring-emerald-500', glow: '',  style: null },
  { id: 'royal',   label: 'Королевская',  ring: 'ring-4 ring-indigo-500/80', glow: '', style: null },
  // Узоры (patterns) — style как React-объект (НЕ строка), иначе React падает на style prop
  { id: 'rainbow', label: 'Радуга',  ring: '', glow: '',
    style: { background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #facc15, #10b981, #06b6d4, #6366f1, #8b5cf6, #ec4899, #f43f5e)' } },
  { id: 'sunset',  label: 'Закат',   ring: '', glow: '',
    style: { background: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)' } },
  { id: 'ocean',   label: 'Океан',    ring: '', glow: '',
    style: { background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)' } },
  { id: 'forest',  label: 'Лес',     ring: '', glow: '',
    style: { background: 'linear-gradient(135deg, #10b981, #059669, #047857)' } },
  { id: 'dotted',  label: 'Точки',   ring: '', glow: '',
    style: { backgroundColor: '#c7d2fe', backgroundImage: 'radial-gradient(circle, #4f46e5 28%, transparent 29%)', backgroundSize: '7px 7px' } },
  { id: 'stripes', label: 'Полоски', ring: '', glow: '',
    style: { background: 'repeating-linear-gradient(45deg, #f59e0b 0 4px, #fbbf24 4px 8px)' } },
  { id: 'stars',   label: 'Звёзды',  ring: '', glow: '',
    style: { backgroundColor: '#1e293b', backgroundImage: 'radial-gradient(circle, #fde047 22%, transparent 23%)', backgroundSize: '11px 11px' } },
  { id: 'hearts',  label: 'Сердца',  ring: '', glow: '',
    style: { backgroundColor: '#ffe4e6', backgroundImage: 'radial-gradient(circle at 50% 50%, #f43f5e 20%, transparent 21%)', backgroundSize: '10px 10px' } },
  { id: 'grid',    label: 'Сетка',   ring: '', glow: '',
    style: { backgroundColor: '#e0f2fe', backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)', backgroundSize: '8px 8px' } },
];

export function getSticker(id) {
  return PROFILE_STICKERS.find(s => s.id === id) || null;
}

export function getStickerEmoji(id) {
  const s = getSticker(id);
  return s ? s.emoji : '';
}

export function getFrame(id) {
  return PROFILE_FRAMES.find(f => f.id === id) || PROFILE_FRAMES[0];
}

export function getFrameClasses(id) {
  const f = getFrame(id);
  return { ring: f.ring || '', glow: f.glow || '' };
}

// Возвращает готовые классы и инлайн-стиль для обёртки-рамки аватара.
// Узоры (style) рисуются как круглая обводка (padding) вокруг круглого аватара.
export function getFrameWrapper(id) {
  const f = getFrame(id);
  if (f.style) {
    return { wrapperCls: 'rounded-full p-[3px]', wrapperStyle: f.style, ring: '', glow: '' };
  }
  const cls = `rounded-full ${f.ring || ''} ${f.glow || ''}`.replace(/\s+/g, ' ').trim();
  return { wrapperCls: cls || 'rounded-full', wrapperStyle: null, ring: f.ring || '', glow: f.glow || '' };
}