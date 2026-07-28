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
import DeviceSessionsPanel from '@/components/settings/DeviceSessionsPanel';
import AutomationPanel from '@/components/settings/AutomationPanel';
import AvatarPicker, { AvatarDisplay } from '@/components/settings/AvatarPicker';
import RecentBusinessesPanel, { saveBusinessToHistory } from '@/components/settings/RecentBusinessesPanel';
import NotificationsSettingsPanel from '@/components/settings/NotificationsSettingsPanel';
import CustomFieldsPanel from '@/components/settings/CustomFieldsPanel';
import { format } from 'date-fns';
import { 
  Settings as SettingsIcon, Building2, Palette, Users, Plus, Trash2, Loader2, Save,
  CheckCircle, MessageCircle, Mail, Bell, Edit2, LogOut, History, Download, Shield,
  RotateCcw, AlertCircle, RefreshCw, ChevronDown, Lock, Database, Zap, Package,
  ShoppingCart, Eye, Search, Check, Copy, ArrowLeftRight, Moon, Sun, PackageOpen, Globe, Phone, MapPin
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import EmployeePermissionsDialog from '@/components/employees/EmployeePermissionsDialog';
import EmployeePersonalInfoPanel from '@/components/employees/EmployeePersonalInfoPanel';
import EmployeeCard from '@/components/employees/EmployeeCard';
import SwitchAccountDialog from '@/components/settings/SwitchAccountDialog';
import EmployeeProfilePanel from '@/components/settings/EmployeeProfilePanel';
import ProfileCard from '@/components/settings/ProfileCard';
import ProfileDetailDialog from '@/components/settings/ProfileDetailDialog';
import { recordLogin } from '@/lib/loginTracker';

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'tj', label: 'Тоҷикӣ' },
  { value: 'en', label: 'English' }
];

const PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый'];

function useDarkMode() {
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('barakatcrm_theme', next ? 'dark' : 'light');
    setIsDark(next);
  };
  return [isDark, toggle];
}

