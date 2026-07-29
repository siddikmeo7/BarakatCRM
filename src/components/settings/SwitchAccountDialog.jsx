import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { getBusinessHistory, saveBusinessToHistory } from './RecentBusinessesPanel';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Building2, LogIn, Loader2, AlertCircle, RefreshCw, Plus,
  CheckCircle, Users, Crown, Shield, ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SwitchAccountDialog({ open, onClose, currentUser, currentEmployeeId }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState('');

  // Форма добавления нового бизнеса
  const [showAddForm, setShowAddForm] = useState(false);
  const [bizCode, setBizCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (open) loadAccounts();
  }, [open]);

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const history = getBusinessHistory();
      if (history.length === 0) { setAccounts([]); setLoading(false); return; }

      // Используем backend-функцию — обходит RLS через service role
      const res = await base44.functions.invoke('getEmployeeBusinesses', {});
      const data = res.data || {};
      const employees = data.employees || [];
      const businessesMap = data.businesses || {};
      const ownedBusinesses = data.ownedBusinesses || [];

      // Строим карты сотрудников и бизнесов
      const empMap = {};
      employees.forEach(emp => { empMap[emp.id] = emp; });
      // Добавляем бизнесы из businessesMap (ключ — employeeId)
      const bizByEmpId = {};
      Object.entries(businessesMap).forEach(([empId, biz]) => { bizByEmpId[empId] = biz; });
      // Добавляем собственные бизнесы
      const bizMap = {};
      ownedBusinesses.forEach(biz => { bizMap[biz.id] = biz; });
      Object.values(businessesMap).forEach(biz => { if (biz) bizMap[biz.id] = biz; });

      const enriched = history.map(entry => ({
        ...entry,
        emp: empMap[entry.employeeId] || null,
        biz: bizMap[entry.businessId] || bizByEmpId[entry.employeeId] || null,
      }));

      setAccounts(enriched);
    } catch (e) {
      setError('Ошибка загрузки: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (entry) => {
    setSwitchingId(entry.employeeId || entry.businessId);
    setError('');
    try {
      const emp = entry.emp;
      if (!emp) { setError('Сотрудник не найден.'); return; }
      if (emp.is_frozen) { setError(`Аккаунт в "${entry.businessName}" заморожен.`); return; }

      saveBusinessToHistory(entry.businessId, entry.businessName, emp.id, emp.name || entry.employeeName, entry.role);
      localStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      sessionStorage.setItem('barakatcrm_mode', `employee_${emp.id}`);
      if (emp.login_session_token) {
        localStorage.setItem(`barakat_emp_token_${emp.id}`, emp.login_session_token);
      }
      onClose();
      window.location.href = createPageUrl('Dashboard');
    } catch (e) {
      setError('Ошибка: ' + e.message);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleSwitchToOwner = async (entry) => {
    // Переключение на владельца — просто снимаем employee mode
    setSwitchingId('owner');
    try {
      localStorage.removeItem('barakatcrm_mode');
      sessionStorage.removeItem('barakatcrm_mode');
      onClose();
      window.location.href = createPageUrl('Dashboard');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddBusiness = async () => {
    setAddLoading(true);
    setAddError('');
    try {
      // Используем backend-функцию — она обходит RLS через service role
      // и делает регистронезависимое сравнение кодов и email
      const res = await base44.functions.invoke('joinBusinessByCodes', {
        businessCode: bizCode.trim(),
        accessCode: accessCode.trim()
      });
      if (!res.data?.success) {
        setAddError(res.data?.error || 'Неверные коды доступа');
        return;
      }
      const empId = res.data.employee_id;
      const bizId = res.data.business_id;
      const bizName = res.data.business_name;
      const empName = res.data.employee_name;
      const isAdmin = res.data.is_admin;
      saveBusinessToHistory(bizId, bizName, empId, empName, isAdmin ? 'admin' : 'employee');
      setBizCode('');
      setAccessCode('');
      setShowAddForm(false);
      await loadAccounts();
    } catch (e) {
      setAddError('Ошибка: ' + (e?.message || 'неизвестная ошибка'));
    } finally {
      setAddLoading(false);
    }
  };

  const isCurrent = (entry) => {
    const mode = localStorage.getItem('barakatcrm_mode') || '';
    return mode === `employee_${entry.employeeId}`;
  };

  const roleIcon = (role) => role === 'owner' ? '👑' : role === 'admin' ? '🛡️' : '👤';
  const roleLabel = (role) => role === 'owner' ? 'Владелец' : role === 'admin' ? 'Администратор' : 'Сотрудник';
  const roleColor = (role) => role === 'owner' ? 'bg-amber-100 text-amber-700' : role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex-shrink-0">
          <DialogTitle className="text-white font-bold text-lg flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Переключить аккаунт
          </DialogTitle>
          <p className="text-indigo-200 text-xs mt-0.5">Выберите бизнес для входа</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {accounts.length === 0 && !showAddForm && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Нет сохранённых аккаунтов</p>
                  <p className="text-xs text-slate-300 mt-1">Добавьте бизнес по кодам ниже</p>
                </div>
              )}

              <div className="space-y-2">
                {accounts.map((entry) => {
                  const active = isCurrent(entry);
                  const frozen = entry.emp?.is_frozen;
                  const notFound = !entry.emp;
                  const key = `${entry.businessId}_${entry.employeeId}`;
                  const isLoading = switchingId === (entry.employeeId || entry.businessId);

                  return (
                    <div key={key}
                      className={`rounded-2xl border overflow-hidden transition-all ${active ? 'border-indigo-400 bg-indigo-50 shadow-md' : frozen || notFound ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white hover:shadow-sm hover:border-indigo-200'}`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm font-bold text-base text-white ${active ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
                          {entry.businessName?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-900 text-sm truncate">{entry.businessName}</p>
                            {active && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-600 text-white rounded-full font-medium">Текущий</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColor(entry.role)}`}>
                              {roleIcon(entry.role)} {roleLabel(entry.role)}
                            </span>
                            <span className="text-xs text-slate-400 truncate">{entry.emp?.name || entry.employeeName || '—'}</span>
                            {frozen && <span className="text-[10px] text-blue-600 font-medium">🧊 Заморожен</span>}
                            {notFound && <span className="text-[10px] text-red-500 font-medium">Не найден</span>}
                          </div>
                        </div>

                        {/* Action */}
                        {active ? (
                          <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => handleSwitch(entry)}
                            disabled={isLoading || frozen || notFound}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all flex-shrink-0"
                          >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                            Войти
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка обновить */}
              {accounts.length > 0 && (
                <button onClick={loadAccounts} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors mx-auto">
                  <RefreshCw className="w-3 h-3" /> Обновить список
                </button>
              )}

              {/* Добавить бизнес */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all text-indigo-600 font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Добавить новый бизнес
                </button>
              ) : (
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Войти в новый бизнес</p>
                  <div>
                    <Label className="text-xs text-slate-500">Код бизнеса</Label>
                    <Input
                      value={bizCode}
                      onChange={e => setBizCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXXXXXXX"
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Код доступа</Label>
                    <Input
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXXX"
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  {addError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{addError}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAddForm(false); setAddError(''); setBizCode(''); setAccessCode(''); }}>Отмена</Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      onClick={handleAddBusiness}
                      disabled={addLoading || !bizCode || !accessCode}
                    >
                      {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Добавить'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}