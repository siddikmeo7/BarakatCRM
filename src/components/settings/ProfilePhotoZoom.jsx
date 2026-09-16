import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DEFAULT_AVATARS } from '@/components/settings/AvatarPicker';
import { getStickerEmoji, getFrameClasses } from '@/lib/profileStyle';

/**
 * Детальный (увеличенный) просмотр аватара профиля с рамкой и стикером.
 * Открывается по двойному клику на аватар в Настройках.
 */
export default function ProfilePhotoZoom({ open, onClose, avatarUrl, name, isAdmin, profileSticker, profileFrame }) {
  const url = avatarUrl || null;
  const displayName = name || '?';
  const { ring, glow } = getFrameClasses(profileFrame || 'none');
  const stickerEmoji = getStickerEmoji(profileSticker);

  const renderBig = () => {
    if (url && url.startsWith('emoji:')) {
      const id = url.replace('emoji:', '');
      const av = DEFAULT_AVATARS.find(a => a.id === id);
      if (av) {
        return (
          <div className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${av.bg} flex items-center justify-center shadow-2xl ${ring} ${glow}`}>
            <span style={{ fontSize: '4rem' }}>{av.emoji}</span>
          </div>
        );
      }
    }
    if (url && !url.startsWith('emoji:')) {
      return <img src={url} alt={displayName} className={`w-40 h-40 rounded-3xl object-cover shadow-2xl ${ring} ${glow}`} />;
    }
    const grad = isAdmin ? 'from-indigo-500 to-purple-500' : 'from-slate-400 to-slate-500';
    return (
      <div className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-2xl ${ring} ${glow}`}>
        <span className="text-white font-bold" style={{ fontSize: '4rem' }}>{displayName?.charAt(0)?.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6 flex flex-col items-center gap-4">
        <DialogTitle className="sr-only">Фото профиля</DialogTitle>
        <div className="relative inline-flex">
          {renderBig()}
          {stickerEmoji && (
            <span className="absolute -bottom-2 -right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 text-lg leading-none">
              {stickerEmoji}
            </span>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-900 dark:text-white text-lg">{displayName}</p>
          <p className="text-xs text-slate-400 mt-1">Двойной клик по фото — увеличить</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}