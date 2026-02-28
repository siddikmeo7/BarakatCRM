import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import StatCard from '@/components/ui/StatCard';
import SalesChart from '@/components/charts/SalesChart';
import SalesTypeChart from '@/components/charts/SalesTypeChart';
import { 
  TrendingUp, 
  ShoppingCart, 
  Box,
  DollarSign,
  Package,
  Percent,
  Settings2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';
import { t } from '@/components/i18n/translations';
import SalesForecast from '@/components/analytics/SalesForecast';
import CustomerSegmentation from '@/components/analytics/CustomerSegmentation';
import ReportBuilder from '@/components/analytics/ReportBuilder';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import { User } from 'lucide-react';

const DEFAULT_RATES = { TJS: 1, USD: 0.091, RUB: 8.5, EUR: 0.084, CNY: 0.66 };
const RATES_CACHE_KEY = 'exchange_rates_cache';
const RATES_DATE_KEY = 'exchange_rates_date';

export default function Analytics() {
  const { can } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ru');
  const [currency, setCurrency] = useState('TJS');

  const [chartType, setChartType] = useState('line');
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesDate, setRatesDate] = useState(null);
  const [hideData, setHideData] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [topProductsSort, setTopProductsSort] = useState('revenue'); // revenue, profit, boxes
  const [mySalesOnly, setMySalesOnly] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);



  useEffect(() => {
    loadData();
    loadExchangeRates(false);
  }, []);

  const loadExchangeRates = async (forceRefresh = false) => {
    const today = new Date().toDateString();
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    const cachedDate = localStorage.getItem(RATES_DATE_KEY);

    if (!forceRefresh && cached && cachedDate === today) {
      setExchangeRates(JSON.parse(cached));
      setRatesDate(cachedDate);
      return;
    }

    setRatesLoading(true);
    try {
      // Get rates with USD as base, then convert to TJS base
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.result === 'success') {
        // data.rates[X] = how many X per 1 USD
        // We need: how many foreign per 1 TJS
        // 1 TJS = (1/data.rates.TJS) USD = (1/data.rates.TJS) * data.rates[X] foreign
        const tjsPerUsd = data.rates.TJS; // e.g. ~10.9
        const rates = {
          TJS: 1,
          USD: parseFloat((1 / tjsPerUsd).toFixed(5)),                          // 1 TJS in USD
          RUB: parseFloat((data.rates.RUB / tjsPerUsd).toFixed(4)),             // 1 TJS in RUB
          EUR: parseFloat((data.rates.EUR / tjsPerUsd).toFixed(5)),             // 1 TJS in EUR
          CNY: parseFloat((data.rates.CNY / tjsPerUsd).toFixed(5)),             // 1 TJS in CNY
        };
        setExchangeRates(rates);
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
        localStorage.setItem(RATES_DATE_KEY, today);
        setRatesDate(today);
      }
    } catch (e) {
      setExchangeRates(DEFAULT_RATES);
    } finally {
      setRatesLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUserEmail(user.email);
      let biz = null;
      const savedMode = sessionStorage.getItem('barakatcrm_mode');
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
        
        const [salesData, productsData, customersData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData);
        setProducts(productsData);
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация продаж по дате (исключаем отменённые!)
  const filteredSales = sales.filter(sale => {
    if (sale.is_cancelled) return false; // КРИТИЧНО: не считать отменённые продажи
    if (!dateRange?.from) return true;
    const saleDate = parseISO(sale.sale_date || sale.created_date);
    return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to || dateRange.from });
  });

  // Расчёты
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalBoxes = filteredSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);

  // Общая стоимость товаров на складе
  const totalStockValue = products.reduce((sum, p) => 
    sum + ((p.boxes_in_stock || 0) * (p.sale_price || 0)), 0
  );

  // Потенциальная прибыль от склада
  const potentialProfit = products.reduce((sum, p) => 
    sum + ((p.boxes_in_stock || 0) * ((p.sale_price || 0) - (p.purchase_price || 0))), 0
  );

  // Общее количество коробок на всех складах
  const totalBoxesInStock = products.reduce((sum, p) => 
    sum + (p.boxes_in_stock || 0), 0
  );

  // Наличные vs Долг
  const cashSales = filteredSales.filter(s => !s.is_debt);
  const debtSales = filteredSales.filter(s => s.is_debt);
  const cashAmount = cashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const debtAmount = debtSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const cashPercent = totalRevenue ? ((cashAmount / totalRevenue) * 100).toFixed(1) : 0;
  const debtPercent = totalRevenue ? ((debtAmount / totalRevenue) * 100).toFixed(1) : 0;

  // Маржа прибыли
  const profitMargin = totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Нет доступа к аналитике
  if (!can('view_analytics')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Нет доступа</h2>
        <p className="text-slate-400 max-w-sm">У вас нет разрешения на просмотр раздела «Аналитика». Обратитесь к владельцу бизнеса.</p>
      </div>
    );
  }

  const masked = '•••••';

  const convertCurrency = (amount) => {
    if (hideData) return masked;
    return (amount * (exchangeRates[currency] || DEFAULT_RATES[currency] || 1)).toFixed(2);
  };

  const getCurrencySymbol = () => {
    switch(currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      case 'EUR': return '€';
      case 'CNY': return '¥';
      default: return 'с.';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t(lang,'analytics_title')}
        subtitle={t(lang,'analytics_subtitle')}
        actions={
          <Link to={createPageUrl('ChartSettings')}>
            <Button variant="outline" className="gap-2">
              <Settings2 className="w-4 h-4" />
              {t(lang,'analytics_chart_settings')}
            </Button>
          </Link>
        }
      />

      {/* Date Filter & Hide button */}
       <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
         {/* Top row: Hide button */}
         <div className="flex items-center justify-end">
           <Button
             variant="outline"
             size="sm"
             onClick={() => setHideData(h => !h)}
             className="gap-2"
           >
             {hideData ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
             {hideData ? t(lang,'analytics_show') : t(lang,'analytics_hide')}
           </Button>
         </div>
        {/* Bottom row: filters */}
        <div className="flex flex-wrap items-center gap-3">
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TJS">{t(lang,'analytics_somoni')}</SelectItem>
              <SelectItem value="USD">{t(lang,'analytics_usd')}</SelectItem>
              <SelectItem value="RUB">{t(lang,'analytics_rub')}</SelectItem>
              <SelectItem value="EUR">{t(lang,'analytics_eur')}</SelectItem>
              <SelectItem value="CNY">{t(lang,'analytics_cny')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadExchangeRates(true)}
            disabled={ratesLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
            {ratesLoading ? t(lang,'analytics_loading_rate') : t(lang,'analytics_refresh_rate')}
          </Button>
          {ratesDate && currency !== 'TJS' && (
            <span className="text-xs text-slate-400">
              1 с. = {exchangeRates[currency]} {currency}
            </span>
          )}
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">{t(lang,'analytics_chart_line')}</SelectItem>
              <SelectItem value="bar">{t(lang,'analytics_chart_bar')}</SelectItem>
              <SelectItem value="area">{t(lang,'analytics_chart_area')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats - Responsive sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title={t(lang,'analytics_revenue')}
          value={convertCurrency(totalRevenue)}
          subtitle={getCurrencySymbol()}
          icon={ShoppingCart}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          className="text-sm md:text-base"
        />
        {can('view_profit') && (
        <StatCard
          title={t(lang,'analytics_profit')}
          value={convertCurrency(totalProfit)}
          subtitle={getCurrencySymbol()}
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          className="text-sm md:text-base"
        />
        )}
        {can('view_profit') && (
        <StatCard
          title={t(lang,'analytics_margin')}
          value={hideData ? masked : `${profitMargin}%`}
          icon={Percent}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          className="text-sm md:text-base"
        />
        )}
        <StatCard
          title={t(lang,'analytics_boxes_sold')}
          value={totalBoxes}
          icon={Box}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          className="text-sm md:text-base"
        />
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {can('view_stock_value') ? (
          <StatCard
            title={t(lang,'analytics_stock_value')}
            value={convertCurrency(totalStockValue)}
            subtitle={getCurrencySymbol()}
            icon={Package}
            iconBg="bg-cyan-100"
            iconColor="text-cyan-600"
            className="text-sm md:text-base"
          />
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t(lang,'analytics_stock_value')}</p>
              <p className="text-xl font-bold text-slate-400">••••• с.</p>
              <p className="text-xs text-slate-400">Нет доступа</p>
            </div>
          </div>
        )}
        {can('view_profit') ? (
          <StatCard
            title={t(lang,'analytics_potential_profit')}
            value={convertCurrency(potentialProfit)}
            subtitle={t(lang,'analytics_from_stock')}
            icon={DollarSign}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            className="text-sm md:text-base"
          />
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t(lang,'analytics_potential_profit')}</p>
              <p className="text-xl font-bold text-slate-400">••••• с.</p>
              <p className="text-xs text-slate-400">Нет доступа</p>
            </div>
          </div>
        )}
        <StatCard
          title={t(lang,'analytics_total_products')}
          value={products.length}
          icon={Package}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          className="text-sm md:text-base"
        />
        <StatCard
          title="Коробок на складе"
          value={hideData ? masked : totalBoxesInStock}
          icon={Box}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          className="text-sm md:text-base"
        />
      </div>

      {/* All Charts Together */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Графики</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sales & Profit Chart */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm md:text-base mb-4">{t(lang,'analytics_dynamics')}</h3>
            {can('view_analytics') ? (
              <SalesChart sales={filteredSales} days={14} chartType={chartType} showProfit={can('view_profit')} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <EyeOff className="w-8 h-8" />
                <p className="text-sm font-medium">Нет доступа</p>
              </div>
            )}
          </div>

          {/* Sales Type Chart */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm md:text-base mb-4">{t(lang,'analytics_cash_vs_debt')}</h3>
            <div className="h-64">
              <SalesTypeChart sales={filteredSales} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-6 mt-6 pt-6 border-t border-slate-100">
              <div className="text-center p-3 md:p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500" />
                  <p className="text-xs md:text-sm font-medium text-slate-600">{t(lang,'analytics_cash')}</p>
                </div>
                <p className="text-xl md:text-3xl font-bold text-emerald-600">{hideData ? masked : `${cashPercent}%`}</p>
                <p className="text-xs md:text-sm text-slate-500 mt-1">{cashSales.length}</p>
                <p className="text-sm md:text-lg font-semibold text-slate-900 mt-1 md:mt-2">{hideData ? masked : `${(cashAmount / 1000).toFixed(1)}K с.`}</p>
              </div>
              <div className="text-center p-3 md:p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500" />
                  <p className="text-xs md:text-sm font-medium text-slate-600">{t(lang,'analytics_in_debt')}</p>
                </div>
                <p className="text-xl md:text-3xl font-bold text-amber-600">{hideData ? masked : `${debtPercent}%`}</p>
                <p className="text-xs md:text-sm text-slate-500 mt-1">{debtSales.length}</p>
                <p className="text-sm md:text-lg font-semibold text-slate-900 mt-1 md:mt-2">{hideData ? masked : `${(debtAmount / 1000).toFixed(1)}K с.`}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Расширенная аналитика</h2>

        <SalesForecast sales={filteredSales} days={30} />
        <CustomerSegmentation customers={customers} sales={filteredSales} />
        <ReportBuilder sales={filteredSales} customers={customers} products={products} business={business} lang={lang} />
      </div>

      {/* Top Products by Revenue - Moved to End */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="font-semibold text-slate-900 text-sm md:text-base">{t(lang,'analytics_top_products')}</h3>
          <Select value={topProductsSort} onValueChange={setTopProductsSort}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">По выручке</SelectItem>
              <SelectItem value="profit">По прибыли</SelectItem>
              <SelectItem value="boxes">По коробкам</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
          {(() => {
            const productStats = {};
            filteredSales.forEach(sale => {
              if (!productStats[sale.product_id]) {
                productStats[sale.product_id] = { boxes: 0, revenue: 0, profit: 0 };
              }
              productStats[sale.product_id].boxes += sale.boxes_sold || 0;
              productStats[sale.product_id].revenue += sale.total_amount || 0;
              productStats[sale.product_id].profit += sale.profit || 0;
            });

            let sorted = Object.entries(productStats);
            switch(topProductsSort) {
              case 'profit':
                sorted = sorted.sort((a, b) => b[1].profit - a[1].profit);
                break;
              case 'boxes':
                sorted = sorted.sort((a, b) => b[1].boxes - a[1].boxes);
                break;
              case 'revenue':
              default:
                sorted = sorted.sort((a, b) => b[1].revenue - a[1].revenue);
            }

            return sorted.slice(0, 10).map(([productId, stats], index) => {
              const product = products.find(p => p.id === productId);
              if (!product) return null;

              return (
                <div key={productId} className="flex items-center gap-2 md:gap-4 p-2 md:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                  <div className="w-5 md:w-8 h-5 md:h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs md:text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  {product.photo_url ? (
                    <img src={product.photo_url} alt="" className="w-7 md:w-12 h-7 md:h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 md:w-12 h-7 md:h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 md:w-6 h-3 md:h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-xs md:text-sm truncate">{product.brand} {product.model}</p>
                    <p className="text-xs text-slate-500">{stats.boxes} кор.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-900 text-xs md:text-sm">{hideData ? masked : `${Math.round(stats.revenue)} с.`}</p>
                    {can('view_profit') && <p className="text-xs md:text-sm text-emerald-600 font-medium">+{hideData ? masked : `${Math.round(stats.profit)} с.`}</p>}
                  </div>
                </div>
              );
            })
            .filter(Boolean);
          })()}
        </div>
      </div>
    </div>
  );
}