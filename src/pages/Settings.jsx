import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { t } from '@/components/i18n/translations';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BackupExportPanel from '@/components/settings/BackupExportPanel';
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
  Database
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'tj', label: 'Тоҷикӣ' },
  { value: 'en', label: 'English' }
];

const PRODUCT_TYPES = ['Туфли', 'Спортивная обувь', 'Сапоги', 'Другое'];
const COLORS = ['Чёрный', 'Белый', 'Коричневый', 'Синий', 'Красный', 'Серый', 'Бежевый'];

export default function Settings() {
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
    default_product_type: 'Туфли'
  });

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    user_email: '',
    phone: '',
    role: 'Менеджер',
    permissions: {
      view_analytics: false,
      view_profit: false,
      add_products: true,
      edit_products: false,
      delete_products: false,
      add_sales: true,
      view_warehouses: true,
      manage_warehouses: false,
      view_customers: true,
      manage_customers: false,
      view_debts: false,
      manage_returns: false
    }
  });
  const [newColor, setNewColor] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    defaults: false,
    employees: false,
    notifications: false,
    custom: false,
    security: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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
          default_product_type: biz.default_product_type || 'Туфли'
        });

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
    if (!newEmployee.name || !newEmployee.user_email) return;
    
    try {
      await base44.entities.Employee.create({
        ...newEmployee,
        business_id: business.id,
        is_active: true
      });
      
      // Отправить приглашение на email
      try {
        await base44.integrations.Core.SendEmail({
          to: newEmployee.user_email,
          subject: `Приглашение в бизнес ${business.name}`,
          body: `Здравствуйте, ${newEmployee.name}!\n\nВы были добавлены как ${newEmployee.role} в бизнес "${business.name}".\n\nВойдите в систему BarakatCRM используя эту почту: ${newEmployee.user_email}\n\nС уважением,\n${business.name}`
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
      
      await loadData();
      setNewEmployee({ 
        name: '', 
        user_email: '', 
        phone: '', 
        role: 'Менеджер',
        permissions: {
          view_analytics: false,
          view_profit: false,
          add_products: true,
          edit_products: false,
          delete_products: false,
          add_sales: true,
          view_warehouses: true,
          manage_warehouses: false,
          view_customers: true,
          manage_customers: false,
          view_debts: false,
          manage_returns: false
        }
      });
    } catch (error) {
      console.error('Error adding employee:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                  <Select value={newEmployee.role} onValueChange={(v) => setNewEmployee({ ...newEmployee, role: v })}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Кладовщик">Кладовщик</SelectItem>
                      <SelectItem value="Менеджер">Менеджер</SelectItem>
                      <SelectItem value="Доставщик">Доставщик</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleAddEmployee}
                disabled={!newEmployee.name || !newEmployee.user_email}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t(lang,'add')}
              </Button>
            </div>

            {/* Employees List */}
            <div className="space-y-3">
              {employees.map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-600">
                        {employee.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{employee.name}</p>
                      <p className="text-sm text-slate-500">{employee.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700">
                      {employee.role}
                    </span>
                    <button 
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  {t(lang,'settings_emp_empty')}
                </p>
              )}
            </div>
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

        {/* History Tab */}
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
    </div>
  );
}