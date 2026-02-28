import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import DateFilter from '@/components/filters/DateFilter';
import SalesChart from '@/components/charts/SalesChart';
import SalesTypeChart from '@/components/charts/SalesTypeChart';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Box,
  Layers,
  Hash,
  Plus,
  ArrowRight,
  Warehouse,
  Users,
  LayoutDashboard,
  Eye,
  EyeOff
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { t } from '@/components/i18n/translations';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';

export default function Dashboard() {
  const navigate = useNavigate();
  const { can, isReady } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hideData, setHideData] = useState(false);
  const [lang, setLang] = useState('ru');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    loadData();
  }, [navigate]);

  // Редирект на Analytics в мобильной версии (только если есть доступ)
  useEffect(() => {
    if (!loading && window.innerWidth < 768) {
      if (can('view_analytics')) {
        navigate(createPageUrl('Analytics'));
      }
      // Если нет доступа — остаёмся на Dashboard
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = localStorage.getItem('barakatcrm_mode') || sessionStorage.getItem('barakatcrm_mode');
      if (savedMode && savedMode.startsWith('employee_')) {
        const empId = savedMode.replace('employee_', '');
        const empRecords = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
        const emp = empRecords.find(e => e.id === empId) || empRecords[0];
        if (emp && !emp.is_frozen) {
          const bizList = await base44.entities.Business.filter({ id: emp.business_id });
          if (bizList.length > 0) biz = bizList[0];
        }
      }
      if (!biz) {
        const businesses = await base44.entities.Business.filter({ owner_email: user.email });
        if (businesses.length > 0) biz = businesses[0];
      }
      
      if (biz) {
        setBusiness(biz);
        setLang(biz.language || 'ru');
        
        const [salesData, productsData, warehousesData, customersData, widgetsData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.DashboardWidget.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData);
        setProducts(productsData);
        setWarehouses(warehousesData);
        setCustomers(customersData);
        setWidgets(widgetsData.filter(w => w.is_visible).sort((a, b) => a.position - b.position));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация продаж по дате (исключаем отменённые!)
  const filteredSales = sales.filter(sale => {
    if (sale.is_cancelled) return false; // не считать отменённые
    if (!dateRange?.from) return true;
    const saleDate = parseISO(sale.sale_date || sale.created_date);
    return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
  });

  // Расчёты
  const totalBoxes = filteredSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const totalPairs = filteredSales.reduce((sum, s) => sum + (s.pairs_sold || 0), 0);
  const totalItems = filteredSales.reduce((sum, s) => sum + (s.items_sold || 0), 0);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalStock = products.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);
  const totalStockValue = products.reduce((sum, p) => sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0);
  const totalPurchaseValue = products.reduce((sum, p) => sum + ((p.boxes_in_stock || 0) * (p.purchase_price || 0)), 0);
  const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  
  // Наличные vs Долг
  const cashSales = filteredSales.filter(s => !s.is_debt);
  const debtSales = filteredSales.filter(s => s.is_debt);
  const cashAmount = cashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const debtAmount = debtSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalSalesValue = cashAmount + debtAmount;

  // Топ товары
  const productSales = {};
  filteredSales.forEach(sale => {
    if (!productSales[sale.product_id]) {
      productSales[sale.product_id] = { boxes: 0, revenue: 0 };
    }
    productSales[sale.product_id].boxes += sale.boxes_sold || 0;
    productSales[sale.product_id].revenue += sale.total_amount || 0;
  });

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].boxes - a[1].boxes)
    .slice(0, 5)
    .map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      return { product, ...data };
    })
    .filter(item => item.product);

  if (loading) return <PageLoader message="Загрузка дашборда..." />;

  const masked = '•••••';

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t(lang, 'dash_title')}
        subtitle={`${t(lang, 'dash_welcome')}, ${business?.name}`}
        actions={
          <div className="flex gap-2">
            <Link to={createPageUrl('CustomizeDashboard')}>
              <Button variant="outline" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                {t(lang, 'dash_customize')}
              </Button>
            </Link>
            <Link to={createPageUrl('Sales')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus className="w-4 h-4" />
                {t(lang, 'dash_new_sale')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Date Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={() => setHideData(h => !h)} className="gap-1 text-xs">
            {hideData ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {hideData ? t(lang, 'dash_show') : t(lang, 'dash_hide')}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(widgets.length === 0 ? ['sales', 'profit', 'boxes', 'stock'] : widgets.filter(w => ['sales', 'profit', 'boxes', 'pairs', 'stock', 'debt', 'customers'].includes(w.widget_type))).map((widget) => {
          const widgetType = typeof widget === 'string' ? widget : widget.widget_type;
          const widgetConfigs = {
            sales: { title: t(lang,'dash_sales'), value: hideData ? masked : totalRevenue.toLocaleString(), subtitle: t(lang,'dash_somoni'), icon: ShoppingCart, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
            profit: { title: t(lang,'dash_profit'), value: (hideData || !can('view_profit')) ? masked : totalProfit.toLocaleString(), subtitle: t(lang,'dash_somoni'), icon: TrendingUp, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
            boxes: { title: t(lang,'dash_boxes_sold'), value: hideData ? masked : totalBoxes, icon: Box, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
            pairs: { title: t(lang,'dash_pairs_sold'), value: hideData ? masked : totalPairs, icon: Layers, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
            stock: { title: t(lang,'dash_stock'), value: hideData ? masked : `${totalStock} ${t(lang,'dash_boxes')}`, subtitle: (hideData || !can('view_stock_value')) ? masked : `${t(lang,'dash_purchase')}: ${totalPurchaseValue.toLocaleString()} с.`, icon: Warehouse, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
            debt: { title: t(lang,'dash_debt'), value: hideData ? masked : totalDebt.toLocaleString(), subtitle: t(lang,'dash_somoni'), icon: Users, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
            customers: { title: t(lang,'dash_customers'), value: customers.length, icon: Users, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' }
          };
          const config = widgetConfigs[widgetType];
          if (!config) return null;
          return <StatCard key={widgetType} {...config} />;
        })}
      </div>

      {/* Charts & Analytics */}
      {(widgets.length === 0 || widgets.some(w => ['chart_sales', 'sales_type'].includes(w.widget_type))) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {(widgets.length === 0 || widgets.some(w => w.widget_type === 'chart_sales')) && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">{t(lang,'dash_dynamics')}</h3>
              <SalesChart sales={filteredSales} days={7} showProfit={can('view_profit')} />
            </div>
          )}
          
          {(widgets.length === 0 || widgets.some(w => w.widget_type === 'sales_type')) && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">{t(lang,'dash_cash_vs_debt')}</h3>
              <div className="h-64">
                <SalesTypeChart sales={filteredSales} />
              </div>
              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <p className="text-sm font-medium text-slate-600">{t(lang,'dash_cash')}</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">
                    {hideData ? masked : `${totalSalesValue ? ((cashAmount / totalSalesValue) * 100).toFixed(1) : 0}%`}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{cashSales.length} {t(lang,'dash_sales_count')}</p>
                  <p className="text-lg font-semibold text-slate-900 mt-2">{hideData ? masked : `${cashAmount.toLocaleString()} с.`}</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <p className="text-sm font-medium text-slate-600">{t(lang,'dash_in_debt')}</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">
                    {hideData ? masked : `${totalSalesValue ? ((debtAmount / totalSalesValue) * 100).toFixed(1) : 0}%`}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{debtSales.length} {t(lang,'dash_sales_count')}</p>
                  <p className="text-lg font-semibold text-slate-900 mt-2">{hideData ? masked : `${debtAmount.toLocaleString()} с.`}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Products & Quick Actions */}
      {(widgets.length === 0 || widgets.some(w => w.widget_type === 'top_products')) && (
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{t(lang,'dash_top_products')}</h3>
            <Link to={createPageUrl('Products')} className="text-sm text-indigo-600 hover:text-indigo-700">
              {t(lang,'dash_all_products')}
            </Link>
          </div>
          <div className="space-y-3">
            {topProducts.length > 0 ? topProducts.map((item, index) => (
              <div key={item.product.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                  {index + 1}
                </div>
                {item.product.photo_url ? (
                  <img src={item.product.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.product.brand} {item.product.model}</p>
                  <p className="text-sm text-slate-500">{item.boxes} {t(lang,'dash_boxes')}</p>
                </div>
                <p className="font-semibold text-slate-900">{(hideData || !can('view_stock_value')) ? masked : `${item.revenue.toLocaleString()} с.`}</p>
              </div>
            )) : (
              <p className="text-center text-slate-500 py-8">{t(lang,'dash_no_sales')}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">{t(lang,'dash_quick_actions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to={createPageUrl('Products')}>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                <Package className="w-8 h-8 text-indigo-600 mb-2" />
                <p className="font-medium text-slate-900">{t(lang,'dash_add_product')}</p>
                <ArrowRight className="w-4 h-4 text-indigo-600 mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to={createPageUrl('Sales')}>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                <ShoppingCart className="w-8 h-8 text-emerald-600 mb-2" />
                <p className="font-medium text-slate-900">{t(lang,'dash_new_sale')}</p>
                <ArrowRight className="w-4 h-4 text-emerald-600 mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to={createPageUrl('Warehouses')}>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                <Warehouse className="w-8 h-8 text-purple-600 mb-2" />
                <p className="font-medium text-slate-900">{t(lang,'dash_warehouses')}</p>
                <ArrowRight className="w-4 h-4 text-purple-600 mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to={createPageUrl('Customers')}>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                <Users className="w-8 h-8 text-amber-600 mb-2" />
                <p className="font-medium text-slate-900">{t(lang,'dash_clients')}</p>
                <ArrowRight className="w-4 h-4 text-amber-600 mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}