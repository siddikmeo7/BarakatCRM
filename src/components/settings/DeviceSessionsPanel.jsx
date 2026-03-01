import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, LogOut, Monitor, Smartphone, Tablet, ChevronDown, Shield, Users, Crown } from 'lucide-react';
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
  const deviceType = isMobile ? '📱 Телефон' : isTablet ? '📱 Планшет' : '💻 Компьютер';
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

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

const ROLE_CONFIG = {
  owner: { label: 'Владелец', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  admin: { label: 'Администратор', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  employee: { label: 'Сотрудник', icon: Users, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600' },
};

export default function DeviceSessionsPanel({ business, currentUserEmail }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.DeviceSession.filter({ business_id: business.id, is_active: true });
      all.sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at));
      setSessions(all);
      // Auto-expand all by default
      const expanded = {};
      const emails = [...new Set(all.map(s => s.user_email))];
      emails.forEach(e => expanded[e] = true);
      setExpandedUsers(expanded);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) load();
  }, [business?.id]);

  const handleRevoke = async (session) => {
    if (!confirm(`Завершить сеанс на этом устройстве? Пользователь будет выброшен из системы.`)) return;
    await base44.entities.DeviceSession.update(session.id, { is_active: false, session_token: '' });
    await load();
  };

  const handleRevokeAllForUser = async (userEmail, userName) => {
    const myToken = localStorage.getItem('barakat_owner_session') || sessionStorage.getItem('barakat_owner_session');
    const userSessions = sessions.filter(s => s.user_email === userEmail);
    const toRevoke = userSessions.filter(s => s.session_token !== myToken);
    if (toRevoke.length === 0) return;
    if (!confirm(`Завершить все сеансы для ${userName || userEmail}?`)) return;
    await Promise.all(toRevoke.map(s => base44.entities.DeviceSession.update(s.id, { is_active: false, session_token: '' })));
    await load();
  };

  // Group sessions by user
  const grouped = {};
  sessions.forEach(s => {
    if (!grouped[s.user_email]) {
      grouped[s.user_email] = {
        email: s.user_email,
        name: s.user_name,
        role: s.role,
        sessions: []
      };
    }
    grouped[s.user_email].sessions.push(s);
  });

  const groups = Object.values(grouped).sort((a, b) => {
    const order = { owner: 0, admin: 1, employee: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  const totalOnline = sessions.filter(s => isOnline(s.last_seen_at)).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Все устройства в системе</span>
          <div className="flex items-center gap-1">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{sessions.length} устр.</span>
            {totalOnline > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {totalOnline} онлайн
              </span>
            )}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      <div className="p-3 space-y-3">
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

        {groups.map(group => {
          const cfg = ROLE_CONFIG[group.role] || ROLE_CONFIG.employee;
          const RoleIcon = cfg.icon;
          const isExpanded = expandedUsers[group.email] !== false;
          const onlineCount = group.sessions.filter(s => isOnline(s.last_seen_at)).length;
          const isMe = group.email === currentUserEmail;
          const myToken = localStorage.getItem('barakat_owner_session') || sessionStorage.getItem('barakat_owner_session');

          return (
            <div key={group.email} className={`rounded-xl border overflow-hidden ${cfg.border}`}>
              {/* User header */}
              <div
                className={`flex items-center gap-3 p-3 cursor-pointer ${cfg.bg} transition-all`}
                onClick={() => setExpandedUsers(prev => ({ ...prev, [group.email]: !isExpanded }))}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${group.role === 'owner' ? 'bg-amber-500' : group.role === 'admin' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                  <span className="text-white font-bold text-sm">{(group.name || group.email)?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {group.name || group.email}
                      {isMe && <span className="ml-1 text-xs text-indigo-500 font-normal">(вы)</span>}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.badge}`}>
                      <RoleIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {onlineCount > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        {onlineCount} онлайн
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{group.email} · {group.sessions.length} устр.</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              {/* Devices list */}
              {isExpanded && (
                <div className="p-2 space-y-1.5 bg-white">
                  {group.sessions.map(session => {
                    const online = isOnline(session.last_seen_at);
                    const isCurrentDevice = session.session_token === myToken;

                    return (
                      <div
                        key={session.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                          isCurrentDevice ? 'bg-indigo-50 border-indigo-200' :
                          online ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${online ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {getDeviceIcon(session.device_info)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-medium text-slate-700 truncate">{parseDevice(session.device_info)}</p>
                            {isCurrentDevice && (
                              <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">это устройство</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {online
                              ? <span className="text-emerald-600 font-medium">● В сети сейчас</span>
                              : `${timeAgo(session.last_seen_at)}`
                            }
                            {session.last_seen_at && (
                              <span className="text-slate-300 ml-1">· {format(new Date(session.last_seen_at), 'dd.MM HH:mm')}</span>
                            )}
                          </p>
                        </div>
                        {!isCurrentDevice && (
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

                  {/* Revoke all for this user */}
                  {group.sessions.some(s => s.session_token !== myToken) && (
                    <button
                      onClick={() => handleRevokeAllForUser(group.email, group.name)}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                    >
                      <LogOut className="w-3 h-3" />
                      Завершить все сеансы этого аккаунта
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}