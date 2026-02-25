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
import { format, parseISO } from 'date-fns';
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

  // History state
  const [activityLogs, setActivityLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // all, delete, update
  const [historyEntityFilter, setHistoryEntityFilter] = useState('all');
  const [historyDetailLog, setHistoryDetailLog] = useState(null);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Если режим сотрудника — загружаем бизнес через employee
      if (isEmployeeMode) {
        const empId = savedMode.replace('employee_', '');
        const empList = await base44.entities.Employee.filter({ user_email: currentUser.email, is_active: true });
        const emp = empList.find(e => e.id === empId) || empList[0];
        if (emp) {
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) {
            const biz = bizList[0];
            setBusiness(biz);
            setLang(biz.language || 'ru');
          }
        }
        setLoading(false);
        return;
      }
      
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
      await base44.entities.Employee.create({
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
      
      await loadData();
      
      // Показываем сообщение о результате
      if (inviteSuccess) {
        alert(`Приглашение отправлено на ${newEmployee.user_email}. Сотрудник получит письмо с инструкциями для входа.`);
      } else {
        alert(`Сотрудник добавлен, но с отправкой приглашения была проблема. Возможно, этот email уже зарегистрирован в системе. Сотрудник сможет войти со своей почтой.`);
      }
      
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
      alert(`✅ Сотрудник ${newEmployee.name} добавлен! Приглашение отправлено на ${newEmployee.user_email}`);
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

  const loadHistory = async () => {
    if (!business) return;
    setHistoryLoading(true);
    try {
      const logs = await base44.entities.ActivityLog.filter({ business_id: business.id });
      setActivityLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreLog = async (log) => {
    if (!log.entity_data || log.action_type !== 'delete') return;
    if (!confirm('Восстановить эту запись?')) return;
    try {
      const entityMap = {
        Product: base44.entities.Product,
        Sale: base44.entities.Sale,
        Customer: base44.entities.Customer,
        Warehouse: base44.entities.Warehouse,
        Employee: base44.entities.Employee,
        Return: base44.entities.Return,
      };
      const entity = entityMap[log.entity_type];
      if (entity) {
        const { id, created_date, updated_date, ...restData } = log.entity_data;
        await entity.create(restData);
        await base44.entities.ActivityLog.update(log.id, { is_restored: true });
        await loadHistory();
      }
    } catch (e) {
      alert('Ошибка при восстановлении');
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
    setSaving(true);
    try {
      const newCode = type === 'business' ? generateCodeLocal(12) : generateCodeLocal(8);
      
      const updateData = type === 'business' 
        ? { business_code: newCode }
        : { access_code: newCode };

      await base44.entities.Business.update(business.id, updateData);
      
      const updated = await base44.entities.Business.filter({ id: business.id });
      if (updated.length > 0) setBusiness(updated[0]);
      alert(`✅ ${type === 'business' ? 'Код бизнеса' : 'Код доступа'} успешно изменён: ${newCode}`);
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

  // Если режим сотрудника — показываем только смену языка
  if (isEmployeeMode) {
    return (
      <div className="space-y-4">
        <PageHeader title={t(lang, 'settings_title')} subtitle="Настройки языка" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-sm">
          <Label className="mb-2 block">{t(lang, 'settings_language')}</Label>
          <Select value={lang} onValueChange={async (v) => {
            setLang(v);
            if (business) await base44.entities.Business.update(business.id, { language: v });
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="mt-4 w-full text-red-600 border-red-200 hover:bg-red-50"
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem('barakatcrm_mode');
              navigate(createPageUrl('Dashboard'));
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из режима сотрудника
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t(lang, 'settings_title')}
        subtitle={t(lang, 'settings_subtitle')}
      />

      {/* Аккаунт карточка */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.full_name || t(lang,'settings_user')}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="text-xs text-slate-400">{user?.role === 'admin' ? t(lang,'settings_admin_role') : t(lang,'settings_user')}</p>
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
      </div>

      <div className="space-y-2">
        {/* Business Settings */}
        <Collapsible open={expandedSections.business} onOpenChange={(open) => setExpandedSections({...expandedSections, business: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_biz_info')}</h3>
                  <p className="text-xs text-slate-500">Основные параметры бизнеса</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.business ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6 space-y-4">
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
        </Collapsible>

        {/* Access Codes */}
        <Collapsible open={expandedSections.access} onOpenChange={(open) => setExpandedSections({...expandedSections, access: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Коды доступа</h3>
                  <p className="text-xs text-slate-500">Управление кодами входа в бизнес</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.access ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6 space-y-6">
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
        </Collapsible>

        {/* Default Settings */}
        <Collapsible open={expandedSections.defaults} onOpenChange={(open) => setExpandedSections({...expandedSections, defaults: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_defaults_title')}</h3>
                  <p className="text-xs text-slate-500">Размеры, цвета и типы товаров по умолчанию</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.defaults ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
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
        </Collapsible>

        {/* Employees */}
        <Collapsible open={expandedSections.employees} onOpenChange={(open) => setExpandedSections({...expandedSections, employees: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_employees')}</h3>
                  <p className="text-xs text-slate-500">{employees.length} сотрудник(ов)</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.employees ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
            {/* Add Employee Form */}
            <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
              <h4 className="font-medium text-slate-900 mb-3">{t(lang,'settings_emp_add')}</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t(lang,'settings_emp_name')}</Label>
                  <Input 
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder={t(lang,'settings_emp_name')}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={newEmployee.user_email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, user_email: e.target.value })}
                    placeholder="email@example.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>{t(lang,'settings_phone')}</Label>
                  <Input 
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="+992 XXX XX XX XX"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>{t(lang,'settings_emp_role')}</Label>
                  <Select value={newEmployee.role} onValueChange={(v) => {
                    let permissions = { ...newEmployee.permissions };
                    if (v === 'Продавец') {
                      permissions = {
                        view_analytics: false, view_profit: false,
                        view_products: true, add_products: true, edit_products: false, delete_products: false,
                        view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false,
                        view_warehouses: true, manage_warehouses: false,
                        view_customers: true, manage_customers: false,
                        view_debts: false, manage_debts: false,
                        manage_returns: false, view_activity_log: false,
                      };
                    } else if (v === 'Менеджер') {
                      permissions = {
                        view_analytics: true, view_profit: false,
                        view_products: true, add_products: true, edit_products: true, delete_products: false,
                        view_sales: true, add_sales: true, edit_sales: true, cancel_sales: false,
                        view_warehouses: true, manage_warehouses: false,
                        view_customers: true, manage_customers: true,
                        view_debts: true, manage_debts: true,
                        manage_returns: true, view_activity_log: false,
                      };
                    }
                    setNewEmployee({ ...newEmployee, role: v, permissions });
                  }}>
                    <SelectTrigger className="mt-1.5">
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

              {/* Встроенные разрешения */}
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-800 mb-2">Встроенные права:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(newEmployee.permissions).filter(([,v]) => v).map(([k]) => {
                      const labels = {
                        view_analytics:'Аналитика', view_profit:'Прибыль', view_products:'Просмотр товаров',
                        add_products:'Добавление товаров', edit_products:'Редактирование товаров', delete_products:'Удаление товаров',
                        view_sales:'Просмотр продаж', add_sales:'Продажи', edit_sales:'Редакт. продаж', cancel_sales:'Отмена продаж',
                        view_warehouses:'Склады', manage_warehouses:'Управление складами',
                        view_customers:'Клиенты', manage_customers:'Управление клиентами',
                        view_debts:'Долги', manage_debts:'Управление долгами',
                        manage_returns:'Возвраты', view_activity_log:'История'
                      };
                      return <span key={k} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{labels[k]}</span>;
                    })}
                  </div>
                </div>

                {/* Пользовательские разрешения */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 block mb-2">Дополнительные разрешения:</label>
                  <div className="flex flex-wrap gap-2">
                    {['edit_all_data', 'manage_inventory', 'export_reports', 'manage_discounts', 'view_settings'].map((perm) => (
                      <Button
                        key={perm}
                        onClick={() => {
                          if (!newEmployee.custom_permissions.includes(perm)) {
                            setNewEmployee({
                              ...newEmployee,
                              custom_permissions: [...newEmployee.custom_permissions, perm]
                            });
                          }
                        }}
                        disabled={newEmployee.custom_permissions.includes(perm)}
                        variant={newEmployee.custom_permissions.includes(perm) ? "default" : "outline"}
                        size="sm"
                        className={newEmployee.custom_permissions.includes(perm) ? "bg-blue-600" : ""}
                      >
                        {newEmployee.custom_permissions.includes(perm) && <Check className="w-3 h-3 mr-1" />}
                        {perm === 'edit_all_data' && 'Редактирование всего'}
                        {perm === 'manage_inventory' && 'Управление складом'}
                        {perm === 'export_reports' && 'Экспорт отчётов'}
                        {perm === 'manage_discounts' && 'Управление скидками'}
                        {perm === 'view_settings' && 'Просмотр настроек'}
                      </Button>
                    ))}
                  </div>
                  {newEmployee.custom_permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {newEmployee.custom_permissions.map((perm) => (
                        <span key={perm} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                          {perm === 'edit_all_data' && 'Редактирование всего'}
                          {perm === 'manage_inventory' && 'Управление складом'}
                          {perm === 'export_reports' && 'Экспорт отчётов'}
                          {perm === 'manage_discounts' && 'Управление скидками'}
                          {perm === 'view_settings' && 'Просмотр настроек'}
                          <button
                            onClick={() => setNewEmployee({
                              ...newEmployee,
                              custom_permissions: newEmployee.custom_permissions.filter(p => p !== perm)
                            })}
                            className="hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleAddEmployee}
                disabled={!newEmployee.name || !newEmployee.user_email}
                size="sm"
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                Добавить
              </Button>
            </div>

            {/* Employees List */}
            <div className="space-y-3">
              {employees.map(employee => {
                const enabledCount = Object.values(employee.permissions || {}).filter(Boolean).length;
                return (
                  <div key={employee.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-indigo-600">
                            {employee.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{employee.name}</p>
                          <p className="text-sm text-slate-500">{employee.user_email}</p>
                          {employee.phone && <p className="text-xs text-slate-400">{employee.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      {employee.is_frozen && (
                        <span className="px-2.5 py-1 bg-blue-100 rounded-lg text-xs text-blue-700 font-medium">🧊 Заморожен</span>
                      )}
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 font-medium">
                        {employee.role}
                      </span>
                        <button
                          onClick={() => setEditingEmployee(employee)}
                          className="p-2 hover:bg-indigo-50 rounded-lg group"
                          title="Настроить разрешения"
                        >
                          <Shield className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <div className="px-4 pb-3 border-t border-slate-100 pt-2 bg-slate-50">
                      <p className="text-xs text-slate-500 mb-1.5">Разрешений: <span className="font-semibold text-indigo-600">{enabledCount}</span></p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(employee.permissions || {}).filter(([,v]) => v).map(([k]) => {
                          const labels = {
                            view_analytics:'Аналитика', view_profit:'Прибыль', view_products:'Товары',
                            add_products:'+ Товары', edit_products:'Ред. товары', delete_products:'Удал. товары',
                            view_sales:'Продажи', add_sales:'+ Продажи', edit_sales:'Ред. продажи', cancel_sales:'Отм. продажи',
                            view_warehouses:'Склады', manage_warehouses:'Упр. склады',
                            view_customers:'Клиенты', manage_customers:'Упр. клиенты',
                            view_debts:'Долги', manage_debts:'Упр. долги',
                            manage_returns:'Возвраты', view_activity_log:'История'
                          };
                          return <span key={k} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{labels[k]}</span>;
                        })}
                        {enabledCount === 0 && <span className="text-xs text-slate-400 italic">Нет разрешений — нажмите 🛡 для настройки</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        </Collapsible>

        {/* Notifications Settings */}
        <Collapsible open={expandedSections.notifications} onOpenChange={(open) => setExpandedSections({...expandedSections, notifications: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_notif_title')}</h3>
                  <p className="text-xs text-slate-500">Уведомления и язык</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.notifications ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
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

        {/* Custom Fields */}
        <Collapsible open={expandedSections.custom} onOpenChange={(open) => setExpandedSections({...expandedSections, custom: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Palette className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_custom_title')}</h3>
                  <p className="text-xs text-slate-500">Пользовательские цвета и типы товаров</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.custom ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
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
        </Collapsible>

        {/* History Section — redirect to full page */}
        <div
          onClick={() => navigate(createPageUrl('ActivityLog'))}
          className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition"
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
        </div>

        {/* Employee Login Section */}
        <Collapsible open={expandedSections.employee_login} onOpenChange={(open) => setExpandedSections({...expandedSections, employee_login: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Войти как сотрудник</h3>
                  <p className="text-xs text-slate-500">Подключиться к другому бизнесу по кодам</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.employee_login ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
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

        {/* Security Section */}
        <Collapsible open={expandedSections.security} onOpenChange={(open) => setExpandedSections({...expandedSections, security: open})}>
          <CollapsibleTrigger asChild>
            <div className="bg-white hover:bg-slate-50 rounded-xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t(lang,'settings_security')}</h3>
                  <p className="text-xs text-slate-500">Резервные копии и безопасность</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition ${expandedSections.security ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-slate-50 border-x border-b border-slate-100 p-6">
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">{t(lang,'settings_sec_account')}</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">Email: <span className="font-medium text-slate-900">{user?.email}</span></p>
                  <p className="text-slate-600">Имя: <span className="font-medium text-slate-900">{user?.full_name || 'Не указано'}</span></p>
                  <p className="text-slate-600">Роль: <span className="font-medium text-slate-900">{user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</span></p>
                </div>
              </div>

              {/* Резервное копирование и Экспорт */}
              <BackupExportPanel business={business} onBackupJSON={handleBackup} />

              {/* Очистить кэш */}
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">{t(lang,'settings_sec_cache')}</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      {t(lang,'settings_sec_cache_desc')}
                    </p>
                    <Button
                      onClick={handleClearCache}
                      disabled={clearingCache}
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 gap-2"
                    >
                      {clearingCache ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {t(lang,'settings_sec_cache')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Удаление всех данных */}
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">{t(lang,'settings_sec_delete')}</h4>
                <p className="text-sm text-red-700 mb-3">
                  {t(lang,'settings_sec_delete_desc')}
                </p>
                <Button
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100 gap-2"
                  onClick={handleDeleteAllData}
                >
                  <Trash2 className="w-4 h-4" />
                  {t(lang,'settings_sec_delete_btn')}
                  </Button>
                  </div>

                  {/* Delete Account */}
                  <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 mb-1">Удалить аккаунт</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      Это необратимо удалит ваш аккаунт и все связанные данные. Эта операция не может быть отменена.
                    </p>
                    <Button
                      variant="outline"
                      className="text-orange-700 border-orange-300 hover:bg-orange-100 gap-2"
                      onClick={() => setDeleteAccountDialog(true)}
                    >
                      <Zap className="w-4 h-4" />
                      Удалить аккаунт
                    </Button>
                  </div>
                </div>
                  </div>
                  </div>
                  </CollapsibleContent>
                  </Collapsible>
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