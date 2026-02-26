import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { t } from '@/components/i18n/translations';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BackupExportPanel from '@/components/settings/BackupExportPanel';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ru as dateFnsRu } from 'date-fns/locale';
import { ru } from 'date-fns/locale';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Palette,
  Users,
  Plus,
  Trash2,
  Loader2,
  Save,
  CheckCircle,
  MessageCircle,
  Mail,
  Bell,
  Edit2,
  LogOut,
  History,
  Download,
  Shield,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Lock,
  Database,
  Zap,
  Package,
  ShoppingCart,
  Eye,
  Search,
  Check,
  Copy
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import EmployeePermissionsDialog from '@/components/employees/EmployeePermissionsDialog';
import EmployeeCard from '@/components/employees/EmployeeCard';

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'tj', label: 'Тоҷикӣ' },
  { value: 'en', label: 'English' }
];

const PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый'];

export default function Settings() {
  const navigate = useNavigate();
  // Проверяем режим сотрудника
  const savedMode = sessionStorage.getItem('barakatcrm_mode');
  const isEmployeeMode = savedMode && savedMode.startsWith('employee_');
  // Реактивное состояние сотрудника — обновляется после loadData
  const [currentEmployee, setCurrentEmployee] = useState(() => window.__barakatEmployee || null);
  const isEmployeeAdmin = currentEmployee?.is_admin === true;
  const [business, setBusiness] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [driveBackupLoading, setDriveBackupLoading] = useState(false);
  const [driveBackupMsg, setDriveBackupMsg] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    language: 'ru',
    default_color: 'Чёрный',
    default_size_from: 39,
    default_size_to: 44,
    default_pairs_per_box: 6,
    default_product_type: 'Туфли',
    low_stock_limit: 2
  });

  const [roles, setRoles] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    user_email: '',
    phone: '',
    role: 'Продавец',
    permissions: {
      view_analytics: false, view_profit: false,
      view_products: true, add_products: true, edit_products: false, delete_products: false,
      view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false,
      view_warehouses: true, manage_warehouses: false,
      view_customers: true, manage_customers: false,
      view_debts: false, manage_debts: false,
      manage_returns: false, view_activity_log: false,
    },
    custom_permissions: []
  });
  const [newColor, setNewColor] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState(false);
  const [newCustomPermission, setNewCustomPermission] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    access: false,
    defaults: false,
    employees: false,
    notifications: false,
    custom: false,
    history: false,
    security: false,
    employee_login: false
  });

  // Employee login state
  const [empLoginCode, setEmpLoginCode] = useState('');
  const [empAccessCode, setEmpAccessCode] = useState('');
  const [empLoginLoading, setEmpLoginLoading] = useState(false);
  const [empLoginError, setEmpLoginError] = useState('');

  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);

  useEffect(() => {
    loadData();
    // Автообновление каждые 15 минут для актуальных статусов сотрудников
    const interval = setInterval(() => {
      if (business?.id) {
        base44.entities.Employee.filter({ business_id: business?.id }).then(setEmployees);
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Обновляем currentEmployee из свежих данных
      const freshEmployee = window.__barakatEmployee || null;
      
      // Если режим сотрудника — загружаем бизнес через employee
      if (isEmployeeMode) {
        const empId = savedMode.replace('employee_', '');
        const empList = await base44.entities.Employee.filter({ user_email: currentUser.email, is_active: true });
        const emp = empList.find(e => e.id === empId) || empList[0];
        if (emp) {
          // Обновляем глобальный объект и локальный state свежими данными из БД
          window.__barakatEmployee = emp;
          setCurrentEmployee(emp);
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) {
            const biz = bizList[0];
            setBusiness(biz);
            setLang(biz.language || 'ru');
            setFormData({
              name: biz.name || '',
              phone: biz.phone || '',
              address: biz.address || '',
              language: biz.language || 'ru',
              default_color: biz.default_color || 'Чёрный',
              default_size_from: biz.default_size_from || 39,
              default_size_to: biz.default_size_to || 44,
              default_pairs_per_box: biz.default_pairs_per_box || 6,
              default_product_type: biz.default_product_type || 'Туфли',
              low_stock_limit: biz.low_stock_limit ?? 2
            });
          }
        }
        setLoading(false);
        return;
      }
      setCurrentEmployee(freshEmployee);
      
      const businesses = await base44.entities.Business.filter({ owner_email: currentUser.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        setLang(biz.language || 'ru');
        setFormData({
          name: biz.name || '',
          phone: biz.phone || '',
          address: biz.address || '',
          language: biz.language || 'ru',
          default_color: biz.default_color || 'Чёрный',
          default_size_from: biz.default_size_from || 39,
          default_size_to: biz.default_size_to || 44,
          default_pairs_per_box: biz.default_pairs_per_box || 6,
          default_product_type: biz.default_product_type || 'Туфли',
          low_stock_limit: biz.low_stock_limit ?? 2
        });

        // Загружаем роли
        let rolesData = await base44.entities.Role.filter({ business_id: biz.id });
        
        // Если роли "Продавец" нет - создаём
        const hasSeller = rolesData.some(r => r.name === 'Продавец');
        if (!hasSeller) {
          await base44.entities.Role.create({
            business_id: biz.id,
            name: 'Продавец',
            description: 'Продавец товаров',
            permissions: {
              view_analytics: false, view_profit: false,
              view_products: true, add_products: true, edit_products: false, delete_products: false,
              view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false,
              view_warehouses: true, manage_warehouses: false,
              view_customers: true, manage_customers: false,
              view_debts: false, manage_debts: false,
              manage_returns: false, view_activity_log: false, manage_employees: false, manage_roles: false,
            }
          });
          rolesData = await base44.entities.Role.filter({ business_id: biz.id });
        }
        setRoles(rolesData);

        const employeesData = await base44.entities.Employee.filter({ business_id: biz.id });
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Business.update(business.id, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.user_email.trim()) {
      alert('Заполните имя и email');
      return;
    }
    
    try {
      // Находим роль по названию из загруженных ролей
      const foundRole = roles.find(r => r.name === newEmployee.role);
      
      if (!foundRole) {
        alert(`Роль "${newEmployee.role}" не найдена`);
        return;
      }
      
      const roleId = foundRole.id;

      // Создаём запись сотрудника
      const createdEmp = await base44.entities.Employee.create({
        name: newEmployee.name,
        user_email: newEmployee.user_email,
        phone: newEmployee.phone,
        role_id: roleId,
        permissions: newEmployee.permissions,
        business_id: business.id,
        is_active: true
      });

      // Приглашаем пользователя в систему
      let inviteSuccess = false;
      try {
        await base44.users.inviteUser(newEmployee.user_email, 'user');
        inviteSuccess = true;
      } catch (inviteErr) {
        console.error('Invite error:', inviteErr);
      }
      
      // Отправляем письмо сотруднику с информацией
      try {
        await base44.functions.invoke('sendEmployeeInviteEmail', {
          email: newEmployee.user_email,
          employeeName: newEmployee.name,
          businessName: business.name,
          loginCode: createdEmp.login_session_token || 'XXXXXXXX',
          accessCode: business.access_code,
          permissions: newEmployee.permissions,
          roleId: roleId
        });
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }
      
      await loadData();
      
      alert(`✅ Сотрудник ${newEmployee.name} добавлен и приглашение отправлено на ${newEmployee.user_email}`);
      
      setNewEmployee({ 
        name: '', 
        user_email: '', 
        phone: '', 
        role: 'Продавец',
        permissions: {
          view_analytics: false, view_profit: false,
          view_products: true, add_products: true, edit_products: false, delete_products: false,
          view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false,
          view_warehouses: true, manage_warehouses: false,
          view_customers: true, manage_customers: false,
          view_debts: false, manage_debts: false,
          manage_returns: false, view_activity_log: false,
        },
        custom_permissions: []
      });
      setNewCustomPermission('');
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Ошибка при добавлении сотрудника');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (confirm(t(lang, 'confirm_delete'))) {
      await base44.entities.Employee.delete(employeeId);
      await loadData();
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const [salesData, productsData, customersData, warehousesData, returnsData, employeesData] = await Promise.all([
        base44.entities.Sale.filter({ business_id: business.id }),
        base44.entities.Product.filter({ business_id: business.id }),
        base44.entities.Customer.filter({ business_id: business.id }),
        base44.entities.Warehouse.filter({ business_id: business.id }),
        base44.entities.Return.filter({ business_id: business.id }),
        base44.entities.Employee.filter({ business_id: business.id }),
      ]);
      const backup = {
        exported_at: new Date().toISOString(),
        business,
        sales: salesData,
        products: productsData,
        customers: customersData,
        warehouses: warehousesData,
        returns: returnsData,
        employees: employeesData,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${business.name}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleClearCache = () => {
    if (confirm(t(lang, 'settings_sec_cache') + '?')) {
      setClearingCache(true);
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const handleDriveBackup = async () => {
    setDriveBackupLoading(true);
    setDriveBackupMsg('');
    try {
      const res = await base44.functions.invoke('backupToGoogleDrive');
      if (res.data?.success) {
        setDriveBackupMsg(`✅ Сохранено: ${res.data.file_name}`);
      } else {
        setDriveBackupMsg(`❌ Ошибка: ${res.data?.error || 'Неизвестная ошибка'}`);
      }
    } catch (e) {
      setDriveBackupMsg(`❌ Ошибка: ${e.message}`);
    } finally {
      setDriveBackupLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm(t(lang, 'settings_sec_delete') + ' ' + t(lang, 'confirm_delete'))) return;
    if (!confirm(t(lang, 'confirm_delete'))) return;
    try {
      const [salesData, productsData, customersData, warehousesData, returnsData, employeesData] = await Promise.all([
        base44.entities.Sale.filter({ business_id: business.id }),
        base44.entities.Product.filter({ business_id: business.id }),
        base44.entities.Customer.filter({ business_id: business.id }),
        base44.entities.Warehouse.filter({ business_id: business.id }),
        base44.entities.Return.filter({ business_id: business.id }),
        base44.entities.Employee.filter({ business_id: business.id }),
      ]);
      await Promise.all([
        ...salesData.map(r => base44.entities.Sale.delete(r.id)),
        ...productsData.map(r => base44.entities.Product.delete(r.id)),
        ...customersData.map(r => base44.entities.Customer.delete(r.id)),
        ...warehousesData.map(r => base44.entities.Warehouse.delete(r.id)),
        ...returnsData.map(r => base44.entities.Return.delete(r.id)),
        ...employeesData.map(r => base44.entities.Employee.delete(r.id)),
      ]);
      alert('Все данные удалены.');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении данных.');
    }
  };

  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const currentSessionId = sessionStorage.getItem('barakat_session_id');

  const loadActiveSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await base44.functions.invoke('revokeAllSessions', { action: 'list' });
      setActiveSessions(res.data?.sessions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Выйти со всех других устройств? Текущая сессия останется активной.')) return;
    try {
      const res = await base44.functions.invoke('revokeAllSessions', { action: 'revoke_all', current_session_id: currentSessionId });
      if (res.data?.success) {
        sessionStorage.setItem('my_session_token', res.data.session_token);
        await loadActiveSessions();
        alert('✅ Все другие устройства были отключены.');
      }
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const handleRevokeOneSession = async (targetSessionId) => {
    if (!confirm('Завершить эту сессию?')) return;
    try {
      const res = await base44.functions.invoke('revokeAllSessions', { action: 'revoke_one', target_session_id: targetSessionId, current_session_id: currentSessionId });
      if (res.data?.success) {
        if (targetSessionId === currentSessionId) {
          sessionStorage.clear();
          base44.auth.logout();
        } else {
          await loadActiveSessions();
        }
      }
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) {
      alert('Подтверждение не совпадает. Пожалуйста, введите правильный email.');
      return;
    }
    try {
      // Delete all business data first
      await handleDeleteAllData();
      // Then delete the user account
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении аккаунта.');
    }
  };

  const generateCodeLocal = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleRegenerateCode = async (type) => {
    if (!confirm(`Изменить ${type === 'business' ? 'код бизнеса' : 'код доступа'}? Все сотрудники, которые вошли по старому коду, будут автоматически выброшены из системы и должны будут войти заново.`)) return;
    setSaving(true);
    try {
      const newCode = type === 'business' ? generateCodeLocal(12) : generateCodeLocal(8);
      
      const updateData = type === 'business' 
        ? { business_code: newCode }
        : { access_code: newCode };

      await base44.entities.Business.update(business.id, updateData);
      
      // Сбрасываем токены сессий всех сотрудников (они должны войти заново)
      const allEmps = await base44.entities.Employee.filter({ business_id: business.id });
      await Promise.all(allEmps.map(emp =>
        base44.entities.Employee.update(emp.id, { login_session_token: newCode + '_' + Date.now() })
      ));
      
      const updated = await base44.entities.Business.filter({ id: business.id });
      if (updated.length > 0) setBusiness(updated[0]);
      alert(`✅ ${type === 'business' ? 'Код бизнеса' : 'Код доступа'} успешно изменён: ${newCode}\n\nВсе сотрудники (${allEmps.length}) будут перенаправлены на страницу входа при следующем обновлении.`);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Хелпер проверки разрешений — всегда читает актуальный currentEmployee из state
  const canPerm = (key) => {
    if (!currentEmployee) return true; // владелец
    if (currentEmployee.is_admin) return true; // администратор
    return !!(currentEmployee.permissions?.[key]);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t(lang, 'settings_title')}
        subtitle={t(lang, 'settings_subtitle')}
      />

      {/* Аккаунт карточка */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md group-hover:opacity-80 transition-opacity">
                <span className="text-white font-bold text-lg">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const res = await base44.integrations.Core.UploadFile({ file });
                      if (res.data?.file_url) {
                        await base44.auth.updateMe({ avatar_url: res.data.file_url });
                        await loadData();
                      }
                    } catch (err) {
                      console.error('Upload error:', err);
                    }
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Нажмите для изменения аватара"
              />
              <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium">
                Изменить
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.full_name || t(lang,'settings_user')}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              {(() => {
                const emp = window.__barakatEmployee;
                if (!emp) {
                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium mt-0.5">👑 Владелец</span>;
                } else if (emp.is_admin) {
                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium mt-0.5">🛡️ Администратор</span>;
                } else {
                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium mt-0.5">👤 Сотрудник</span>;
                }
              })()}
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => {
              if (confirm(t(lang, 'settings_logout_confirm'))) {
                base44.auth.logout();
              }
            }}
          >
            <LogOut className="w-4 h-4" />
            {t(lang, 'settings_logout')}
          </Button>
        </div>

        {/* Информация об аккаунте — видна всем */}
        <div className="border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">В системе с</p>
              <p className="text-sm font-semibold text-slate-800">
                {user?.created_date ? format(new Date(user.created_date), 'dd.MM.yyyy') : '—'}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Дней активности</p>
              <p className="text-sm font-bold text-indigo-600">
                {user?.created_date ? Math.floor((Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24)) + ' дн.' : '—'}
              </p>
            </div>
            {(() => {
              const emp = window.__barakatEmployee;
              const lastLogin = emp?.last_login_at;
              if (!lastLogin) return null;
              const diff = Date.now() - new Date(lastLogin).getTime();
              const mins = Math.floor(diff / 60000);
              const hours = Math.floor(diff / 3600000);
              const days = Math.floor(diff / 86400000);
              const ago = days > 0 ? `${days} дн. назад` : hours > 0 ? `${hours} ч. назад` : `${mins} мин. назад`;
              return (
                <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Последний вход</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {format(new Date(lastLogin), 'dd.MM.yyyy HH:mm')} <span className="text-xs font-normal text-slate-400">({ago})</span>
                  </p>
                </div>
              );
            })()}
            <div className="col-span-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Активен сейчас</span>
            </div>
          </div>
        </div>

        {/* Разрешения сотрудника */}
        {(() => {
          const emp = window.__barakatEmployee;
          if (!emp) return null;
          const PERM_LABELS = {
            view_dashboard: 'Дашборд', view_analytics: 'Аналитика', view_profit: 'Прибыль',
            view_stock_value: 'Стоимость склада', view_purchase_price: 'Цена закупки',
            view_products: 'Просмотр товаров', add_products: 'Добавление товаров',
            edit_products: 'Редакт. товары', delete_products: 'Удаление товаров', move_products: 'Перемещение',
            view_sales: 'Просмотр продаж', add_sales: 'Продажи', edit_sales: 'Редакт. продаж',
            cancel_sales: 'Отмена продаж', manage_discounts: 'Скидки',
            view_warehouses: 'Склады', manage_warehouses: 'Управление складами',
            view_customers: 'Клиенты', manage_customers: 'Управление клиентами',
            view_debts: 'Долги', manage_debts: 'Управление долгами',
            manage_returns: 'Возвраты', view_activity_log: 'История',
            export_reports: 'Экспорт', manage_employees: 'Сотрудники',
            manage_roles: 'Роли', manage_settings: 'Настройки',
          };
          if (emp.is_admin) {
            return (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Разрешения:</p>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs text-emerald-700 font-medium">✅ Полный доступ — все разрешения как у владельца</p>
                </div>
              </div>
            );
          }
          const granted = Object.entries(emp.permissions || {}).filter(([, v]) => v);
          const denied = Object.entries(emp.permissions || {}).filter(([, v]) => !v);
          return (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Ваши разрешения:</p>
              <div className="flex flex-wrap gap-1.5">
                {granted.length === 0 && <span className="text-xs text-slate-400 italic">Нет разрешений</span>}
                {granted.map(([k]) => (
                  <span key={k} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{PERM_LABELS[k] || k}</span>
                ))}
                {denied.map(([k]) => (
                  <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-xs line-through">{PERM_LABELS[k] || k}</span>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="space-y-3">
        {/* Business Settings — только владелец/manage_settings */}
        {canPerm('manage_settings') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.business} onOpenChange={(open) => setExpandedSections({...expandedSections, business: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all rounded-t-2xl ${expandedSections.business ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.business ? 'bg-blue-600' : 'bg-blue-100'}`}>
                  <Building2 className={`w-5 h-5 ${expandedSections.business ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.business ? 'text-blue-700' : 'text-slate-900'}`}>{t(lang,'settings_biz_info')}</h3>
                  <p className="text-xs text-slate-500">Основные параметры бизнеса</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.business ? 'rotate-180 text-blue-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
            <div className="grid gap-4 max-w-2xl">
              <div>
                <Label>{t(lang,'settings_biz_name')}</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'settings_phone')}</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+992 XXX XX XX XX"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'settings_address')}</Label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t(lang,'settings_address')}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang, 'settings_language')}</Label>
                <Select value={formData.language} onValueChange={async (v) => {
                  setFormData({ ...formData, language: v });
                  setLang(v);
                  if (business) {
                    await base44.entities.Business.update(business.id, { language: v });
                  }
                }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Access Codes — только владелец/view_settings_codes */}
        {canPerm('view_settings_codes') ? <Collapsible open={expandedSections.access} onOpenChange={(open) => setExpandedSections({...expandedSections, access: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.access ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.access ? 'bg-emerald-600' : 'bg-emerald-100'}`}>
                  <Lock className={`w-5 h-5 ${expandedSections.access ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.access ? 'text-emerald-700' : 'text-slate-900'}`}>Коды доступа</h3>
                  <p className="text-xs text-slate-500">Управление кодами входа в бизнес</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.access ? 'rotate-180 text-emerald-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6 space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">КОД БИЗНЕСА (для входа сотрудников)</p>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded font-mono font-bold text-lg text-slate-900 break-all select-all">
                  {business?.business_code || '—'}
                </code>
                <button
                  onClick={() => copyToClipboard(business?.business_code)}
                  className="p-2 hover:bg-slate-200 rounded transition"
                  title="Скопировать"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <Button
                onClick={() => handleRegenerateCode('business')}
                disabled={saving}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Изменить код бизнеса
              </Button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">КОД ДОСТУПА (для входа сотрудников)</p>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded font-mono font-bold text-lg text-slate-900 break-all select-all">
                  {business?.access_code || '—'}
                </code>
                <button
                  onClick={() => copyToClipboard(business?.access_code)}
                  className="p-2 hover:bg-slate-200 rounded transition"
                  title="Скопировать"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <Button
                onClick={() => handleRegenerateCode('access')}
                disabled={saving}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Изменить код доступа
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">📝 Как сотруднику войти в бизнес:</p>
              <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                <li>Перейти на страницу входа</li>
                <li>Нажать "Войти в бизнес как сотрудник"</li>
                <li>Ввести свой email</li>
                <li>Ввести код бизнеса и код доступа</li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible> : null}

        {/* Default Settings — view_settings_defaults */}
        {canPerm('view_settings_defaults') ? <Collapsible open={expandedSections.defaults} onOpenChange={(open) => setExpandedSections({...expandedSections, defaults: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.defaults ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.defaults ? 'bg-purple-600' : 'bg-purple-100'}`}>
                  <Palette className={`w-5 h-5 ${expandedSections.defaults ? 'text-white' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.defaults ? 'text-purple-700' : 'text-slate-900'}`}>{t(lang,'settings_defaults_title')}</h3>
                  <p className="text-xs text-slate-500">Размеры, цвета и типы товаров по умолчанию</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.defaults ? 'rotate-180 text-purple-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>{t(lang,'settings_product_type')}</Label>
                <Select value={formData.default_product_type} onValueChange={(v) => setFormData({ ...formData, default_product_type: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t(lang,'settings_color')}</Label>
                <Select value={formData.default_color} onValueChange={(v) => setFormData({ ...formData, default_color: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map(color => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t(lang,'settings_size_from')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={formData.default_size_from}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, default_size_from: val ? parseInt(val) : '' });
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'settings_size_to')}</Label>
                <Input 
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={formData.default_size_to}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, default_size_to: val ? parseInt(val) : '' });
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(lang,'settings_pairs_per_box')}</Label>
                <Select value={String(formData.default_pairs_per_box)} onValueChange={(v) => setFormData({ ...formData, default_pairs_per_box: parseInt(v) })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">{t(lang,'prod_pairs_4')}</SelectItem>
                    <SelectItem value="6">{t(lang,'prod_pairs_6')}</SelectItem>
                    <SelectItem value="8">{t(lang,'prod_pairs_8')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  🔴 Лимит «Мало на складе» (коробок)
                </Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.low_stock_limit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, low_stock_limit: val ? parseInt(val) : 0 });
                    }}
                    className="w-24"
                  />
                  <p className="text-xs text-slate-500">
                    Товары с ≤ <strong>{formData.low_stock_limit}</strong> коробок будут подсвечены красным
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible> : null}

        {/* Employees — manage_employees */}
        {canPerm('manage_employees') ? <Collapsible open={expandedSections.employees} onOpenChange={(open) => setExpandedSections({...expandedSections, employees: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.employees ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.employees ? 'bg-green-600' : 'bg-green-100'}`}>
                  <Users className={`w-5 h-5 ${expandedSections.employees ? 'text-white' : 'text-green-600'}`} />
                </div>
                <div>
                   <h3 className={`font-semibold ${expandedSections.employees ? 'text-green-700' : 'text-slate-900'}`}>{t(lang,'settings_employees')}</h3>
                   <p className="text-xs text-slate-500">
                     {employees.length} сотрудник(ов) · <span className="text-emerald-600 font-medium">{employees.filter(e => e.last_login_at).length} входили</span>
                   </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.employees ? 'rotate-180 text-green-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4">
            {/* Add Employee Button */}
            <button
              onClick={() => setShowAddEmployeeForm(true)}
              className="w-full mb-4 flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all text-indigo-600 font-semibold text-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              Добавить сотрудника
            </button>

            {/* Employees List */}
            <div className="space-y-3">
              {/* Stats bar */}
              {employees.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
                    <p className="text-xs text-slate-500">Всего</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{employees.filter(e => e.last_login_at && (Date.now() - new Date(e.last_login_at).getTime()) < 10 * 60 * 1000).length}</p>
                    <p className="text-xs text-emerald-600">Онлайн</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">{employees.filter(e => e.is_frozen).length}</p>
                    <p className="text-xs text-slate-500">Заморожено</p>
                  </div>
                </div>
              )}

              {employees.map(employee => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  business={business}
                  onEdit={setEditingEmployee}
                  onDelete={handleDeleteEmployee}
                />
              ))}
              {employees.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  {t(lang,'settings_emp_empty')}
                </p>
              )}
            </div>

            {editingEmployee && (
              <EmployeePermissionsDialog
                employee={editingEmployee}
                onClose={() => setEditingEmployee(null)}
                onSaved={loadData}
              />
            )}
          </CollapsibleContent>
        </Collapsible> : null}

        {/* Notifications Settings — всем */}
        <Collapsible open={expandedSections.notifications} onOpenChange={(open) => setExpandedSections({...expandedSections, notifications: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.notifications ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.notifications ? 'bg-yellow-500' : 'bg-yellow-100'}`}>
                  <Bell className={`w-5 h-5 ${expandedSections.notifications ? 'text-white' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.notifications ? 'text-yellow-700' : 'text-slate-900'}`}>{t(lang,'settings_notif_title')}</h3>
                  <p className="text-xs text-slate-500">Уведомления и язык</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.notifications ? 'rotate-180 text-yellow-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">{t(lang,'settings_notif_wa')}</h4>
                  <p className="text-sm text-slate-500 mb-3">
                    {t(lang,'settings_notif_wa_desc')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="whatsapp"
                      checked={user?.whatsapp_notifications !== false}
                      onChange={async (e) => {
                        await base44.auth.updateMe({ whatsapp_notifications: e.target.checked });
                        await loadData();
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="whatsapp" className="text-sm text-slate-700">
                      {t(lang,'settings_notif_wa_enable')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">{t(lang,'settings_notif_email')}</h4>
                  <p className="text-sm text-slate-500 mb-3">
                    {t(lang,'settings_notif_email_desc')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="email"
                      checked={user?.email_notifications !== false}
                      onChange={async (e) => {
                        await base44.auth.updateMe({ email_notifications: e.target.checked });
                        await loadData();
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="email" className="text-sm text-slate-700">
                      {t(lang,'settings_notif_email_enable')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">{t(lang,'settings_notif_when')}</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• При продаже товара в долг клиенту</li>
                      <li>• При частичной оплате долга</li>
                      <li>• При полном погашении долга</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
               <h4 className="font-medium text-slate-900 mb-2">{t(lang,'settings_notif_lang')}</h4>
                <Select 
                  value={user?.language || formData.language} 
                  onValueChange={async (v) => {
                    await base44.auth.updateMe({ language: v });
                    setFormData({ ...formData, language: v });
                    await loadData();
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Custom Fields — view_settings_custom */}
        {canPerm('view_settings_custom') ? <Collapsible open={expandedSections.custom} onOpenChange={(open) => setExpandedSections({...expandedSections, custom: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.custom ? 'bg-pink-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.custom ? 'bg-pink-600' : 'bg-pink-100'}`}>
                  <Palette className={`w-5 h-5 ${expandedSections.custom ? 'text-white' : 'text-pink-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.custom ? 'text-pink-700' : 'text-slate-900'}`}>{t(lang,'settings_custom_title')}</h3>
                  <p className="text-xs text-slate-500">Пользовательские цвета и типы товаров</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.custom ? 'rotate-180 text-pink-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="space-y-4">
              {/* Custom Colors */}
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">{t(lang,'settings_custom_colors')}</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="Например: Золотой"
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (newColor.trim()) {
                        const updatedColors = [...(business.custom_colors || []), newColor.trim()];
                        await base44.entities.Business.update(business.id, { custom_colors: updatedColors });
                        await loadData();
                        setNewColor('');
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(business?.custom_colors || []).map((color, i) => (
                    <div key={i} className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2">
                      <span className="text-sm">{color}</span>
                      <button
                        onClick={() => {
                          setEditingColor({ index: i, value: color });
                          setEditColorDialog(true);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          const updatedColors = business.custom_colors.filter((_, idx) => idx !== i);
                          await base44.entities.Business.update(business.id, { custom_colors: updatedColors });
                          await loadData();
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Product Types */}
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">{t(lang,'settings_custom_types')}</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    placeholder="Например: Кроссовки"
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (newProductType.trim()) {
                        const updatedTypes = [...(business.custom_product_types || []), newProductType.trim()];
                        await base44.entities.Business.update(business.id, { custom_product_types: updatedTypes });
                        await loadData();
                        setNewProductType('');
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(business?.custom_product_types || []).map((type, i) => (
                    <div key={i} className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2">
                      <span className="text-sm">{type}</span>
                      <button
                        onClick={() => {
                          setEditingType({ index: i, value: type });
                          setEditTypeDialog(true);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          const updatedTypes = business.custom_product_types.filter((_, idx) => idx !== i);
                          await base44.entities.Business.update(business.id, { custom_product_types: updatedTypes });
                          await loadData();
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible> : null}

        {/* History Section — view_activity_log */}
        {canPerm('view_activity_log') ? <div
          onClick={() => navigate(createPageUrl('ActivityLog'))}
          className="bg-white hover:bg-indigo-50 rounded-2xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <History className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">История действий</h3>
              <p className="text-xs text-slate-500">Все изменения, удаления и создания. Просмотр деталей и восстановление.</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
        </div> : null}

        {/* Employee Login Section */}
        <Collapsible open={expandedSections.employee_login} onOpenChange={(open) => setExpandedSections({...expandedSections, employee_login: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.employee_login ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.employee_login ? 'bg-purple-600' : 'bg-purple-100'}`}>
                  <Users className={`w-5 h-5 ${expandedSections.employee_login ? 'text-white' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.employee_login ? 'text-purple-700' : 'text-slate-900'}`}>Войти как сотрудник</h3>
                  <p className="text-xs text-slate-500">Подключиться к другому бизнесу по кодам</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.employee_login ? 'rotate-180 text-purple-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">🔒 Введите коды, полученные от владельца бизнеса. Информация о бизнесах конфиденциальна.</p>
              </div>
              <div>
                <Label>Код бизнеса</Label>
                <Input
                  value={empLoginCode}
                  onChange={(e) => setEmpLoginCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXXXXXX"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label>Код доступа</Label>
                <Input
                  value={empAccessCode}
                  onChange={(e) => setEmpAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="mt-1.5 font-mono"
                />
              </div>
              {empLoginError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{empLoginError}</div>
              )}
              <Button
                onClick={async () => {
                  setEmpLoginLoading(true);
                  setEmpLoginError('');
                  try {
                    const businesses = await base44.entities.Business.filter({ business_code: empLoginCode.trim(), access_code: empAccessCode.trim() });
                    if (businesses.length === 0) {
                      setEmpLoginError('Неверные коды доступа');
                      return;
                    }
                    const biz = businesses[0];
                    const currentUser = await base44.auth.me();
                    const emp = await base44.entities.Employee.filter({ business_id: biz.id, user_email: currentUser.email });
                    if (emp.length === 0) {
                      setEmpLoginError('Вы не добавлены как сотрудник этого бизнеса. Попросите владельца добавить вас.');
                      return;
                    }
                    sessionStorage.setItem('barakatcrm_mode', `employee_${emp[0].id}`);
                    navigate(createPageUrl('Dashboard'));
                  } catch (e) {
                    setEmpLoginError('Ошибка: ' + e.message);
                  } finally {
                    setEmpLoginLoading(false);
                  }
                }}
                disabled={empLoginLoading || !empLoginCode || !empAccessCode}
                className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
              >
                {empLoginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Войти как сотрудник
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Security Section — view_settings_security */}
        {canPerm('view_settings_security') ? <Collapsible open={expandedSections.security} onOpenChange={(open) => setExpandedSections({...expandedSections, security: open})} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.security ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${expandedSections.security ? 'bg-red-600' : 'bg-red-100'}`}>
                  <Shield className={`w-5 h-5 ${expandedSections.security ? 'text-white' : 'text-red-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${expandedSections.security ? 'text-red-700' : 'text-slate-900'}`}>{t(lang,'settings_security')}</h3>
                  <p className="text-xs text-slate-500">Аккаунт, устройства и резервные копии</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.security ? 'rotate-180 text-red-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">

            {/* Активные устройства */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Активные устройства</span>
                </div>
                <Button variant="outline" size="sm" onClick={loadActiveSessions} disabled={sessionsLoading} className="gap-1.5 text-xs h-7">
                  {sessionsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Обновить
                </Button>
              </div>
              <div className="p-3">
                {activeSessions.length === 0 && !sessionsLoading && (
                  <div className="text-center py-5">
                    <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 mb-2">Нажмите «Обновить» чтобы загрузить список</p>
                    <Button variant="outline" size="sm" onClick={loadActiveSessions}>Загрузить</Button>
                  </div>
                )}
                {sessionsLoading && (
                  <div className="flex items-center justify-center py-5">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                )}
                <div className="space-y-2">
                  {activeSessions.map(session => {
                    const isCurrent = session.session_id === currentSessionId;
                    const lastSeen = session.last_seen ? new Date(session.last_seen) : null;
                    const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000;
                    return (
                      <div key={session.session_id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${isCurrent ? 'bg-indigo-100' : 'bg-white border border-slate-200'}`}>
                          {session.device?.includes('iPhone') || session.device?.includes('Android') || session.device?.includes('iPad') ? '📱' : '🖥️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 truncate">{session.device || 'Устройство'}</p>
                            {isCurrent && <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-xs font-medium">Это устройство</span>}
                            {isOnline && !isCurrent && <span className="flex items-center gap-1 text-xs text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Онлайн</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {session.browser} · {lastSeen ? `${Math.round((Date.now() - lastSeen.getTime()) / 60000)} мин. назад` : 'Неизвестно'}
                          </p>
                        </div>
                        {!isCurrent && (
                          <button
                            onClick={() => handleRevokeOneSession(session.session_id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-600 transition-colors flex-shrink-0"
                            title="Завершить сессию"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeSessions.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 gap-2" onClick={handleRevokeAllSessions}>
                      <LogOut className="w-4 h-4" />
                      Выйти со всех других устройств
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Резервное копирование и Экспорт */}
            <BackupExportPanel business={business} onBackupJSON={handleBackup} />

            {/* Очистить кэш */}
            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">{t(lang,'settings_sec_cache')}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-500 mb-3">{t(lang,'settings_sec_cache_desc')}</p>
                <Button onClick={handleClearCache} disabled={clearingCache} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-2">
                  {clearingCache ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {t(lang,'settings_sec_cache')}
                </Button>
              </div>
            </div>

            {/* Опасная зона */}
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Опасная зона</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t(lang,'settings_sec_delete')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t(lang,'settings_sec_delete_desc')}</p>
                  </div>
                  <Button variant="outline" size="sm" className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={handleDeleteAllData}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Удалить данные
                  </Button>
                </div>
                <div className="flex items-start justify-between gap-4 pt-3 border-t border-red-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Удалить аккаунт</p>
                    <p className="text-xs text-slate-400 mt-0.5">Необратимое удаление аккаунта и всех данных</p>
                  </div>
                  <Button variant="outline" size="sm" className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100 gap-1.5" onClick={() => setDeleteAccountDialog(true)}>
                    <Zap className="w-3.5 h-3.5" />
                    Удалить аккаунт
                  </Button>
                </div>
              </div>
            </div>

          </CollapsibleContent>
        </Collapsible> : null}
                  </div>

                  {/* Save Button */}
                  <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3 -mx-8 px-8">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              {t(lang, 'settings_saved')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t(lang, 'settings_save')}
            </>
          )}
        </Button>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeForm} onOpenChange={(open) => {
        setShowAddEmployeeForm(open);
        if (!open) setNewEmployee({ name: '', user_email: '', phone: '', role: 'Продавец', permissions: { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false }, custom_permissions: [] });
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-bold text-lg leading-tight">{t(lang,'settings_emp_add')}</DialogTitle>
              <p className="text-indigo-100 text-xs mt-0.5">Заполните данные нового сотрудника</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t(lang,'settings_emp_name')}</Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="Иван Иванов"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</Label>
                <Input
                  type="email"
                  value={newEmployee.user_email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, user_email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t(lang,'settings_phone')}</Label>
                <Input
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="+992 XX XXX XX XX"
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Роль</Label>
                <Select value={newEmployee.role} onValueChange={(v) => {
                  let permissions = { ...newEmployee.permissions };
                  if (v === 'Продавец') {
                    permissions = { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false };
                  } else if (v === 'Менеджер') {
                    permissions = { view_analytics: true, view_profit: false, view_products: true, add_products: true, edit_products: true, delete_products: false, view_sales: true, add_sales: true, edit_sales: true, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: true, view_debts: true, manage_debts: true, manage_returns: true, view_activity_log: false };
                  }
                  setNewEmployee({ ...newEmployee, role: v, permissions });
                }}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Продавец">🛍️ Продавец</SelectItem>
                    <SelectItem value="Менеджер">👔 Менеджер</SelectItem>
                    <SelectItem value="Кладовщик">📦 Кладовщик</SelectItem>
                    <SelectItem value="Доставщик">🚚 Доставщик</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions preview */}
            {Object.entries(newEmployee.permissions).filter(([,v]) => v).length > 0 && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-700 mb-2">📋 Права для роли «{newEmployee.role}»:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(newEmployee.permissions).filter(([,v]) => v).map(([k]) => {
                    const labels = { view_analytics:'Аналитика', view_products:'Товары', add_products:'+ Товары', edit_products:'Ред. товары', view_sales:'Продажи', add_sales:'+ Продажи', edit_sales:'Ред. продажи', view_warehouses:'Склады', view_customers:'Клиенты', manage_customers:'Упр. клиенты', view_debts:'Долги', manage_debts:'Упр. долги', manage_returns:'Возвраты' };
                    return <span key={k} className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium">{labels[k] || k}</span>;
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowAddEmployeeForm(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={async () => { await handleAddEmployee(); setShowAddEmployeeForm(false); }}
                disabled={!newEmployee.name || !newEmployee.user_email}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Color Dialog */}
      <Dialog open={editColorDialog} onOpenChange={setEditColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(lang,'settings_edit_color')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>{t(lang,'settings_color_name')}</Label>
            <Input
              value={editingColor?.value || ''}
              onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditColorDialog(false)}>
              {t(lang,'cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (editingColor?.value.trim()) {
                  const updatedColors = [...business.custom_colors];
                  updatedColors[editingColor.index] = editingColor.value.trim();
                  await base44.entities.Business.update(business.id, { custom_colors: updatedColors });
                  await loadData();
                  setEditColorDialog(false);
                }
              }}
            >
              {t(lang,'save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={editTypeDialog} onOpenChange={setEditTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(lang,'settings_edit_type')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>{t(lang,'settings_type_name')}</Label>
            <Input
              value={editingType?.value || ''}
              onChange={(e) => setEditingType({ ...editingType, value: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditTypeDialog(false)}>
              {t(lang,'cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (editingType?.value.trim()) {
                  const updatedTypes = [...business.custom_product_types];
                  updatedTypes[editingType.index] = editingType.value.trim();
                  await base44.entities.Business.update(business.id, { custom_product_types: updatedTypes });
                  await loadData();
                  setEditTypeDialog(false);
                }
              }}
            >
              {t(lang,'save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердить удаление аккаунта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                ⚠️ Это действие необратимо. Все ваши данные будут удалены безвозвратно.
              </p>
            </div>
            <div>
              <Label className="text-red-700">Введите ваш email для подтверждения</Label>
              <Input
                type="email"
                placeholder={user?.email}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setDeleteAccountDialog(false);
              setDeleteConfirmation('');
            }}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== user?.email}
            >
              Удалить аккаунт
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}