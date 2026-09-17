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
  size = 'md',
  sizeClass: sizeClassOverride,
  className = '',
}) {
  const url = avatarUrl || employee?.avatar_url || null;
  const displayName = name || employee?.name || '?';
  const admin = isAdmin ?? employee?.is_admin ?? false;
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
  const stickerBadgeSize = size === 'xs' || size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs';

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
      {stickerEmoji && (
        <span
          className={`absolute -bottom-1 -right-1 ${stickerBadgeSize} flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-700 leading-none`}
          style={{ padding: 0 }}
        >
          {stickerEmoji}
        </span>
      )}
    </div>
  );
}