import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEFAULT_AVATARS } from '@/components/settings/AvatarPicker';
import { getStickerEmoji, getFrameWrapper } from '@/lib/profileStyle';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

/**
 * Детальный просмотр аватара с рамкой и стикером.
 * Фото можно увеличивать/уменьшать и двигать (pan) мышью или пальцем.
 * Открывается по двойному клику на аватар в Настройках.
 */
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function ProfilePhotoZoom({ open, onClose, avatarUrl, name, isAdmin, profileSticker, profileFrame }) {
  const url = avatarUrl || null;
  const displayName = name || '?';
  const { wrapperCls, wrapperStyle } = getFrameWrapper(profileFrame || 'none');
  const stickerEmoji = getStickerEmoji(profileSticker);

  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [moved, setMoved] = useState(false);

  // Сброс при открытии
  useEffect(() => {
    if (open) { setZoom(1); setPos({ x: 0, y: 0 }); setMoved(false); }
  }, [open]);

  const isPhoto = url && !url.startsWith('emoji:');

  const clampPos = (x, y, z) => {
    const range = 80 * (z - 1); // половина контейнера 160px
    return {
      x: Math.max(-range, Math.min(range, x)),
      y: Math.max(-range, Math.min(range, y)),
    };
  };

  const onPointerDown = (e) => {
    if (zoom <= 1) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    setMoved(false);
    (e.target).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPos(p => clampPos(p.x + dx, p.y + dy, zoom));
    setMoved(true);
  };
  const onPointerUp = () => { dragging.current = false; };

  const zoomBy = (delta) => setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(z + delta).toFixed(2))));
  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };

  const renderBig = () => {
    if (url && url.startsWith('emoji:')) {
      const id = url.replace('emoji:', '');
      const av = DEFAULT_AVATARS.find(a => a.id === id);
      if (av) {
        return (
          <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${av.bg} flex items-center justify-center shadow-2xl`}>
            <span style={{ fontSize: '4rem' }}>{av.emoji}</span>
          </div>
        );
      }
    }
    if (isPhoto) {
      return (
        <img
          src={url}
          alt={displayName}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="w-40 h-40 rounded-full object-cover shadow-2xl select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragging.current ? 'none' : 'transform 0.12s ease-out',
            cursor: zoom > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'default',
          }}
        />
      );
    }
    const grad = isAdmin ? 'from-indigo-500 to-purple-500' : 'from-slate-400 to-slate-500';
    return (
      <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shadow-2xl`}>
        <span className="text-white font-bold" style={{ fontSize: '4rem' }}>{displayName?.charAt(0)?.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-6 flex flex-col items-center gap-4">
        <DialogTitle className="sr-only">Фото профиля</DialogTitle>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative inline-flex">
          <div className={wrapperCls} style={wrapperStyle}>
            {renderBig()}
          </div>
          {stickerEmoji && (
            <span className="absolute -bottom-2 -right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 text-lg leading-none">
              {stickerEmoji}
            </span>
          )}
        </div>

        <div className="text-center">
          <p className="font-bold text-slate-900 dark:text-white text-lg">{displayName}</p>
          <p className="text-xs text-slate-400 mt-1">{isPhoto ? 'Двойной клик по фото — приблизить здесь' : 'Двойной клик по аватару — открыть'}</p>
        </div>

        {isPhoto && (
          <div className="flex items-center gap-2 w-full justify-center">
            <Button variant="outline" size="icon" onClick={() => zoomBy(-0.5)} disabled={zoom <= MIN_ZOOM} title="Уменьшить">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => zoomBy(0.5)} disabled={zoom >= MAX_ZOOM} title="Увеличить">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={reset} disabled={zoom === 1 && pos.x === 0 && pos.y === 0} title="Сбросить">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
        {isPhoto && zoom > 1 && !moved && (
          <p className="text-[11px] text-slate-400 -mt-2">Тяните фото, чтобы рассмотреть разные участки</p>
        )}
      </DialogContent>
    </Dialog>
  );
}