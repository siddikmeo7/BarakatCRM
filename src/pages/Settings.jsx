import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Bell
} from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
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
    role: 'Менеджер'
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
      await loadData();
      setNewEmployee({ name: '', user_email: '', phone: '', role: 'Менеджер' });
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (confirm('Удалить этого сотрудника?')) {
      await base44.entities.Employee.delete(employeeId);
      await loadData();
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
        title="Настройки"
        subtitle="Управление настройками бизнеса"
      />

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            Бизнес
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Palette className="w-4 h-4" />
            По умолчанию
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="w-4 h-4" />
            Сотрудники
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Информация о бизнесе</h3>
            
            <div className="grid gap-6 max-w-xl">
              <div>
                <Label>Название бизнеса</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+992 XXX XX XX XX"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Адрес</Label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Город, улица, дом"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Язык интерфейса</Label>
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger className="mt-1.5">
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
          </div>
        </TabsContent>

        {/* Default Settings */}
        <TabsContent value="defaults">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Настройки по умолчанию для товаров</h3>
            
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
              <div>
                <Label>Тип товара</Label>
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
                <Label>Цвет</Label>
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
                <Label>Размер от</Label>
                <Input 
                  type="number"
                  value={formData.default_size_from}
                  onChange={(e) => setFormData({ ...formData, default_size_from: parseInt(e.target.value) })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Размер до</Label>
                <Input 
                  type="number"
                  value={formData.default_size_to}
                  onChange={(e) => setFormData({ ...formData, default_size_to: parseInt(e.target.value) })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Пар в коробке</Label>
                <Select value={String(formData.default_pairs_per_box)} onValueChange={(v) => setFormData({ ...formData, default_pairs_per_box: parseInt(v) })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 пары</SelectItem>
                    <SelectItem value="6">6 пар</SelectItem>
                    <SelectItem value="8">8 пар</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Сотрудники</h3>
            
            {/* Add Employee Form */}
            <div className="p-4 bg-slate-50 rounded-xl mb-6">
              <h4 className="font-medium text-slate-900 mb-4">Добавить сотрудника</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Имя</Label>
                  <Input 
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Имя сотрудника"
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
                  <Label>Телефон</Label>
                  <Input 
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="+992 XXX XX XX XX"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Роль</Label>
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
                Добавить
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
                  Сотрудники пока не добавлены
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Настройки уведомлений</h3>
            
            <div className="space-y-6 max-w-xl">
              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">WhatsApp уведомления</h4>
                  <p className="text-sm text-slate-500 mb-3">
                    Отправлять уведомления клиентам в WhatsApp при продаже в долг и оплате
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
                      Включить WhatsApp уведомления
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Email уведомления</h4>
                  <p className="text-sm text-slate-500 mb-3">
                    Отправлять уведомления клиентам на Email при продаже в долг и оплате
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
                      Включить Email уведомления
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Когда отправляются уведомления</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• При продаже товара в долг клиенту</li>
                      <li>• При частичной оплате долга</li>
                      <li>• При полном погашении долга</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-900 mb-2">Язык уведомлений</h4>
                <Select 
                  value={user?.language || formData.language} 
                  onValueChange={async (v) => {
                    await base44.auth.updateMe({ language: v });
                    setFormData({ ...formData, language: v });
                    await loadData();
                  }}
                >
                  <SelectTrigger className="w-48">
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
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
              Сохранено
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить изменения
            </>
          )}
        </Button>
      </div>
    </div>
  );
}