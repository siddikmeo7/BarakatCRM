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

  const handleEmojiSelect = (id) => {
    setSelected('emoji:' + id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    if (res.data?.file_url) {
      setSelected(res.data.file_url);
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
    <div className="space-y-4">
      {/* Current preview */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="relative">
          {currentAv ? (
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentAv.bg} flex items-center justify-center shadow-lg`}>
              <span className="text-3xl">{currentAv.emoji}</span>
            </div>
          ) : currentUrl && !isEmoji ? (
            <img src={currentUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg">
              <span className="text-3xl">👤</span>
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Текущая аватарка</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentAv ? currentAv.label : currentUrl && !isEmoji ? 'Своё фото' : 'Не выбрана'}
          </p>
          {selected && selected !== currentAvatar && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Сохранить
            </button>
          )}
        </div>
      </div>

      {/* Animal presets */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Выбрать аватарку</p>
        <div className="grid grid-cols-6 gap-2">
          {DEFAULT_AVATARS.map(av => (
            <button
              key={av.id}
              onClick={() => handleEmojiSelect(av.id)}
              className={`relative aspect-square rounded-xl bg-gradient-to-br ${av.bg} flex items-center justify-center shadow-sm hover:scale-105 transition-transform ${selected === 'emoji:' + av.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              title={av.label}
            >
              <span className="text-xl">{av.emoji}</span>
              {selected === 'emoji:' + av.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Upload own photo */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Или загрузить своё фото</p>
        <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl cursor-pointer transition-all group">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          )}
          <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors font-medium">
            {uploading ? 'Загружается...' : 'Выбрать фото с устройства'}
          </span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}