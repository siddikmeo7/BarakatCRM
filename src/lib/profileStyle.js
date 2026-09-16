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

// Рамки — до 5 вариантов. frame.style = inline CSS для ring/border
export const PROFILE_FRAMES = [
  { id: 'none',   label: 'Без рамки',   ring: '',                                                          glow: '' },
  { id: 'gold',   label: 'Золотая',      ring: 'ring-2 ring-amber-400',                                     glow: 'shadow-[0_0_0_3px_rgba(251,191,36,0.35)]' },
  { id: 'neon',   label: 'Неон',         ring: 'ring-2 ring-fuchsia-500',                                   glow: 'shadow-[0_0_10px_2px_rgba(217,70,239,0.55)]' },
  { id: 'emerald',label: 'Изумруд',      ring: 'ring-2 ring-emerald-500',                                  glow: 'shadow-[0_0_0_3px_rgba(16,185,129,0.35)]' },
  { id: 'royal',  label: 'Королевская',  ring: 'ring-4 ring-indigo-500/80',                                glow: 'shadow-[0_0_12px_3px_rgba(99,102,241,0.5)]' },
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