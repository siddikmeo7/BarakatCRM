import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Mail, Phone, Bell, Globe, Save, Loader2, CheckCircle,
  LogOut, Camera, Shield, MessageCircle, BellOff, Moon, Sun,
  Smartphone, Monitor, Clock, Key
} from 'lucide-react';

const LANGUAGES = [
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'tj', label: '🇹🇯 Тоҷикӣ' },
  { value: 'en', label: '🇬🇧 English' },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    whatsapp_notifications: true,
    push_notifications: true,
    debt_alerts: true,
    low_stock_alerts: true,
  });

  const [appSettings, setAppSettings] = useState({
    language: 'ru',
    theme: 'light',
    compact_mode: false,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      setProfile({
        full_name: u.full_name || '',
        phone: u.phone || '',
      });
      setNotifications({
        email_notifications: u.email_notifications !== false,
        whatsapp_notifications: u.whatsapp_notifications !== false,
        push_notifications: u.push_notifications !== false,
        debt_alerts: u.debt_alerts !== false,
        low_stock_alerts: u.low_stock_alerts !== false,
      });
      setAppSettings({
        language: u.language || 'ru',
        theme: u.theme || 'light',
        compact_mode: u.compact_mode === true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        ...notifications,
        ...appSettings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res?.file_url) {
        await base44.auth.updateMe({ avatar_url: res.file_url });
        await loadUser();
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Выйти из аккаунта?')) {
      base44.auth.logout();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    || user?.email?.charAt(0).toUpperCase();

  const emp = window.__barakatEmployee;
  const roleLabel = !emp ? { label: 'Владелец', color: 'bg-indigo-100 text-indigo-700', icon: '👑' }
    : emp.is_admin ? { label: 'Администратор', color: 'bg-emerald-100 text-emerald-700', icon: '🛡️' }
    : { label: 'Сотрудник', color: 'bg-slate-100 text-slate-600', icon: '👤' };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Профиль</h1>
        <p className="text-sm text-slate-500 mt-0.5">Управление личными данными и настройками</p>
      </div>

      {/* Avatar + Basic Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">{initials}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-700 transition-colors">
              {avatarUploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 truncate">{user?.full_name || 'Пользователь'}</h2>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{user?.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${roleLabel.color}`}>
                {roleLabel.icon} {roleLabel.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-xs text-slate-400">В системе с</p>
                <p className="text-sm font-semibold text-slate-700">
                  {user?.created_date ? format(new Date(user.created_date), 'dd.MM.yyyy') : '—'}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-xs text-slate-400">Дней активности</p>
                <p className="text-sm font-bold text-indigo-600">
                  {user?.created_date ? Math.floor((Date.now() - new Date(user.created_date)) / 86400000) : 0}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Онлайн</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal fields */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-1.5 text-slate-600 mb-1.5">
              <User className="w-3.5 h-3.5" /> Имя
            </Label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Ваше имя"
              disabled
              className="bg-slate-50"
            />
            <p className="text-xs text-slate-400 mt-1">Имя изменяется через аккаунт</p>
          </div>
          <div>
            <Label className="flex items-center gap-1.5 text-slate-600 mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </Label>
            <Input value={user?.email || ''} disabled className="bg-slate-50" />
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Уведомления</h3>
            <p className="text-xs text-slate-500">Настройте каналы и типы оповещений</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'email_notifications', icon: Mail, label: 'Email-уведомления', desc: 'Получать уведомления на почту', color: 'bg-blue-100 text-blue-600' },
            { key: 'whatsapp_notifications', icon: MessageCircle, label: 'WhatsApp-уведомления', desc: 'Уведомления через WhatsApp', color: 'bg-green-100 text-green-600' },
            { key: 'debt_alerts', icon: Bell, label: 'Оповещения о долгах', desc: 'При новом долге или оплате', color: 'bg-red-100 text-red-600' },
            { key: 'low_stock_alerts', icon: BellOff, label: 'Оповещения о запасах', desc: 'Когда товар заканчивается', color: 'bg-orange-100 text-orange-600' },
          ].map(({ key, icon: Icon, label, desc, color }) => (
            <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
              <Toggle
                checked={notifications[key]}
                onChange={(v) => setNotifications({ ...notifications, [key]: v })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* App Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Настройки приложения</h3>
            <p className="text-xs text-slate-500">Язык, тема и отображение</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Globe className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Язык интерфейса</p>
                <p className="text-xs text-slate-500">Язык уведомлений и приложения</p>
              </div>
            </div>
            <Select
              value={appSettings.language}
              onValueChange={(v) => setAppSettings({ ...appSettings, language: v })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                {appSettings.theme === 'dark' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Тема</p>
                <p className="text-xs text-slate-500">Светлая или тёмная тема</p>
              </div>
            </div>
            <Select
              value={appSettings.theme}
              onValueChange={(v) => setAppSettings({ ...appSettings, theme: v })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><Sun className="w-3 h-3 inline mr-1" />Светлая</SelectItem>
                <SelectItem value="dark"><Moon className="w-3 h-3 inline mr-1" />Тёмная</SelectItem>
                <SelectItem value="system"><Monitor className="w-3 h-3 inline mr-1" />Системная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compact mode */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Smartphone className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Компактный режим</p>
                <p className="text-xs text-slate-500">Уменьшенные отступы и элементы</p>
              </div>
            </div>
            <Toggle
              checked={appSettings.compact_mode}
              onChange={(v) => setAppSettings({ ...appSettings, compact_mode: v })}
            />
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <Shield className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Безопасность</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Email аккаунта</p>
              <p className="text-sm font-medium text-slate-800 truncate">{user?.email}</p>
            </div>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Подтверждён</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Последний вход</p>
              <p className="text-sm font-medium text-slate-800">
                {user?.created_date ? format(new Date(user.created_date), 'dd.MM.yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <LogOut className="w-4 h-4" />
        Выйти из аккаунта
      </Button>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-end z-10">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 min-w-32"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
           saved ? <><CheckCircle className="w-4 h-4" /> Сохранено</> :
           <><Save className="w-4 h-4" /> Сохранить</>}
        </Button>
      </div>
    </div>
  );
}