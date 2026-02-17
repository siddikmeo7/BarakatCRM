import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Box,
  Package,
  Users,
  CreditCard,
  BarChart3,
  PieChart,
  Save,
  Loader2,
  GripVertical
} from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { id: 'sales', label: 'Выручка', icon: ShoppingCart },
  { id: 'profit', label: 'Прибыль', icon: TrendingUp },
  { id: 'boxes', label: 'Коробок продано', icon: Box },
  { id: 'stock', label: 'Товары на складе', icon: Package },
  { id: 'debt', label: 'Долги клиентов', icon: CreditCard },
  { id: 'customers', label: 'Всего клиентов', icon: Users },
  { id: 'chart_sales', label: 'График продаж', icon: BarChart3 },
  { id: 'chart_profit', label: 'График прибыли', icon: BarChart3 },
  { id: 'sales_type', label: 'Наличные vs Долг', icon: PieChart },
  { id: 'top_products', label: 'Топ товары', icon: Package },
  { id: 'recent_sales', label: 'Последние продажи', icon: ShoppingCart }
];

export default function CustomizeDashboard() {
  const [business, setBusiness] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [selectedWidgets, setSelectedWidgets] = useState([]);
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
        
        const widgetsData = await base44.entities.DashboardWidget.filter({ business_id: biz.id });
        setWidgets(widgetsData.sort((a, b) => a.position - b.position));
        
        if (widgetsData.length === 0) {
          // Установить виджеты по умолчанию
          setSelectedWidgets(['sales', 'profit', 'boxes', 'chart_sales', 'sales_type', 'top_products']);
        } else {
          setSelectedWidgets(widgetsData.filter(w => w.is_visible).map(w => w.widget_type));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (widgetId) => {
    if (selectedWidgets.includes(widgetId)) {
      setSelectedWidgets(selectedWidgets.filter(id => id !== widgetId));
    } else {
      setSelectedWidgets([...selectedWidgets, widgetId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Удаляем старые виджеты
      const deletePromises = widgets.map(w => base44.entities.DashboardWidget.delete(w.id));
      await Promise.all(deletePromises);

      // Создаём новые виджеты
      const newWidgets = selectedWidgets.map((widgetType, index) => ({
        business_id: business.id,
        widget_type: widgetType,
        position: index,
        is_visible: true
      }));

      if (newWidgets.length > 0) {
        await base44.entities.DashboardWidget.bulkCreate(newWidgets);
      }

      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error saving widgets:', error);
    } finally {
      setSaving(false);
    }
  };

  const moveWidget = (index, direction) => {
    const newOrder = [...selectedWidgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setSelectedWidgets(newOrder);
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
        title="Настроить главную страницу"
        subtitle="Выберите виджеты для отображения"
        actions={
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate(createPageUrl('Dashboard'))}
            >
              Назад
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Available Widgets */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Доступные виджеты</h3>
          <div className="space-y-2">
            {AVAILABLE_WIDGETS.map(widget => {
              const Icon = widget.icon;
              const isSelected = selectedWidgets.includes(widget.id);
              
              return (
                <div 
                  key={widget.id}
                  onClick={() => handleToggle(widget.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-200' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} />
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                      {widget.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Widgets Preview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">
            Выбрано ({selectedWidgets.length})
          </h3>
          <div className="space-y-2">
            {selectedWidgets.map((widgetId, index) => {
              const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId);
              if (!widget) return null;
              
              const Icon = widget.icon;
              
              return (
                <div 
                  key={widgetId}
                  className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Icon className="w-5 h-5 text-indigo-600" />
                  <span className="flex-1 font-medium text-slate-900">{widget.label}</span>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveWidget(index, 'up')}
                        className="h-8 w-8"
                      >
                        ↑
                      </Button>
                    )}
                    {index < selectedWidgets.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveWidget(index, 'down')}
                        className="h-8 w-8"
                      >
                        ↓
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {selectedWidgets.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                Выберите виджеты из списка слева
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}