import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function getDeviceIcon(ua) {
  if (!ua) return <Monitor className="w-4 h-4" />;
  if (/iPhone|Android.*Mobile|Mobile.*Android/i.test(ua)) return <Smartphone className="w-4 h-4" />;
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function parseDevice(ua) {
  if (!ua) return 'Неизвестное устройство';
  const isMobile = /iPhone|Android.*Mobile/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const isIOS = /iPhone|iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edge|OPR/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
  const isEdge = /Edg/i.test(ua);

  const deviceType = isMobile ? 'Телефон' : isTablet ? 'Планшет' : 'Компьютер';
  const os = isIOS ? 'iOS' : isAndroid ? 'Android' : isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : '';
  const browser = isEdge ? 'Edge' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : '';

  return [deviceType, os, browser].filter(Boolean).join(' · ');
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Никогда';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
  return `${Math.floor(diff / 86400000)} дн. назад`;
}

export default function DeviceSessionsPanel({ business, currentUserEmail }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.DeviceSession.filter({ business_id: business.id, is_active: true });
      // Сортируем: сначала онлайн, потом по времени
      all.sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at));
      setSessions(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) load();
  }, [business?.id]);

  const handleRevoke = async (session) => {
    if (!confirm(`Завершить сеанс ${session.user_name || session.user_email}? Устройство будет выброшено из системы.`)) return;
    await base44.entities.DeviceSession.update(session.id, { is_active: false, session_token: '' });
    await load();
  };

  const handleRevokeAll = async () => {
    if (!confirm('Завершить сеансы ВСЕХ устройств кроме вашего текущего?')) return;
    const myToken = localStorage.getItem('barakat_owner_session') || sessionStorage.getItem('barakat_owner_session');
    const others = sessions.filter(s => s.session_token !== myToken);
    await Promise.all(others.map(s => base44.entities.DeviceSession.update(s.id, { is_active: false, session_token: '' })));
    await load();
  };

  const ROLE_LABEL = { owner: '👑 Владелец', employee: '👤 Сотрудник', admin: '🛡️ Администратор' };
  const ROLE_COLOR = { owner: 'bg-indigo-100 text-indigo-700', employee: 'bg-slate-100 text-slate-600', admin: 'bg-emerald-100 text-emerald-700' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Все устройства в системе</span>
          {sessions.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{sessions.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {loading && sessions.length === 0 && (
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Загрузка...</p>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-6">
            <Monitor className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Нет активных сессий</p>
            <p className="text-xs text-slate-300 mt-1">Данные появятся после следующего входа</p>
          </div>
        )}

        {sessions.map(session => {
          const isOnline = session.last_seen_at && (Date.now() - new Date(session.last_seen_at).getTime()) < 10 * 60 * 1000;
          const isMe = session.user_email === currentUserEmail && session.role === 'owner';

          return (
            <div
              key={session.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {getDeviceIcon(session.device_info)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {session.user_name || session.user_email}
                    {isMe && <span className="ml-1 text-xs text-indigo-500 font-normal">(вы)</span>}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLOR[session.role] || ROLE_COLOR.employee}`}>
                    {ROLE_LABEL[session.role] || session.role}
                  </span>
                </div>

                <p className="text-xs text-slate-500 truncate mb-1">{parseDevice(session.device_info)}</p>
                <p className="text-xs text-slate-400">
                  {isOnline
                    ? <span className="text-emerald-600 font-medium">● В сети сейчас</span>
                    : `Последняя активность: ${timeAgo(session.last_seen_at)}`
                  }
                  {session.last_seen_at && (
                    <span className="text-slate-300 ml-1">
                      · {format(new Date(session.last_seen_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  )}
                </p>
              </div>

              {!isMe && (
                <button
                  onClick={() => handleRevoke(session)}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                  title="Завершить сеанс"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {sessions.filter(s => s.user_email !== currentUserEmail || s.role !== 'owner').length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-2"
              onClick={handleRevokeAll}
            >
              <LogOut className="w-4 h-4" />
              Завершить все чужие сеансы
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}