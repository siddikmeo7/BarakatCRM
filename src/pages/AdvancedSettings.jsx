import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Palette,
  BarChart3,
  Bell,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  CheckCircle,
  Loader2,
  DollarSign,
  Globe
} from 'lucide-react';

export default function AdvancedSettings() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [settings, setSettings] = useState({
    currency: 'TJS',
    currency_symbol: 'с.',
    tax_rate: 0,
    low_stock_threshold: 5,
    auto_backup: false,
    notification_sound: true,
    compact_view: false,
    show_purchase_price: true,
    price_display: 'sale',
    theme: 'light'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        
        // Загрузить сохранённые настройки
        setSettings({
          currency: biz.currency || 'TJS',
          currency_symbol: biz.currency_symbol || 'с.',
          tax_rate: biz.tax_rate || 0,
          low_stock_threshold: biz.low_stock_threshold || 5,
          auto_backup: biz.auto_backup || false,
          notification_sound: biz.notification_sound !== false,
          compact_view: biz.compact_view || false,
          show_purchase_price: biz.show_purchase_price !== false,
          price_display: biz.price_display || 'sale',
          theme: biz.theme || 'light'
        });
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
      await base44.entities.Business.update(business.id, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
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
        title="Расширенные настройки"
        subtitle="Дополнительные параметры системы"
        actions={
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
                Сохранить
              </>
            )}
          </Button>
        }
      />

      <Tabs defaultValue="display" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1">
          <TabsTrigger value="display" className="gap-2">
            <Palette className="w-4 h-4" />
            Отображение
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Финансы
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Графики
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Shield className="w-4 h-4" />
            Система
          </TabsTrigger>
        </TabsList>

        {/* Display Settings */}
        <TabsContent value="display">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Настройки отображения</h3>
            
            <div className="space-y-6 w-full">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="font-medium text-slate-900">Компактный вид</h4>
                  <p className="text-sm text-slate-500">Уменьшить размеры карточек и элементов</p>
                </div>
                <Switch 
                  checked={settings.compact_view}
                  onCheckedChange={(v) => setSettings({ ...settings, compact_view: v })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="font-medium text-slate-900">Показывать цену закупки</h4>
                  <p className="text-sm text-slate-500">Отображать цены закупки в карточках товаров</p>
                </div>
                <Switch 
                  checked={settings.show_purchase_price}
                  onCheckedChange={(v) => setSettings({ ...settings, show_purchase_price: v })}
                />
              </div>

              <div>
                <Label>Отображение цены склада</Label>
                <Select 
                  value={settings.price_display} 
                  onValueChange={(v) => setSettings({ ...settings, price_display: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">По цене продажи (с прибылью)</SelectItem>
                    <SelectItem value="purchase">По цене закупки</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Тема оформления</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(v) => setSettings({ ...settings, theme: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Светлая</SelectItem>
                    <SelectItem value="dark">Тёмная</SelectItem>
                    <SelectItem value="auto">Автоматически</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financial">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Финансовые настройки</h3>
            
            <div className="space-y-6 max-w-xl">
              <div>
                <Label>Валюта</Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(v) => setSettings({ ...settings, currency: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TJS">Таджикский сомони (TJS)</SelectItem>
                    <SelectItem value="USD">Доллар США (USD)</SelectItem>
                    <SelectItem value="EUR">Евро (EUR)</SelectItem>
                    <SelectItem value="RUB">Российский рубль (RUB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Символ валюты</Label>
                <Input 
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  placeholder="с."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Налоговая ставка (%)</Label>
                <Input 
                  type="number"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">Будет автоматически рассчитываться в отчётах</p>
              </div>

              <div>
                <Label>Порог низкого остатка (коробок)</Label>
                <Input 
                  type="number"
                  value={settings.low_stock_threshold}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 5 })}
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">Товары с остатком ниже этого значения будут помечены</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Charts Settings */}
        <TabsContent value="charts">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Настройка графиков</h3>
                <p className="text-sm text-slate-500 mt-1">Выберите типы графиков для разных разделов</p>
              </div>
              <Link to={createPageUrl('ChartSettings')}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Настроить графики
                </Button>
              </Link>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <BarChart3 className="w-8 h-8 text-indigo-600 mb-3" />
                <h4 className="font-medium text-slate-900 mb-1">Аналитика</h4>
                <p className="text-sm text-slate-500">Линейный, столбцы, круговой</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <BarChart3 className="w-8 h-8 text-purple-600 mb-3" />
                <h4 className="font-medium text-slate-900 mb-1">Товары</h4>
                <p className="text-sm text-slate-500">График остатков</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <BarChart3 className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-medium text-slate-900 mb-1">Продажи</h4>
                <p className="text-sm text-slate-500">Динамика продаж</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Системные настройки</h3>
            
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="font-medium text-slate-900">Автоматическое резервное копирование</h4>
                  <p className="text-sm text-slate-500">Ежедневное создание резервных копий</p>
                </div>
                <Switch 
                  checked={settings.auto_backup}
                  onCheckedChange={(v) => setSettings({ ...settings, auto_backup: v })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="font-medium text-slate-900">Звук уведомлений</h4>
                  <p className="text-sm text-slate-500">Воспроизводить звук при новых событиях</p>
                </div>
                <Switch 
                  checked={settings.notification_sound}
                  onCheckedChange={(v) => setSettings({ ...settings, notification_sound: v })}
                />
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <Database className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Управление данными</h4>
                    <p className="text-sm text-slate-500 mb-3">Экспорт и импорт данных</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Экспорт данных
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Импорт данных
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">История хранится 90 дней</h4>
                    <p className="text-sm text-amber-700">
                      Записи в истории действий автоматически удаляются через 90 дней
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">Очистка данных</h4>
                    <p className="text-sm text-red-700 mb-3">
                      Полное удаление всех данных бизнеса
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="text-red-700 border-red-300 hover:bg-red-100 gap-2"
                  onClick={() => {
                    if (confirm('⚠️ ВНИМАНИЕ! Все данные будут безвозвратно удалены!')) {
                      if (confirm('Это последнее предупреждение! Введите название бизнеса для подтверждения в следующем окне.')) {
                        const confirmation = prompt(`Введите "${business.name}" для подтверждения:`);
                        if (confirmation === business.name) {
                          alert('Функция будет доступна в следующей версии. Обратитесь в поддержку.');
                        }
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить все данные
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}