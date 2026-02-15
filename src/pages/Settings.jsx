import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  LogOut
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
  const [newColor, setNewColor] = useState('');
  const [newProductType, setNewProductType] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editColorDialog, setEditColorDialog] = useState(false);
  const [editTypeDialog, setEditTypeDialog] = useState(false);

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
        actions={
          <Button 
            variant="outline" 
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => {
              if (confirm('Вы уверены, что хотите выйти?')) {
                base44.auth.logout();
              }
            }}
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        }
      />

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 flex-wrap">
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
            <Bell className="w-4 h-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Palette className="w-4 h-4" />
            Кастомные поля
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Settings className="w-4 h-4" />
            Безопасность
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

        {/* Custom Fields */}
        <TabsContent value="custom">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Кастомные поля</h3>
            
            <div className="space-y-6 max-w-2xl">
              {/* Custom Colors */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Дополнительные цвета</h4>
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
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Дополнительные типы товара</h4>
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
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Безопасность и аккаунт</h3>
            
            <div className="space-y-6 max-w-xl">
              <div className="p-4 border border-slate-200 rounded-xl">
                <h4 className="font-medium text-slate-900 mb-2">Информация аккаунта</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">Email: <span className="font-medium text-slate-900">{user?.email}</span></p>
                  <p className="text-slate-600">Имя: <span className="font-medium text-slate-900">{user?.full_name || 'Не указано'}</span></p>
                  <p className="text-slate-600">Роль: <span className="font-medium text-slate-900">{user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</span></p>
                </div>
              </div>

              <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Резервное копирование</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Рекомендуем регулярно создавать резервные копии ваших данных
                    </p>
                    <Button variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                      Создать резервную копию
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                <h4 className="font-semibold text-red-900 mb-2">Удаление данных</h4>
                <p className="text-sm text-red-700 mb-3">
                  Удаление всех данных бизнеса. Это действие необратимо!
                </p>
                <Button 
                  variant="outline" 
                  className="text-red-700 border-red-300 hover:bg-red-100"
                  onClick={() => {
                    if (confirm('Вы уверены? Все данные будут безвозвратно удалены!')) {
                      if (confirm('Это последнее предупреждение! Вы точно хотите удалить все данные?')) {
                        alert('Функция удаления временно недоступна. Обратитесь в поддержку.');
                      }
                    }
                  }}
                >
                  Удалить все данные
                </Button>
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

      {/* Edit Color Dialog */}
      <Dialog open={editColorDialog} onOpenChange={setEditColorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать цвет</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Название цвета</Label>
            <Input
              value={editingColor?.value || ''}
              onChange={(e) => setEditingColor({ ...editingColor, value: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditColorDialog(false)}>
              Отмена
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
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={editTypeDialog} onOpenChange={setEditTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать тип товара</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Название типа</Label>
            <Input
              value={editingType?.value || ''}
              onChange={(e) => setEditingType({ ...editingType, value: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditTypeDialog(false)}>
              Отмена
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
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}