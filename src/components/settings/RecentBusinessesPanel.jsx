import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Building2, Clock, LogIn, Trash2, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Copy, Eye, EyeOff, Users, MapPin,
  Phone, Mail, Shield, Key, Hash, RefreshCw, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const STORAGE_KEY = 'barakat_recent_businesses';
const MAX_RECENT = 10;

export function saveBusinessToHistory(businessId, businessName, employeeId, employeeName, role = 'employee') {
  try {
    const existing = getBusinessHistory();
    const newEntry = { businessId, businessName, employeeId, employeeName, role, lastVisited: new Date().toISOString() };
    const filtered = existing.filter(e => !(e.businessId === businessId && e.employeeId === employeeId));
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function getBusinessHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
}

export function removeFromHistory(businessId, employeeId) {
  try {
    const updated = getBusinessHistory().filter(e => !(e.businessId === businessId && e.employeeId === employeeId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

function formatLastVisited(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} дн. назад`;
    return format(d, 'dd MMM yyyy', { locale: ru });
  } catch (_) { return '—'; }
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1 rounded transition-colors ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-indigo-600'}`}
      title={`Копировать ${label}`}
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}

function BusinessDetailCard({ entry, onClose, onRemove }) {
  const [biz, setBiz] = useState(null);
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Backend-функция обходит RLS через service role
        const res = await base44.functions.invoke('getEmployeeBusinesses', {});
        const data = res.data || {};
        const employees = data.employees || [];
        const emp = employees.find(e => e.id === entry.employeeId) || null;
        const biz = emp ? (data.businesses?.[emp.id]) : (data.ownedBusinesses || []).find(b => b.id === entry.businessId) || null;
        setBiz(biz || null);
        setEmp(emp);
      } catch (_) {}
      setLoading(false);
    })();
  }, [entry.businessId, entry.employeeId]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setError('');
    try {
      if (!emp) { setError('Сотрудник не найден.'); return; }
      if (emp.is_frozen) { setError('Ваш аккаунт заморожен. Обратитесь к владельцу.'); return; }
      saveBusinessToHistory(entry.businessId, entry.businessName, entry.employeeId, entry.employeeName, entry.role);
      localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      if (emp.login_session_token) {
        localStorage.setItem(`barakat_emp_token_${emp.id}`, emp.login_session_token);
      }
      window.location.href = '/';
    } catch (e) { setError('Ошибка: ' + e.message); }
    finally { setLoginLoading(false); }
  };

  const roleColor = entry.role === 'owner' ? 'bg-amber-100 text-amber-700' :
    entry.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700';
  const roleLabel = entry.role === 'owner' ? '👑 Владелец' : entry.role === 'admin' ? '🛡️ Администратор' : '👤 Сотрудник';

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow">
          <span className="text-white font-bold text-xl">{entry.businessName?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base truncate">{entry.businessName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white`}>{roleLabel}</span>
            <span className="text-indigo-200 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{formatLastVisited(entry.lastVisited)}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Информация о бизнесе */}
            {biz && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Информация о бизнесе
                </p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  {biz.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600">{biz.phone}</span>
                    </div>
                  )}
                  {biz.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600">{biz.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-600">{biz.owner_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-600">Язык: {biz.language === 'ru' ? 'Русский' : biz.language === 'tj' ? 'Тоҷикӣ' : 'English'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Информация о сотруднике */}
            {emp && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Ваш профиль в этом бизнесе
                </p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Имя:</span>
                    <span className="text-sm font-semibold text-slate-800">{emp.name || entry.employeeName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Статус:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.is_frozen ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {emp.is_frozen ? '🧊 Заморожен' : '✅ Активен'}
                    </span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Телефон:</span>
                      <span className="text-sm font-semibold text-slate-800">{emp.phone}</span>
                    </div>
                  )}
                  {emp.last_login_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Последний вход:</span>
                      <span className="text-xs text-slate-500">{format(new Date(emp.last_login_at), 'dd.MM.yyyy HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Коды доступа */}
            {biz && (biz.business_code || biz.access_code) && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCodes(v => !v)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-indigo-600 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Коды входа</span>
                  {showCodes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {showCodes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
                    <p className="text-xs text-amber-700">⚠️ Храните коды в безопасном месте. Не передавайте посторонним.</p>
                    {biz.business_code && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Код бизнеса</p>
                        <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                          <code className="flex-1 font-mono font-bold text-sm text-slate-800 tracking-widest select-all">{biz.business_code}</code>
                          <CopyButton text={biz.business_code} label="код бизнеса" />
                        </div>
                      </div>
                    )}
                    {biz.access_code && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Код доступа</p>
                        <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                          <code className="flex-1 font-mono font-bold text-sm text-slate-800 tracking-widest select-all">{biz.access_code}</code>
                          <CopyButton text={biz.access_code} label="код доступа" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Действия */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={onRemove}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить из истории
              </button>
              <button
                onClick={handleLogin}
                disabled={loginLoading || !emp || emp.is_frozen}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all"
              >
                {loginLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                Войти в бизнес
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RecentBusinessesPanel({ currentUser }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [expandedEntry, setExpandedEntry] = useState(null); // key of expanded entry
  const [quickLoading, setQuickLoading] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setHistory(getBusinessHistory()); }, []);

  const handleQuickLogin = async (entry) => {
    setQuickLoading(entry.employeeId);
    setError('');
    try {
      // loadEmployeeContext обходит RLS, проверяет frozen/active и ставит business_id
      const ctxRes = await base44.functions.invoke('loadEmployeeContext', { employee_id: entry.employeeId });
      const ctx = ctxRes.data;
      if (ctx.error) {
        setError(ctx.error);
        removeFromHistory(entry.businessId, entry.employeeId);
        setHistory(getBusinessHistory());
        return;
      }
      const emp = ctx.employee;
      saveBusinessToHistory(entry.businessId, entry.businessName, emp.id, emp.name || entry.employeeName, emp.is_admin ? 'admin' : entry.role);
      localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      window.location.href = '/';
    } catch (e) { setError('Ошибка: ' + e.message); }
    finally { setQuickLoading(null); }
  };

  const handleRemove = (entry) => {
    if (!confirm(`Удалить "${entry.businessName}" из истории?`)) return;
    removeFromHistory(entry.businessId, entry.employeeId);
    setHistory(getBusinessHistory());
    const key = `${entry.businessId}_${entry.employeeId}`;
    if (expandedEntry === key) setExpandedEntry(null);
  };

  const toggleExpand = (entry) => {
    const key = `${entry.businessId}_${entry.employeeId}`;
    setExpandedEntry(expandedEntry === key ? null : key);
  };

  if (history.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-6 text-center">
        <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-medium">История входов пуста</p>
        <p className="text-xs text-slate-300 mt-1">Здесь будут отображаться бизнесы, в которые вы входили</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        {history.map((entry, idx) => {
          const key = `${entry.businessId}_${entry.employeeId}`;
          const isExpanded = expandedEntry === key;
          const roleLabel = entry.role === 'owner' ? '👑 Владелец' : entry.role === 'admin' ? '🛡️ Администратор' : '👤 Сотрудник';

          if (isExpanded) {
            return (
              <BusinessDetailCard
                key={key}
                entry={entry}
                onClose={() => setExpandedEntry(null)}
                onRemove={() => handleRemove(entry)}
              />
            );
          }

          return (
            <div
              key={key}
              className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-bold text-sm">{entry.businessName?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(entry)}>
                  <p className="font-semibold text-slate-900 truncate text-sm">{entry.businessName}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">{entry.employeeName || 'Сотрудник'}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400">{roleLabel}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="flex items-center gap-0.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />{formatLastVisited(entry.lastVisited)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleExpand(entry)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Подробнее"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleQuickLogin(entry)}
                    disabled={quickLoading === entry.employeeId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
                  >
                    {quickLoading === entry.employeeId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <LogIn className="w-3.5 h-3.5" />}
                    Войти
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { if (confirm('Очистить всю историю входов?')) { localStorage.removeItem(STORAGE_KEY); setHistory([]); setExpandedEntry(null); } }}
        className="w-full text-xs text-slate-400 hover:text-red-500 py-1.5 transition-colors"
      >
        Очистить историю входов
      </button>
    </div>
  );
}