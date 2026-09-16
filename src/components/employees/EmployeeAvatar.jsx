import React from 'react';
import { DEFAULT_AVATARS } from '@/components/settings/AvatarPicker';
import { getStickerEmoji, getFrameClasses } from '@/lib/profileStyle';

/**
 * Universal employee avatar — shows photo/emoji or initial fallback.
 * Также отображает стикер и рамку профиля сотрудника во ВСЕХ разделах.
 * Props: employee (or avatarUrl+name+isAdmin+profileSticker+profileFrame), size, className
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
  const sizeClass = sizeClassOverride || (size === 'xs' ? 'w-8 h-8 rounded-lg text-xs' : size === 'sm' ? 'w-9 h-9 rounded-xl text-sm' : size === 'lg' ? 'w-16 h-16 rounded-2xl text-2xl' : 'w-12 h-12 rounded-2xl text-lg');
  const emojiFont = size === 'xs' ? '0.9rem' : size === 'sm' ? '1.1rem' : size === 'lg' ? '1.75rem' : '1.5rem';
  const grad = admin ? 'from-indigo-500 to-purple-500' : 'from-slate-400 to-slate-500';
  const { ring, glow } = getFrameClasses(frame);
  const frameCls = ring || glow ? `${ring} ${glow}` : '';
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
    // Photo URL avatar
    if (url && !url.startsWith('emoji:')) {
      return <img src={url} alt={displayName} className={`${sizeClass} object-cover shadow-md flex-shrink-0`} />;
    }
    // Initial fallback
    return (
      <div className={`${sizeClass} bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <span className="text-white font-bold">{displayName?.charAt(0)?.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div className={frameCls}>
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