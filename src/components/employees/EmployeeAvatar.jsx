import React from 'react';
import { DEFAULT_AVATARS } from '@/components/settings/AvatarPicker';
import { getStickerEmoji, getFrameWrapper } from '@/lib/profileStyle';

/**
 * Universal employee avatar — shows photo/emoji or initial fallback.
 * ВСЕГДА круглый (как в Instagram), со стикером и рамкой профиля во ВСЕХ разделах.
 * Props: employee (or avatarUrl+name+isAdmin+profileSticker+profileFrame), size, sizeClass, className
 */
export default function EmployeeAvatar({
  employee,
  avatarUrl,
  name,
  isAdmin,
  profileSticker,
  profileFrame,
  deleted,
  size = 'md',
  sizeClass: sizeClassOverride,
  className = '',
}) {
  const url = avatarUrl || employee?.avatar_url || null;
  const displayName = name || employee?.name || '?';
  const admin = isAdmin ?? employee?.is_admin ?? false;
  const isDeleted = deleted ?? !!employee?.deleted_at ?? false;
  const sticker = profileSticker ?? employee?.profile_sticker ?? '';
  const frame = profileFrame ?? employee?.profile_frame ?? 'none';

  const defaultSizeClass =
    size === 'xs' ? 'w-8 h-8 text-xs'
    : size === 'sm' ? 'w-9 h-9 text-sm'
    : size === 'lg' ? 'w-16 h-16 text-2xl'
    : 'w-12 h-12 text-lg';
  // Гарантируем круглую форму — вырезаем любые rounded-* из переопределения и ставим rounded-full.
  const base = (sizeClassOverride || defaultSizeClass).replace(/\brounded-(xl|2xl|3xl|lg|md|sm|full|none)\b/g, '').replace(/\s+/g, ' ').trim();
  const sizeClass = `${base} rounded-full`;

  const emojiFont = size === 'xs' ? '0.9rem' : size === 'sm' ? '1.1rem' : size === 'lg' ? '1.75rem' : '1.5rem';
  const grad = admin ? 'from-indigo-500 to-purple-500' : 'from-slate-400 to-slate-500';
  const { wrapperCls, wrapperStyle } = getFrameWrapper(frame);
  const stickerEmoji = getStickerEmoji(sticker);

  // Размер стикера зависит от реального размера аватара, а не от пропса size —
  // чтобы на маленьких аватарах (w-4/w-5/w-8) стикер не закрывал всё фото.
  // w-<n> в Tailwind = n×4px. Парсим ширину из base.
  const widthMatch = base.match(/\bw-(\d+)\b/);
  const avatarPx = widthMatch ? parseInt(widthMatch[1], 10) * 4 : 48;
  let stickerBadge = null;
  if (avatarPx >= 44) stickerBadge = { cls: 'w-5 h-5 text-xs', pos: '-bottom-1 -right-1' };
  else if (avatarPx >= 36) stickerBadge = { cls: 'w-3.5 h-3.5 text-[9px]', pos: '-bottom-0.5 -right-0.5' };
  else if (avatarPx >= 28) stickerBadge = { cls: 'w-3 h-3 text-[8px]', pos: '-bottom-0.5 -right-0.5' };
  // avatarPx < 28 (w-4/w-5/w-6) — стикер не показываем, слишком мелко

  const renderInner = () => {
    // Emoji avatar
    if (url && url.startsWith('emoji:')) {
      const id = url.replace('emoji:', '');
      const av = DEFAULT_AVATARS.find(a => a.id === id);
      if (av) {
        return (
          <div className={`${sizeClass} bg-gradient-to-br ${av.bg} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <span style={{ fontSize: emojiFont }}>{av.emoji}</span>
          </div>
        );
      }
    }
    // Photo URL avatar — всегда круглый
    if (url && !url.startsWith('emoji:')) {
      return <img src={url} alt={displayName} className={`${sizeClass} object-cover shadow-md flex-shrink-0`} />;
    }
    // Initial fallback — всегда круглый
    return (
      <div className={`${sizeClass} bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <span className="text-white font-bold">{displayName?.charAt(0)?.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div className={wrapperCls} style={wrapperStyle}>
        {renderInner()}
      </div>
      {stickerEmoji && stickerBadge && !isDeleted && (
        <span
          className={`absolute ${stickerBadge.pos} ${stickerBadge.cls} flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-700 leading-none`}
          style={{ padding: 0 }}
        >
          {stickerEmoji}
        </span>
      )}
      {isDeleted && (
        <span
          className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md border border-white dark:border-slate-900 leading-none"
          title="Сотрудник удалён"
          style={{ padding: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><path d="M4 4l16 16M20 4L4 20" strokeLinecap="round"/></svg>
        </span>
      )}
      {isDeleted && (
        <span className="absolute inset-0 rounded-full ring-2 ring-red-500/70 pointer-events-none" />
      )}
    </div>
  );
}