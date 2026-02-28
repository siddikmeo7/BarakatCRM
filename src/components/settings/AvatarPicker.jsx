import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Check, Loader2, ChevronDown, Pencil } from 'lucide-react';

const DEFAULT_AVATARS = [
  { id: 'cat', emoji: '🐱', label: 'Кот', bg: 'from-orange-400 to-amber-500' },
  { id: 'dog', emoji: '🐶', label: 'Пёс', bg: 'from-yellow-400 to-orange-400' },
  { id: 'fox', emoji: '🦊', label: 'Лиса', bg: 'from-orange-500 to-red-500' },
  { id: 'bear', emoji: '🐻', label: 'Медведь', bg: 'from-amber-700 to-yellow-700' },
  { id: 'panda', emoji: '🐼', label: 'Панда', bg: 'from-slate-600 to-slate-800' },
  { id: 'lion', emoji: '🦁', label: 'Лев', bg: 'from-yellow-500 to-amber-600' },
  { id: 'tiger', emoji: '🐯', label: 'Тигр', bg: 'from-orange-400 to-red-500' },
  { id: 'wolf', emoji: '🐺', label: 'Волк', bg: 'from-slate-500 to-slate-700' },
  { id: 'rabbit', emoji: '🐰', label: 'Кролик', bg: 'from-pink-300 to-rose-400' },
  { id: 'penguin', emoji: '🐧', label: 'Пингвин', bg: 'from-blue-500 to-indigo-600' },
  { id: 'owl', emoji: '🦉', label: 'Сова', bg: 'from-purple-500 to-violet-600' },
  { id: 'dragon', emoji: '🐲', label: 'Дракон', bg: 'from-green-500 to-emerald-600' },
];

// Avatar is stored as either a URL (custom photo) or an emoji ID like "emoji:cat"
export function getAvatarDisplay(avatarUrl, name) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('emoji:')) {
    const id = avatarUrl.replace('emoji:', '');
    return DEFAULT_AVATARS.find(a => a.id === id) || null;
  }
  return { type: 'url', url: avatarUrl };
}

export function AvatarDisplay({ avatarUrl, name, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-xl' : size === 'lg' ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-2xl';
  const rounded = size === 'sm' ? 'rounded-xl' : 'rounded-2xl';

  if (avatarUrl?.startsWith('emoji:')) {
    const id = avatarUrl.replace('emoji:', '');
    const av = DEFAULT_AVATARS.find(a => a.id === id);
    if (av) {
      return (
        <div className={`${sizeClass} ${rounded} bg-gradient-to-br ${av.bg} flex items-center justify-center shadow-md flex-shrink-0`}>
          <span style={{ fontSize: size === 'sm' ? '1.25rem' : size === 'lg' ? '1.75rem' : '1.5rem' }}>{av.emoji}</span>
        </div>
      );
    }
  }
  if (avatarUrl && !avatarUrl.startsWith('emoji:')) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} ${rounded} object-cover shadow-md flex-shrink-0`} />;
  }
  return null;
}

export default function AvatarPicker({ currentAvatar, onSave }) {
  const [selected, setSelected] = useState(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (id) => {
    setSelected('emoji:' + id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    const url = res?.file_url || res?.data?.file_url;
    if (url) {
      setSelected(url);
      setSaving(true);
      await onSave(url);
      setSaving(false);
      setOpen(false);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!selected || selected === currentAvatar) return;
    setSaving(true);
    await onSave(selected);
    setSaving(false);
  };

  const currentUrl = selected;
  const isEmoji = currentUrl?.startsWith('emoji:');
  const currentEmojiId = isEmoji ? currentUrl.replace('emoji:', '') : null;
  const currentAv = currentEmojiId ? DEFAULT_AVATARS.find(a => a.id === currentEmojiId) : null;

  return (
    <div>
      {/* Collapsed toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <Pencil className="w-4 h-4 text-indigo-500" />
        Изменить аватарку
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          {/* Current preview */}
          <div className="flex items-center gap-3">
            {currentAv ? (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentAv.bg} flex items-center justify-center shadow-sm flex-shrink-0`}>
                <span className="text-lg">{currentAv.emoji}</span>
              </div>
            ) : currentUrl && !isEmoji ? (
              <img src={currentUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-lg">👤</span>
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs text-slate-500">{currentAv ? currentAv.label : currentUrl && !isEmoji ? 'Своё фото' : 'Не выбрана'}</p>
            </div>
            {selected && selected !== currentAvatar && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Сохранить
              </button>
            )}
          </div>

          {/* Animal presets */}
          <div className="grid grid-cols-8 gap-1.5">
            {DEFAULT_AVATARS.map(av => (
              <button
                key={av.id}
                onClick={() => handleEmojiSelect(av.id)}
                className={`relative aspect-square rounded-lg bg-gradient-to-br ${av.bg} flex items-center justify-center hover:scale-105 transition-transform ${selected === 'emoji:' + av.id ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                title={av.label}
              >
                <span className="text-base">{av.emoji}</span>
                {selected === 'emoji:' + av.id && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Upload own photo */}
          <label className="flex items-center gap-2 p-2 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl cursor-pointer transition-all group">
            {uploading ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : <Camera className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />}
            <span className="text-xs text-slate-600 group-hover:text-indigo-600 font-medium">
              {uploading ? 'Загружается...' : 'Загрузить своё фото'}
            </span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}