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
import ProductPhoto from '@/components/products/ProductPhoto';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { t } from '@/components/i18n/translations';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import PageLoader from '@/components/ui/PageLoader';
import { formatCompact } from '@/lib/formatCompact';

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
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
  }, []);

  const loadData = async () => {
    try {
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }
      
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

  if (loading || !isReady) return <PageLoader message="Загрузка дашборда..." />;

  const masked = '•••••';

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t(lang, 'dash_title')}
        subtitle={`${t(lang, 'dash_welcome')}, ${business?.name}`}
        actions={
          <div className="flex gap-2">
            <Link to={createPageUrl('CustomizeDashboard')}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs px-2 sm:px-3">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(lang, 'dash_customize')}</span>
              </Button>
            </Link>
            <Link to={createPageUrl('Sales')}>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs px-2 sm:px-3">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(lang, 'dash_new_sale')}</span>
                <span className="sm:hidden">+ Продажа</span>
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

      <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(widgets.length === 0 ? ['sales', 'profit', 'boxes', 'stock'] : widgets.filter(w => ['sales', 'profit', 'boxes', 'pairs', 'stock', 'debt', 'customers'].includes(w.widget_type))).map((widget) => {
          const widgetType = typeof widget === 'string' ? widget : widget.widget_type;
          const widgetConfigs = {
            sales: { title: t(lang,'dash_sales'), value: (hideData || !can('view_analytics')) ? masked : formatCompact(totalRevenue, lang), subtitle: t(lang,'dash_somoni'), icon: ShoppingCart, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
            profit: { title: t(lang,'dash_profit'), value: (hideData || !can('view_profit')) ? masked : formatCompact(totalProfit, lang), subtitle: t(lang,'dash_somoni'), icon: TrendingUp, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
            boxes: { title: t(lang,'dash_boxes_sold'), value: hideData ? masked : totalBoxes, icon: Box, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
            pairs: { title: t(lang,'dash_pairs_sold'), value: hideData ? masked : totalPairs, icon: Layers, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
            stock: { title: t(lang,'dash_stock'), value: hideData ? masked : `${formatCompact(totalStock, lang)} ${t(lang,'dash_boxes')}`, subtitle: (hideData || !can('view_stock_value')) ? masked : `${t(lang,'dash_purchase')}: ${formatCompact(totalPurchaseValue, lang)} с.`, icon: Warehouse, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
            debt: { title: t(lang,'dash_debt'), value: hideData ? masked : formatCompact(totalDebt, lang), subtitle: t(lang,'dash_somoni'), icon: Users, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
            customers: { title: t(lang,'dash_customers'), value: customers.length, icon: Users, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' }
          };
          const config = widgetConfigs[widgetType];
          if (!config) return null;
          return <StatCard key={widgetType} {...config} />;
        })}
      </div>

      {/* Charts & Analytics */}
      {(widgets.length === 0 || widgets.some(w => ['chart_sales', 'sales_type'].includes(w.widget_type))) && (
        <div className="grid lg:grid-cols-2 gap-3">
          {(widgets.length === 0 || widgets.some(w => w.widget_type === 'chart_sales')) && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{t(lang,'dash_dynamics')}</h3>
              <SalesChart sales={filteredSales} days={7} showProfit={can('view_profit')} />
            </div>
          )}
          {(widgets.length === 0 || widgets.some(w => w.widget_type === 'sales_type')) && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{t(lang,'dash_cash_vs_debt')}</h3>
              <div className="h-48">
                <SalesTypeChart sales={filteredSales} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <p className="text-xs font-medium text-slate-600">{t(lang,'dash_cash')}</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{hideData ? masked : `${totalSalesValue ? ((cashAmount / totalSalesValue) * 100).toFixed(1) : 0}%`}</p>
                  <p className="text-xs text-slate-500">{cashSales.length} {t(lang,'dash_sales_count')}</p>
                  <p className="text-sm font-semibold text-slate-900">{hideData ? masked : `${formatCompact(cashAmount, lang)} с.`}</p>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <p className="text-xs font-medium text-slate-600">{t(lang,'dash_in_debt')}</p>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{hideData ? masked : `${totalSalesValue ? ((debtAmount / totalSalesValue) * 100).toFixed(1) : 0}%`}</p>
                  <p className="text-xs text-slate-500">{debtSales.length} {t(lang,'dash_sales_count')}</p>
                  <p className="text-sm font-semibold text-slate-900">{hideData ? masked : `${formatCompact(debtAmount, lang)} с.`}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Products & Quick Actions */}
      {(widgets.length === 0 || widgets.some(w => w.widget_type === 'top_products')) && (
      <div className="grid lg:grid-cols-2 gap-3">

        {/* Top Products */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">{t(lang,'dash_top_products')}</h3>
            <Link to={createPageUrl('Products')} className="text-xs text-indigo-600 hover:text-indigo-700">
              {t(lang,'dash_all_products')}
            </Link>
          </div>
          <div className="space-y-1.5">
            {topProducts.length > 0 ? topProducts.map((item, index) => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                  {index + 1}
                </div>
                <ProductPhoto
                  photoUrl={item.product.photo_url}
                  productType={item.product.product_type}
                  className="w-8 h-8 rounded-md flex-shrink-0"
                  placeholderClassName="bg-slate-200 dark:bg-slate-700"
                  textClassName="text-[7px]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{item.product.brand} {item.product.model}</p>
                  <p className="text-xs text-slate-400">{item.boxes} {t(lang,'dash_boxes')}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900 flex-shrink-0">{(hideData || !can('view_stock_value')) ? masked : `${formatCompact(item.revenue, lang)} с.`}</p>
              </div>
            )) : (
              <p className="text-center text-slate-400 py-4 text-xs">{t(lang,'dash_no_sales')}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">{t(lang,'dash_quick_actions')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: 'Products', icon: Package, label: t(lang,'dash_add_product'), from: 'from-indigo-50', to2: 'to-indigo-100', tc: 'text-indigo-600' },
              { to: 'Sales', icon: ShoppingCart, label: t(lang,'dash_new_sale'), from: 'from-emerald-50', to2: 'to-emerald-100', tc: 'text-emerald-600' },
              { to: 'Warehouses', icon: Warehouse, label: t(lang,'dash_warehouses'), from: 'from-purple-50', to2: 'to-purple-100', tc: 'text-purple-600' },
              { to: 'Customers', icon: Users, label: t(lang,'dash_clients'), from: 'from-amber-50', to2: 'to-amber-100', tc: 'text-amber-600' },
            ].map(item => (
              <Link key={item.to} to={createPageUrl(item.to)}>
                <div className={`flex items-center gap-2 p-2.5 bg-gradient-to-br ${item.from} ${item.to2} rounded-lg hover:shadow-sm transition-all cursor-pointer`}>
                  <item.icon className={`w-5 h-5 ${item.tc} flex-shrink-0`} />
                  <p className="text-xs font-medium text-slate-800 leading-tight">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}