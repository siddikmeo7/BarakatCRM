import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart3, LineChart, PieChart, Activity, Save, Loader2, ArrowLeft } from 'lucide-react';

const CHART_TYPES = [
  { value: 'line', label: 'Линейный', icon: LineChart },
  { value: 'bar', label: 'Столбцы', icon: BarChart3 },
  { value: 'area', label: 'Площадь', icon: Activity },
  { value: 'pie', label: 'Круговой', icon: PieChart },
  { value: 'donut', label: 'Кольцо', icon: PieChart }
];

const PAGES = [
  { value: 'analytics', label: 'Аналитика' },
  { value: 'products', label: 'Товары' },
  { value: 'sales', label: 'Продажи' },
  { value: 'warehouses', label: 'Склады' },
  { value: 'customers', label: 'Клиенты' },
  { value: 'debts', label: 'Долги' }
];

const METRICS = {
  analytics: ['sales', 'profit', 'boxes'],
  products: ['stock_value', 'low_stock'],
  sales: ['daily_sales', 'cash_vs_debt'],
  warehouses: ['warehouse_value', 'products_by_warehouse'],
  customers: ['customer_debt', 'top_customers'],
  debts: ['debt_trend', 'payments']
};

export default function ChartSettings() {
  const [business, setBusiness] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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
        
        const prefsData = await base44.entities.ChartPreference.filter({ business_id: biz.id });
        setPreferences(prefsData);
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
      // Удаляем старые настройки
      const deletePromises = preferences.map(p => base44.entities.ChartPreference.delete(p.id));
      await Promise.all(deletePromises);

      // Создаём новые
      const newPrefs = preferences.map(p => ({
        business_id: business.id,
        page: p.page,
        chart_type: p.chart_type,
        metric: p.metric,
        time_period: p.time_period,
        is_visible: p.is_visible
      }));

      if (newPrefs.length > 0) {
        await base44.entities.ChartPreference.bulkCreate(newPrefs);
      }

      navigate(createPageUrl('Analytics'));
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (page, field, value) => {
    const existing = preferences.find(p => p.page === page);
    if (existing) {
      setPreferences(preferences.map(p => 
        p.page === page ? { ...p, [field]: value } : p
      ));
    } else {
      setPreferences([...preferences, {
        page,
        chart_type: 'line',
        metric: METRICS[page]?.[0] || 'sales',
        time_period: 7,
        is_visible: true,
        [field]: value
      }]);
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
        title="Настройка графиков"
        subtitle="Выберите типы графиков для каждого раздела"
        actions={
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {PAGES.map(page => {
          const pref = preferences.find(p => p.page === page.value) || {
            page: page.value,
            chart_type: 'line',
            metric: METRICS[page.value]?.[0],
            time_period: 7
          };

          return (
            <div key={page.value} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{page.label}</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Тип графика</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {CHART_TYPES.map(type => {
                      const Icon = type.icon;
                      const isSelected = pref.chart_type === type.value;
                      
                      return (
                        <button
                          key={type.value}
                          onClick={() => updatePreference(page.value, 'chart_type', type.value)}
                          className={`p-3 border rounded-xl flex items-center gap-2 transition-all ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Период</Label>
                  <Select 
                    value={String(pref.time_period)} 
                    onValueChange={(v) => updatePreference(page.value, 'time_period', parseInt(v))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 дней</SelectItem>
                      <SelectItem value="14">14 дней</SelectItem>
                      <SelectItem value="30">30 дней</SelectItem>
                      <SelectItem value="90">90 дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}