export default function Settings() {
  const navigate = useNavigate();
  const [isDark, toggleDark] = useDarkMode();
  const savedMode = sessionStorage.getItem('barakatcrm_mode') || localStorage.getItem('barakatcrm_mode');
  const isEmployeeMode = savedMode && savedMode.startsWith('employee_');
  const [currentEmployee, setCurrentEmployee] = useState(() => window.__barakatEmployee || null);
  const [business, setBusiness] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', phone2: '', address: '', language: 'ru',
    default_color: 'Чёрный', default_size_from: 39, default_size_to: 44,
    default_pairs_per_box: 6, default_product_type: 'Туфли', low_stock_limit: 2,
    default_consignment_owner: '', default_consignment_owner_email: ''
  });

  const [roles, setRoles] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '', user_email: '', phone: '', role: 'Продавец',
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
  const [editingColor, setEditingColor] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    business: false, access: false, defaults: false, employees: false,
    notifications: false, custom: false, history: false, security: false,
    employee_login: false, recent_businesses: false
  });

  const [empLoginCode, setEmpLoginCode] = useState('');
  const [empAccessCode, setEmpAccessCode] = useState('');
  const [empLoginLoading, setEmpLoginLoading] = useState(false);
  const [empLoginError, setEmpLoginError] = useState('');
  const [switchAccountOpen, setSwitchAccountOpen] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [empRefreshing, setEmpRefreshing] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    if (user?.email) recordLogin(user.email);
    const interval = setInterval(() => {
      if (business?.id) base44.entities.Employee.filter({ business_id: business?.id }).then(setEmployees);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const freshEmployee = window.__barakatEmployee || null;
      
      if (isEmployeeMode) {
        const empId = savedMode.replace('employee_', '');
        const empList = await base44.entities.Employee.filter({ user_email: currentUser.email, is_active: true });
        const emp = empList.find(e => e.id === empId) || empList[0];
        if (emp) {
          window.__barakatEmployee = emp;
          setCurrentEmployee(emp);
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) {
            const biz = bizList[0];
            setBusiness(biz);
            setLang(biz.language || 'ru');
            setFormData({ name: biz.name || '', phone: biz.phone || '', phone2: biz.phone2 || '', address: biz.address || '', language: biz.language || 'ru', default_color: biz.default_color || 'Чёрный', default_size_from: biz.default_size_from || 39, default_size_to: biz.default_size_to || 44, default_pairs_per_box: biz.default_pairs_per_box || 6, default_product_type: biz.default_product_type || 'Туфли', low_stock_limit: biz.low_stock_limit ?? 2, default_consignment_owner: biz.default_consignment_owner || '', default_consignment_owner_email: biz.default_consignment_owner_email || '' });
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
        setFormData({ name: biz.name || '', phone: biz.phone || '', phone2: biz.phone2 || '', address: biz.address || '', language: biz.language || 'ru', default_color: biz.default_color || 'Чёрный', default_size_from: biz.default_size_from || 39, default_size_to: biz.default_size_to || 44, default_pairs_per_box: biz.default_pairs_per_box || 6, default_product_type: biz.default_product_type || 'Туфли', low_stock_limit: biz.low_stock_limit ?? 2, default_consignment_owner: biz.default_consignment_owner || '', default_consignment_owner_email: biz.default_consignment_owner_email || '' });

        let rolesData = await base44.entities.Role.filter({ business_id: biz.id });
        const hasSeller = rolesData.some(r => r.name === 'Продавец');
        if (!hasSeller) {
          await base44.entities.Role.create({ business_id: biz.id, name: 'Продавец', description: 'Продавец товаров', permissions: { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false, manage_employees: false, manage_roles: false } });
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
    if (!business?.id) { setSaveError('Бизнес не загружен. Обновите страницу.'); return; }
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      await base44.entities.Business.update(business.id, {
        name: formData.name,
        phone: formData.phone,
        phone2: formData.phone2,
        address: formData.address,
        language: formData.language,
        default_color: formData.default_color,
        default_size_from: formData.default_size_from,
        default_size_to: formData.default_size_to,
        default_pairs_per_box: formData.default_pairs_per_box,
        default_product_type: formData.default_product_type,
        low_stock_limit: formData.low_stock_limit,
        default_consignment_owner: formData.default_consignment_owner || '',
        default_consignment_owner_email: formData.default_consignment_owner_email || ''
      });
      const updated = await base44.entities.Business.filter({ id: business.id });
      if (updated.length > 0) {
        setBusiness(updated[0]);
        window.__barakatBusiness = updated[0];
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Ошибка сохранения: ' + (error?.message || 'неизвестная'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.user_email.trim()) { alert('Заполните имя и email'); return; }
    try {
      const foundRole = roles.find(r => r.name === newEmployee.role);
      if (!foundRole) { alert(`Роль "${newEmployee.role}" не найдена`); return; }
      const createdEmp = await base44.entities.Employee.create({ name: newEmployee.name, user_email: newEmployee.user_email, phone: newEmployee.phone, role_id: foundRole.id, permissions: newEmployee.permissions, business_id: business.id, is_active: true });
      try { await base44.users.inviteUser(newEmployee.user_email, 'user'); } catch (_) {}
      try { await base44.functions.invoke('sendEmployeeInviteEmail', { email: newEmployee.user_email, employeeName: newEmployee.name, businessName: business.name, loginCode: createdEmp.login_session_token || 'XXXXXXXX', accessCode: business.access_code, permissions: newEmployee.permissions, roleId: foundRole.id }); } catch (_) {}
      await loadData();
      alert(`✅ Сотрудник ${newEmployee.name} добавлен`);
      setNewEmployee({ name: '', user_email: '', phone: '', role: 'Продавец', permissions: { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false }, custom_permissions: [] });
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Ошибка при добавлении сотрудника');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (confirm(t(lang, 'confirm_delete'))) { await base44.entities.Employee.delete(employeeId); await loadData(); }
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
      const backup = { exported_at: new Date().toISOString(), business, sales: salesData, products: productsData, customers: customersData, warehouses: warehousesData, returns: returnsData, employees: employeesData };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${business.name}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (e) { console.error(e); } finally { setBackupLoading(false); }
  };

  const handleClearCache = () => {
    if (confirm(t(lang, 'settings_sec_cache') + '?')) {
      setClearingCache(true);
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => window.location.reload(), 500);
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
      await Promise.all([...salesData.map(r => base44.entities.Sale.delete(r.id)), ...productsData.map(r => base44.entities.Product.delete(r.id)), ...customersData.map(r => base44.entities.Customer.delete(r.id)), ...warehousesData.map(r => base44.entities.Warehouse.delete(r.id)), ...returnsData.map(r => base44.entities.Return.delete(r.id)), ...employeesData.map(r => base44.entities.Employee.delete(r.id))]);
      alert('Все данные удалены.');
      window.location.reload();
    } catch (e) { console.error(e); alert('Ошибка при удалении данных.'); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) { alert('Подтверждение не совпадает.'); return; }
    try { await handleDeleteAllData(); await base44.auth.logout(); } catch (e) { console.error(e); }
  };

  const generateCodeLocal = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleRegenerateCode = async (type) => {
    if (!confirm(`Изменить ${type === 'business' ? 'код бизнеса' : 'код доступа'}?`)) return;
    setSaving(true);
    try {
      const newCode = type === 'business' ? generateCodeLocal(12) : generateCodeLocal(8);
      await base44.entities.Business.update(business.id, type === 'business' ? { business_code: newCode } : { access_code: newCode });
      const updated = await base44.entities.Business.filter({ id: business.id });
      if (updated.length > 0) setBusiness(updated[0]);
      alert(`✅ Код успешно изменён: ${newCode}`);
    } catch (err) { alert('Ошибка: ' + err.message); } finally { setSaving(false); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert('Скопировано'); };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const canPerm = (key) => {
    if (!currentEmployee) return true;
    if (currentEmployee.is_admin) {
      const override = currentEmployee.permissions?.[key];
      if (override === false) return false;
      return true;
    }
    const mergedPerms = window.__barakatMergedPermissions;
    if (mergedPerms && mergedPerms[key] !== undefined) return mergedPerms[key] === true;
    return !!(currentEmployee.permissions?.[key]);
  };

  // Обычный сотрудник (не admin) — упрощённая страница
  if (currentEmployee && !currentEmployee.is_admin) {
    const empLastLogin = currentEmployee?.last_login_at ? new Date(currentEmployee.last_login_at) : null;
    const parseDevice = (ua) => {
      if (!ua) return '—';
      const isMobile = /iPhone|Android.*Mobile/i.test(ua);
      const device = isMobile ? '📱' : /iPad|Android(?!.*Mobile)/i.test(ua) ? '📱 Планшет' : '💻';
      const os = /iOS|iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : '';
      const browser = /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) && !/Edge/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Safari' : '';
      return `${device}${os ? ' ' + os : ''}${browser ? ' · ' + browser : ''}`;
    };
    return (
      <div className="space-y-4">
        <PageHeader title="Настройки" subtitle="Ваш профиль и аккаунт" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
          <div className="flex items-center gap-3">
            {currentEmployee?.avatar_url
              ? <AvatarDisplay avatarUrl={currentEmployee.avatar_url} name={currentEmployee.name} size="md" />
              : <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md flex-shrink-0"><span className="text-white font-bold text-lg">{currentEmployee.name?.charAt(0) || '?'}</span></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{currentEmployee.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">👤 Сотрудник</span>
                {currentEmployee.is_frozen
                  ? <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">🧊 Заморожен</span>
                  : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>Активен</span>
                }
              </div>
            </div>
          </div>
          {business && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">{business.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{business.name}</p>
                <p className="text-xs text-slate-500">Вы работаете здесь как сотрудник</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400 mb-0.5">🕐 Последний вход</p><p className="text-xs font-semibold text-slate-800">{empLastLogin ? format(empLastLogin, 'dd.MM.yyyy HH:mm') : 'Нет данных'}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400 mb-0.5">💻 Устройство</p><p className="text-xs font-semibold text-slate-800 truncate">{parseDevice(currentEmployee.device_info)}</p></div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Фото профиля</p>
            <AvatarPicker key={currentEmployee?.avatar_url || 'no-avatar'} currentAvatar={currentEmployee?.avatar_url || null} onSave={async (url) => { await base44.entities.Employee.update(currentEmployee.id, { avatar_url: url }); window.__barakatEmployee = { ...currentEmployee, avatar_url: url }; await loadData(); }} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" className="gap-1.5 text-indigo-600 hover:bg-indigo-50 border-indigo-200 text-sm" onClick={() => setSwitchAccountOpen(true)}><ArrowLeftRight className="w-4 h-4" /> Сменить аккаунт</Button>
            <Button variant="outline" className="gap-1.5 text-red-600 hover:bg-red-50 border-red-200 text-sm" onClick={() => { if (confirm('Выйти из аккаунта?')) { const mode = localStorage.getItem('barakatcrm_mode'); if (mode?.startsWith('employee_')) { const empId = mode.replace('employee_', ''); localStorage.removeItem(`barakat_emp_token_${empId}`); localStorage.removeItem('barakatcrm_mode'); } base44.auth.logout(); } }}><LogOut className="w-4 h-4" /> Выйти</Button>
          </div>
        </div>
        <EmployeePersonalInfoPanel employee={currentEmployee} onSaved={loadData} />
        <EmployeeProfilePanel employee={currentEmployee} business={business} user={user} mergedPermissions={window.__barakatMergedPermissions} />
        {canPerm('view_activity_log') && (
          <div onClick={() => navigate(createPageUrl('ActivityLog'))} className="bg-white hover:bg-indigo-50 rounded-2xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition-all shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><History className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">История действий</h3>
                <p className="text-xs text-slate-500">Все изменения, удаления и создания</p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">🌐 Язык интерфейса</p>
          <Select value={lang} onValueChange={async (v) => { setLang(v); if (business) await base44.entities.Business.update(business.id, { language: v }); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <Collapsible open={expandedSections.recent_businesses} onOpenChange={(open) => setExpandedSections({...expandedSections, recent_businesses: open})}>
            <CollapsibleTrigger asChild>
              <div className={`p-4 cursor-pointer flex items-center justify-between ${expandedSections.recent_businesses ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${expandedSections.recent_businesses ? 'bg-teal-600' : 'bg-teal-100'}`}><History className={`w-5 h-5 ${expandedSections.recent_businesses ? 'text-white' : 'text-teal-600'}`} /></div>
                  <div><h3 className={`font-semibold ${expandedSections.recent_businesses ? 'text-teal-700' : 'text-slate-900'}`}>Недавние бизнесы</h3><p className="text-xs text-slate-500">Быстрый вход в бизнесы</p></div>
                </div>
                <ChevronDown className={`w-5 h-5 transition ${expandedSections.recent_businesses ? 'rotate-180 text-teal-600' : 'text-slate-500'}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4"><RecentBusinessesPanel currentUser={user} /></CollapsibleContent>
          </Collapsible>
        </div>
        <SwitchAccountDialog open={switchAccountOpen} onClose={() => setSwitchAccountOpen(false)} currentUser={user} currentEmployeeId={currentEmployee?.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t(lang, 'settings_title')} subtitle={t(lang, 'settings_subtitle')} />

      {/* Новая карточка профиля */}
      <ProfileCard
        user={user}
        currentEmployee={currentEmployee}
        business={business}
        lang={lang}
        onOpenProfile={() => setProfileDialogOpen(true)}
        onSwitchAccount={() => setSwitchAccountOpen(true)}
        onLogout={() => {
          if (confirm(t(lang, 'settings_logout_confirm'))) {
            const mode = localStorage.getItem('barakatcrm_mode');
            if (mode && mode.startsWith('employee_')) { const empId = mode.replace('employee_', ''); localStorage.removeItem(`barakat_emp_token_${empId}`); localStorage.removeItem('barakatcrm_mode'); }
            base44.auth.logout();
          }
        }}
      />

      <ProfileDetailDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={user}
        currentEmployee={currentEmployee}
        business={business}
      />

      <div className="space-y-3">
        {/* Business Settings */}
        {canPerm('manage_settings') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.business} onOpenChange={(open) => setExpandedSections({...expandedSections, business: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all rounded-t-2xl ${expandedSections.business ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.business ? 'bg-blue-600' : 'bg-blue-100'}`}><Building2 className={`w-5 h-5 ${expandedSections.business ? 'text-white' : 'text-blue-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.business ? 'text-blue-700' : 'text-slate-900'}`}>{t(lang,'settings_biz_info')}</h3><p className="text-xs text-slate-500">Основные параметры бизнеса</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.business ? 'rotate-180 text-blue-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6 space-y-5">
            {/* Read-only info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-400 mb-0.5">🔑 Код бизнеса</p>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{business?.business_code || '—'}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-400 mb-0.5">📧 Email владельца</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{business?.owner_email || '—'}</p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid gap-4 max-w-2xl">
              <div>
                <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{t(lang,'settings_biz_name')}</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" placeholder="Название бизнеса" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />Телефон 1</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+992 XXX XX XX XX" className="mt-1.5" />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />Телефон 2</Label>
                  <Input value={formData.phone2} onChange={(e) => setFormData({ ...formData, phone2: e.target.value })} placeholder="+992 XXX XX XX XX" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{t(lang,'settings_address')}</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t(lang,'settings_address')} className="mt-1.5" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Access Codes */}
        {canPerm('view_settings_codes') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.access} onOpenChange={(open) => setExpandedSections({...expandedSections, access: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.access ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.access ? 'bg-emerald-600' : 'bg-emerald-100'}`}><Lock className={`w-5 h-5 ${expandedSections.access ? 'text-white' : 'text-emerald-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.access ? 'text-emerald-700' : 'text-slate-900'}`}>Коды доступа</h3><p className="text-xs text-slate-500">Управление кодами входа в бизнес</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.access ? 'rotate-180 text-emerald-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6 space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">КОД БИЗНЕСА</p>
              <div className="flex items-center gap-2 mb-3"><code className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded font-mono font-bold text-lg text-slate-900 break-all select-all">{business?.business_code || '—'}</code><button onClick={() => copyToClipboard(business?.business_code)} className="p-2 hover:bg-slate-200 rounded transition"><Copy className="w-4 h-4 text-slate-600" /></button></div>
              <Button onClick={() => handleRegenerateCode('business')} disabled={saving} variant="outline" size="sm" className="w-full gap-2"><RefreshCw className="w-4 h-4" />Изменить код бизнеса</Button>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">КОД ДОСТУПА</p>
              <div className="flex items-center gap-2 mb-3"><code className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded font-mono font-bold text-lg text-slate-900 break-all select-all">{business?.access_code || '—'}</code><button onClick={() => copyToClipboard(business?.access_code)} className="p-2 hover:bg-slate-200 rounded transition"><Copy className="w-4 h-4 text-slate-600" /></button></div>
              <Button onClick={() => handleRegenerateCode('access')} disabled={saving} variant="outline" size="sm" className="w-full gap-2"><RefreshCw className="w-4 h-4" />Изменить код доступа</Button>
            </div>
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Default Settings */}
        {canPerm('view_settings_defaults') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.defaults} onOpenChange={(open) => setExpandedSections({...expandedSections, defaults: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.defaults ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.defaults ? 'bg-purple-600' : 'bg-purple-100'}`}><Palette className={`w-5 h-5 ${expandedSections.defaults ? 'text-white' : 'text-purple-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.defaults ? 'text-purple-700' : 'text-slate-900'}`}>{t(lang,'settings_defaults_title')}</h3><p className="text-xs text-slate-500">Размеры, цвета и типы товаров по умолчанию</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.defaults ? 'rotate-180 text-purple-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><Label>{t(lang,'settings_product_type')}</Label><Select value={formData.default_product_type} onValueChange={(v) => setFormData({ ...formData, default_product_type: v })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{PRODUCT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t(lang,'settings_color')}</Label><Select value={formData.default_color} onValueChange={(v) => setFormData({ ...formData, default_color: v })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{COLORS.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t(lang,'settings_size_from')}</Label><Input type="text" pattern="[0-9]*" inputMode="numeric" value={formData.default_size_from} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setFormData({ ...formData, default_size_from: val ? parseInt(val) : '' }); }} className="mt-1.5" /></div>
              <div><Label>{t(lang,'settings_size_to')}</Label><Input type="text" pattern="[0-9]*" inputMode="numeric" value={formData.default_size_to} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setFormData({ ...formData, default_size_to: val ? parseInt(val) : '' }); }} className="mt-1.5" /></div>
              <div><Label>{t(lang,'settings_pairs_per_box')}</Label><Select value={String(formData.default_pairs_per_box)} onValueChange={(v) => setFormData({ ...formData, default_pairs_per_box: parseInt(v) })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{[4, 6, 8, ...(business?.custom_pairs_per_box || [])].sort((a, b) => a - b).map(v => <SelectItem key={v} value={String(v)}>{v} пар в коробке</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="flex items-center gap-2">🔴 Лимит «Мало на складе» (коробок)</Label><div className="flex items-center gap-3 mt-1.5"><Input type="text" inputMode="numeric" pattern="[0-9]*" value={formData.low_stock_limit} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setFormData({ ...formData, low_stock_limit: val ? parseInt(val) : 0 }); }} className="w-24" /><p className="text-xs text-slate-500">Товары с ≤ <strong>{formData.low_stock_limit}</strong> коробок будут подсвечены красным</p></div></div>
            </div>

            <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
              <div className="flex items-center gap-2 mb-3">
                <PackageOpen className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300">Владелец по умолчанию для реализации</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">При добавлении чужого товара имя этого владельца подставится автоматически. Можно не вводить имя каждый раз — система возьмёт его отсюда.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Имя владельца</Label><Input value={formData.default_consignment_owner} onChange={(e) => setFormData({ ...formData, default_consignment_owner: e.target.value })} placeholder="Напр. Ахмад" className="mt-1.5" /></div>
                <div><Label>Email владельца (необяз.)</Label><Input value={formData.default_consignment_owner_email} onChange={(e) => setFormData({ ...formData, default_consignment_owner_email: e.target.value })} placeholder="email (необяз.)" className="mt-1.5" /></div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Employees */}
        {canPerm('manage_employees') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.employees} onOpenChange={(open) => setExpandedSections({...expandedSections, employees: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.employees ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.employees ? 'bg-green-600' : 'bg-green-100'}`}><Users className={`w-5 h-5 ${expandedSections.employees ? 'text-white' : 'text-green-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.employees ? 'text-green-700' : 'text-slate-900'}`}>{t(lang,'settings_employees')}</h3><p className="text-xs text-slate-500">{employees.length} сотрудник(ов) · <span className="text-emerald-600 font-medium">{employees.filter(e => e.last_login_at).length} входили</span></p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.employees ? 'rotate-180 text-green-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4">
            <button onClick={() => setShowAddEmployeeForm(true)} className="w-full mb-4 flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all text-indigo-600 font-semibold text-sm">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></div>Добавить сотрудника
            </button>
            <div className="space-y-3">
              {employees.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center"><p className="text-2xl font-bold text-slate-800">{employees.length}</p><p className="text-xs text-slate-500">Всего</p></div>
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-center"><p className="text-2xl font-bold text-emerald-700">{employees.filter(e => e.last_login_at && (Date.now() - new Date(e.last_login_at).getTime()) < 10 * 60 * 1000).length}</p><p className="text-xs text-emerald-600">Онлайн</p></div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center"><p className="text-2xl font-bold text-slate-600">{employees.filter(e => e.is_frozen).length}</p><p className="text-xs text-slate-500">Заморожено</p></div>
                </div>
              )}
              {employees.map(employee => <EmployeeCard key={employee.id} employee={employee} business={business} onEdit={setEditingEmployee} onDelete={handleDeleteEmployee} />)}
              {employees.length === 0 && <p className="text-center text-slate-500 py-8">{t(lang,'settings_emp_empty')}</p>}
            </div>
            {editingEmployee && <EmployeePermissionsDialog employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSaved={loadData} />}
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Notifications Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.notifications} onOpenChange={(open) => setExpandedSections({...expandedSections, notifications: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.notifications ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.notifications ? 'bg-yellow-500' : 'bg-yellow-100'}`}><Bell className={`w-5 h-5 ${expandedSections.notifications ? 'text-white' : 'text-yellow-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.notifications ? 'text-yellow-700' : 'text-slate-900'}`}>{t(lang,'settings_notif_title')}</h3><p className="text-xs text-slate-500">Telegram, WhatsApp и Email уведомления</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.notifications ? 'rotate-180 text-yellow-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4">
            <NotificationsSettingsPanel
              business={business}
              onUpdate={setBusiness}
              lang={lang}
              user={user}
              currentEmployee={currentEmployee}
              canPerm={canPerm}
              loadData={loadData}
              formData={formData}
              setFormData={setFormData}
            />
          </CollapsibleContent>
        </Collapsible></div>

        {/* Custom Fields */}
        {canPerm('view_settings_custom') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.custom} onOpenChange={(open) => setExpandedSections({...expandedSections, custom: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.custom ? 'bg-pink-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.custom ? 'bg-pink-600' : 'bg-pink-100'}`}><Palette className={`w-5 h-5 ${expandedSections.custom ? 'text-white' : 'text-pink-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.custom ? 'text-pink-700' : 'text-slate-900'}`}>{t(lang,'settings_custom_title')}</h3><p className="text-xs text-slate-500">Пользовательские цвета и типы товаров</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.custom ? 'rotate-180 text-pink-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            {business && <CustomFieldsPanel business={business} onUpdate={setBusiness} lang={lang} />}
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* History */}
        {canPerm('view_activity_log') ? <div onClick={() => navigate(createPageUrl('ActivityLog'))} className="bg-white hover:bg-indigo-50 rounded-2xl p-4 cursor-pointer border border-slate-100 flex items-center justify-between transition-all shadow-sm">
          <div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 rounded-lg"><History className="w-5 h-5 text-indigo-600" /></div><div><h3 className="font-semibold text-slate-900">История действий</h3><p className="text-xs text-slate-500">Все изменения, удаления и создания.</p></div></div>
          <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
        </div> : null}

        {/* Employee Login */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.employee_login} onOpenChange={(open) => setExpandedSections({...expandedSections, employee_login: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.employee_login ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.employee_login ? 'bg-purple-600' : 'bg-purple-100'}`}><Users className={`w-5 h-5 ${expandedSections.employee_login ? 'text-white' : 'text-purple-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.employee_login ? 'text-purple-700' : 'text-slate-900'}`}>Войти как сотрудник</h3><p className="text-xs text-slate-500">Подключиться к другому бизнесу по кодам</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.employee_login ? 'rotate-180 text-purple-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-6">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"><p className="text-sm text-yellow-800">🔒 Введите коды, полученные от владельца бизнеса.</p></div>
              <div><Label>Код бизнеса</Label><Input value={empLoginCode} onChange={(e) => setEmpLoginCode(e.target.value.toUpperCase())} placeholder="XXXXXXXXXXXX" className="mt-1.5 font-mono" /></div>
              <div><Label>Код доступа</Label><Input value={empAccessCode} onChange={(e) => setEmpAccessCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" className="mt-1.5 font-mono" /></div>
              {empLoginError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{empLoginError}</div>}
              <Button onClick={async () => {
                setEmpLoginLoading(true); setEmpLoginError('');
                try {
                  const bizes = await base44.entities.Business.filter({ business_code: empLoginCode.trim(), access_code: empAccessCode.trim() });
                  if (!bizes.length) { setEmpLoginError('Неверные коды доступа'); return; }
                  const biz = bizes[0];
                  const cu = await base44.auth.me();
                  const emp = await base44.entities.Employee.filter({ business_id: biz.id, user_email: cu.email });
                  if (!emp.length) { setEmpLoginError('Вы не добавлены как сотрудник этого бизнеса.'); return; }
                  const empRecord = emp[0];
                  localStorage.setItem('barakatcrm_mode', `employee_${empRecord.id}`);
                  sessionStorage.setItem('barakatcrm_mode', `employee_${empRecord.id}`);
                  if (empRecord.login_session_token) localStorage.setItem(`barakat_emp_token_${empRecord.id}`, empRecord.login_session_token);
                  saveBusinessToHistory(biz.id, biz.name, empRecord.id, empRecord.name || '', 'employee');
                  navigate(createPageUrl('Dashboard'));
                } catch (e) { setEmpLoginError('Ошибка: ' + e.message); } finally { setEmpLoginLoading(false); }
              }} disabled={empLoginLoading || !empLoginCode || !empAccessCode} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
                {empLoginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}Войти как сотрудник
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible></div>

        {/* Recent Businesses */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.recent_businesses} onOpenChange={(open) => setExpandedSections({...expandedSections, recent_businesses: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.recent_businesses ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.recent_businesses ? 'bg-teal-600' : 'bg-teal-100'}`}><History className={`w-5 h-5 ${expandedSections.recent_businesses ? 'text-white' : 'text-teal-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.recent_businesses ? 'text-teal-700' : 'text-slate-900'}`}>Недавние бизнесы</h3><p className="text-xs text-slate-500">Быстрый вход в бизнесы, в которых вы работали</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.recent_businesses ? 'rotate-180 text-teal-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4"><RecentBusinessesPanel currentUser={user} /></CollapsibleContent>
        </Collapsible></div>

        {/* Security */}
        {canPerm('view_settings_security') ? <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><Collapsible open={expandedSections.security} onOpenChange={(open) => setExpandedSections({...expandedSections, security: open})}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer flex items-center justify-between transition-all ${expandedSections.security ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg transition-colors ${expandedSections.security ? 'bg-red-600' : 'bg-red-100'}`}><Shield className={`w-5 h-5 ${expandedSections.security ? 'text-white' : 'text-red-600'}`} /></div><div><h3 className={`font-semibold ${expandedSections.security ? 'text-red-700' : 'text-slate-900'}`}>{t(lang,'settings_security')}</h3><p className="text-xs text-slate-500">Аккаунт, устройства и резервные копии</p></div></div>
              <ChevronDown className={`w-5 h-5 transition ${expandedSections.security ? 'rotate-180 text-red-600' : 'text-slate-500'}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
            <DeviceSessionsPanel business={business} currentUserEmail={user?.email} />

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /><span className="text-sm font-semibold text-slate-700">Сотрудники в системе</span></div>
                <button onClick={async () => { setEmpRefreshing(true); await loadData(); setEmpRefreshing(false); }} disabled={empRefreshing} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${empRefreshing ? 'animate-spin' : ''}`} />Обновить
                </button>
              </div>
              <div className="p-3 space-y-2">
                {employees.length === 0 && <div className="text-center py-5"><Users className="w-8 h-8 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">Нет сотрудников</p></div>}
                {employees.map(emp => {
                  const lastLogin = emp.last_login_at ? new Date(emp.last_login_at) : null;
                  const diffMs = lastLogin ? Date.now() - lastLogin.getTime() : null;
                  const isOnline = diffMs !== null && diffMs < 10 * 60 * 1000;
                  const lastSeenText = !lastLogin ? 'Не входил' : diffMs < 60000 ? 'только что' : diffMs < 3600000 ? `${Math.floor(diffMs / 60000)} мин. назад` : diffMs < 86400000 ? `${Math.floor(diffMs / 3600000)} ч. назад` : `${Math.floor(diffMs / 86400000)} дн. назад`;
                  const getDeviceLabel = (ua) => { if (!ua) return '—'; const isMobile = /iPhone|Android.*Mobile/i.test(ua); const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua); const isIOS = /iPhone|iPad/i.test(ua); const isAndroid = /Android/i.test(ua); const isWindows = /Windows/i.test(ua); const isMac = /Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua); const isChrome = /Chrome/i.test(ua) && !/Edge|OPR/i.test(ua); const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua); const isEdge = /Edg/i.test(ua); let device = isMobile ? '📱 Телефон' : isTablet ? '📱 Планшет' : '💻 Компьютер'; let os = isIOS ? 'iOS' : isAndroid ? 'Android' : isWindows ? 'Windows' : isMac ? 'macOS' : ''; let browser = isEdge ? 'Edge' : isChrome ? 'Chrome' : isSafari ? 'Safari' : ''; return `${device}${os ? ' · ' + os : ''}${browser ? ' · ' + browser : ''}`; };
                  return (
                    <div key={emp.id}>
                      <div onClick={() => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${emp.is_frozen ? 'bg-blue-50 border-blue-200 opacity-70' : isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'} ${selectedEmp?.id === emp.id ? 'ring-2 ring-indigo-300' : ''}`}>
                        <div className="relative flex-shrink-0"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">{emp.name?.charAt(0)?.toUpperCase() || '?'}</div><span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p><p className="text-xs text-slate-400 truncate">{isOnline ? <span className="text-emerald-600 font-medium">● В сети сейчас</span> : lastSeenText}</p>{emp.device_info && <p className="text-xs text-slate-400 truncate">{getDeviceLabel(emp.device_info)}</p>}</div>
                        {emp.is_frozen && <span className="text-xs text-blue-600 font-medium flex-shrink-0">🧊 Заморожен</span>}
                        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${selectedEmp?.id === emp.id ? 'rotate-180' : ''}`} />
                      </div>
                      {selectedEmp?.id === emp.id && (
                        <div className="mt-2 mb-1 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 border border-indigo-100 p-4 space-y-3 shadow-sm" onClick={e => e.stopPropagation()}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs"><span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">✉️</span><span className="text-slate-400 w-20 flex-shrink-0">Email</span><span className="font-medium text-slate-700 truncate">{emp.user_email}</span></div>
                            <div className="flex items-center gap-2 text-xs"><span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">📞</span><span className="text-slate-400 w-20 flex-shrink-0">Телефон</span><span className="font-medium text-slate-700">{emp.phone || '—'}</span></div>
                            <div className="flex items-center gap-2 text-xs"><span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">🕐</span><span className="text-slate-400 w-20 flex-shrink-0">Вход</span><span className="font-medium text-slate-700">{lastLogin ? lastLogin.toLocaleString('ru') : 'Не входил'}</span></div>
                            <div className="flex items-center gap-2 text-xs"><span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">💻</span><span className="text-slate-400 w-20 flex-shrink-0">Устройство</span><span className="font-medium text-slate-700 truncate">{getDeviceLabel(emp.device_info)}</span></div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async (e) => { e.stopPropagation(); if (!confirm(`Сбросить сеанс ${emp.name}?`)) return; const history = emp.change_history || []; const newToken = crypto.randomUUID(); await base44.entities.Employee.update(emp.id, { login_session_token: newToken, change_history: [...history, { timestamp: new Date().toISOString(), by_email: user?.email, changes: [{ field: 'session', newValue: 'reset', oldValue: null }] }] }); localStorage.removeItem(`barakat_emp_token_${emp.id}`); setSelectedEmp(null); await loadData(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-sm"><LogOut className="w-3.5 h-3.5" />Сбросить сеанс</button>
                            {!emp.is_frozen
                              ? <button onClick={async (e) => { e.stopPropagation(); if (!confirm(`Заморозить ${emp.name}?`)) return; const history = emp.change_history || []; await base44.entities.Employee.update(emp.id, { is_frozen: true, login_session_token: crypto.randomUUID(), change_history: [...history, { timestamp: new Date().toISOString(), by_email: user?.email, changes: [{ field: 'is_frozen', oldValue: 'false', newValue: 'true' }] }] }); localStorage.removeItem(`barakat_emp_token_${emp.id}`); setSelectedEmp(null); await loadData(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm">🧊 Заморозить</button>
                              : <button onClick={async (e) => { e.stopPropagation(); const history = emp.change_history || []; await base44.entities.Employee.update(emp.id, { is_frozen: false, change_history: [...history, { timestamp: new Date().toISOString(), by_email: user?.email, changes: [{ field: 'is_frozen', oldValue: 'true', newValue: 'false' }] }] }); setSelectedEmp(null); await loadData(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold transition-all shadow-sm"><RefreshCw className="w-3.5 h-3.5" />Разморозить</button>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {employees.filter(e => !e.is_frozen).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 gap-2" onClick={async () => { if (!confirm('Завершить сеансы ВСЕХ сотрудников?')) return; await Promise.all(employees.filter(e => !e.is_frozen).map(e => { localStorage.removeItem(`barakat_emp_token_${e.id}`); return base44.entities.Employee.update(e.id, { is_frozen: true, login_session_token: crypto.randomUUID() }); })); await loadData(); }}><LogOut className="w-4 h-4" />Завершить все сеансы</Button>
                  </div>
                )}
              </div>
            </div>

            {business && <AutomationPanel business={business} />}
            {canPerm('backup_data') && <BackupExportPanel business={business} onBackupJSON={handleBackup} />}

            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-blue-700">{t(lang,'settings_sec_cache')}</span></div>
              <div className="p-4"><p className="text-sm text-slate-500 mb-3">{t(lang,'settings_sec_cache_desc')}</p><Button onClick={handleClearCache} disabled={clearingCache} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-2">{clearingCache ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}{t(lang,'settings_sec_cache')}</Button></div>
            </div>

            {canPerm('delete_all_data') && <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold text-red-700">Опасная зона</span></div>
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-800">{t(lang,'settings_sec_delete')}</p><p className="text-xs text-slate-400 mt-0.5">{t(lang,'settings_sec_delete_desc')}</p></div><Button variant="outline" size="sm" className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={handleDeleteAllData}><Trash2 className="w-3.5 h-3.5" />Удалить данные</Button></div>
                <div className="flex items-start justify-between gap-4 pt-3 border-t border-red-50"><div><p className="text-sm font-medium text-slate-800">Удалить аккаунт</p><p className="text-xs text-slate-400 mt-0.5">Необратимое удаление аккаунта</p></div><Button variant="outline" size="sm" className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100 gap-1.5" onClick={() => setDeleteAccountDialog(true)}><Zap className="w-3.5 h-3.5" />Удалить аккаунт</Button></div>
              </div>
            </div>}
          </CollapsibleContent>
        </Collapsible></div> : null}

        {/* Language selector — at the very bottom, below security */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30"><Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">🌐 Язык интерфейса</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Выберите язык системы</p>
              </div>
            </div>
            <Select value={formData.language} onValueChange={async (v) => { setFormData({ ...formData, language: v }); setLang(v); if (business) await base44.entities.Business.update(business.id, { language: v }); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save Button — sticky bottom bar */}
      <div className="sticky bottom-0 z-30 mt-6 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {saveError && (
          <div className="mb-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{saveError}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2 px-10 py-2.5 h-11 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all">
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Сохранение...</> : saved ? <><CheckCircle className="w-5 h-5" />Сохранено!</> : <><Save className="w-5 h-5" />{t(lang, 'settings_save')}</>}
          </Button>
        </div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeForm} onOpenChange={(open) => { setShowAddEmployeeForm(open); if (!open) setNewEmployee({ name: '', user_email: '', phone: '', role: 'Продавец', permissions: { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false }, custom_permissions: [] }); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5 text-white" /></div>
            <div><DialogTitle className="text-white font-bold text-lg leading-tight">{t(lang,'settings_emp_add')}</DialogTitle><p className="text-indigo-100 text-xs mt-0.5">Заполните данные нового сотрудника</p></div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t(lang,'settings_emp_name')}</Label><Input value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} placeholder="Иван Иванов" className="mt-1.5 rounded-xl" /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</Label><Input type="email" value={newEmployee.user_email} onChange={(e) => setNewEmployee({ ...newEmployee, user_email: e.target.value })} placeholder="email@example.com" className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t(lang,'settings_phone')}</Label><Input value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} placeholder="+992 XX XXX XX XX" className="mt-1.5 rounded-xl" /></div>
              <div><Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Роль</Label><Select value={newEmployee.role} onValueChange={(v) => { let permissions = { ...newEmployee.permissions }; if (v === 'Продавец') permissions = { view_analytics: false, view_profit: false, view_products: true, add_products: true, edit_products: false, delete_products: false, view_sales: true, add_sales: true, edit_sales: false, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: false, view_debts: false, manage_debts: false, manage_returns: false, view_activity_log: false }; else if (v === 'Менеджер') permissions = { view_analytics: true, view_profit: false, view_products: true, add_products: true, edit_products: true, delete_products: false, view_sales: true, add_sales: true, edit_sales: true, cancel_sales: false, view_warehouses: true, manage_warehouses: false, view_customers: true, manage_customers: true, view_debts: true, manage_debts: true, manage_returns: true, view_activity_log: false }; setNewEmployee({ ...newEmployee, role: v, permissions }); }}><SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Продавец">🛍️ Продавец</SelectItem><SelectItem value="Менеджер">👔 Менеджер</SelectItem><SelectItem value="Кладовщик">📦 Кладовщик</SelectItem><SelectItem value="Доставщик">🚚 Доставщик</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowAddEmployeeForm(false)}>Отмена</Button>
              <Button onClick={async () => { await handleAddEmployee(); setShowAddEmployeeForm(false); }} disabled={!newEmployee.name || !newEmployee.user_email} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold gap-2"><Plus className="w-4 h-4" />Добавить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SwitchAccountDialog open={switchAccountOpen} onClose={() => setSwitchAccountOpen(false)} currentUser={user} currentEmployeeId={currentEmployee?.id} />

      <Dialog open={deleteAccountDialog} onOpenChange={setDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Подтвердить удаление аккаунта</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">⚠️ Это действие необратимо. Все ваши данные будут удалены безвозвратно.</p></div>
            <div><Label className="text-red-700">Введите ваш email для подтверждения</Label><Input type="email" placeholder={user?.email} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="mt-1.5" /></div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setDeleteAccountDialog(false); setDeleteConfirmation(''); }}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmation !== user?.email}>Удалить аккаунт</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}