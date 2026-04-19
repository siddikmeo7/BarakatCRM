import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Building2, Clock, LogIn, Trash2, Star, StarOff, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const STORAGE_KEY = 'barakat_recent_businesses';
const MAX_RECENT = 10;

// Утилиты работы с localStorage историей
export function saveBusinessToHistory(businessId, businessName, employeeId, employeeName, role = 'employee') {
  try {
    const existing = getBusinessHistory();
    const newEntry = {
      businessId,
      businessName,
      employeeId,
      employeeName,
      role,
      lastVisited: new Date().toISOString(),
    };
    // Удаляем дубликат
    const filtered = existing.filter(e => !(e.businessId === businessId && e.employeeId === employeeId));
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export function getBusinessHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function removeFromHistory(businessId, employeeId) {
  try {
    const existing = getBusinessHistory();
    const updated = existing.filter(e => !(e.businessId === businessId && e.employeeId === employeeId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export default function RecentBusinessesPanel({ currentUser }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(null); // employeeId being loaded
  const [error, setError] = useState('');

  useEffect(() => {
    setHistory(getBusinessHistory());
  }, []);

  const handleQuickLogin = async (entry) => {
    if (!entry.employeeId) return;
    setLoading(entry.employeeId);
    setError('');
    try {
      // Проверяем, что сотрудник ещё активен и не заморожен
      const empList = await base44.entities.Employee.filter({ id: entry.employeeId });
      if (!empList || empList.length === 0) {
        setError(`Сотрудник не найден. Возможно, вас удалили из бизнеса "${entry.businessName}".`);
        removeFromHistory(entry.businessId, entry.employeeId);
        setHistory(getBusinessHistory());
        return;
      }
      const emp = empList[0];
      if (emp.is_frozen) {
        setError(`Ваш аккаунт в бизнесе "${entry.businessName}" заморожен. Обратитесь к владельцу.`);
        return;
      }
      // Проверяем, что бизнес существует
      const bizList = await base44.entities.Business.filter({ id: entry.businessId });
      if (!bizList || bizList.length === 0) {
        setError(`Бизнес "${entry.businessName}" не найден.`);
        removeFromHistory(entry.businessId, entry.employeeId);
        setHistory(getBusinessHistory());
        return;
      }
      // Обновляем запись — последний визит
      saveBusinessToHistory(entry.businessId, entry.businessName, entry.employeeId, entry.employeeName, entry.role);
      setHistory(getBusinessHistory());

      // Входим
      localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      navigate(createPageUrl('Dashboard'));
    } catch (e) {
      setError('Ошибка: ' + e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = (entry, e) => {
    e.stopPropagation();
    removeFromHistory(entry.businessId, entry.employeeId);
    setHistory(getBusinessHistory());
  };

  const handleClearAll = () => {
    if (confirm('Очистить всю историю входов?')) {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    }
  };

  const formatLastVisited = (iso) => {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return 'только что';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
      if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} дн. назад`;
      return format(d, 'dd MMM yyyy', { locale: ru });
    } catch (_) {
      return '—';
    }
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
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        {history.map((entry, idx) => (
          <div
            key={`${entry.businessId}_${entry.employeeId}_${idx}`}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 p-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">{entry.businessName?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate text-sm">{entry.businessName}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 truncate">
                    {entry.employeeName || 'Сотрудник'}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="flex items-center gap-0.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatLastVisited(entry.lastVisited)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => handleRemove(entry, e)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Удалить из истории"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleQuickLogin(entry)}
                  disabled={loading === entry.employeeId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
                >
                  {loading === entry.employeeId
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <LogIn className="w-3.5 h-3.5" />
                  }
                  Войти
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full text-xs text-slate-400 hover:text-red-500 py-1.5 transition-colors"
        >
          Очистить историю входов
        </button>
      )}
    </div>
  );
}