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
  Clock,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns';

const DEFAULT_RATES = { TJS: 1, USD: 0.091, RUB: 8.5, EUR: 0.084, CNY: 0.66 };
const RATES_CACHE_KEY = 'exchange_rates_cache';
const RATES_DATE_KEY = 'exchange_rates_date';

export default function Analytics() {
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('TJS');
  const [showTime, setShowTime] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chartType, setChartType] = useState('line');
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesDate, setRatesDate] = useState(null);
  const [hideData, setHideData] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      const businesses = await base44.entities.Business.filter({ owner_email: user.email });
      
      if (businesses.length > 0) {
        const biz = businesses[0];
        setBusiness(biz);
        
        const [salesData, productsData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id })
        ]);
        
        setSales(salesData);
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация продаж по дате
  const filteredSales = sales.filter(sale => {
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

  const convertCurrency = (amount) => {
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
        title="Аналитика и статистика"
        subtitle="Визуализация данных вашего бизнеса"
        actions={
          <Link to={createPageUrl('ChartSettings')}>
            <Button variant="outline" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Настройка графиков
            </Button>
          </Link>
        }
      />

      {/* Date Filter & Time */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TJS">Сомони (с.)</SelectItem>
                  <SelectItem value="USD">Доллар ($)</SelectItem>
                  <SelectItem value="RUB">Рубль (₽)</SelectItem>
                  <SelectItem value="EUR">Евро (€)</SelectItem>
                  <SelectItem value="CNY">Юань (¥)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExchangeRates(true)}
                disabled={ratesLoading}
                className="gap-1 text-xs"
                title="Обновить курс валют"
              >
                <RefreshCw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                {ratesLoading ? 'Загрузка...' : 'Обновить курс'}
              </Button>
            </div>
            {ratesDate && currency !== 'TJS' && (
              <span className="text-xs text-slate-400">
                1 с. = {exchangeRates[currency]} {currency} · {ratesDate}
              </span>
            )}
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Линейный</SelectItem>
                <SelectItem value="bar">Столбчатый</SelectItem>
                <SelectItem value="area">Областной</SelectItem>
              </SelectContent>
            </Select>
            {showTime && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  {format(currentTime, 'HH:mm:ss')} • {format(currentTime, 'dd MMM yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Выручка"
          value={convertCurrency(totalRevenue)}
          subtitle={getCurrencySymbol()}
          icon={ShoppingCart}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Прибыль"
          value={convertCurrency(totalProfit)}
          subtitle={getCurrencySymbol()}
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Маржа прибыли"
          value={`${profitMargin}%`}
          icon={Percent}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Коробок продано"
          value={totalBoxes}
          icon={Box}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Стоимость склада"
          value={convertCurrency(totalStockValue)}
          subtitle={getCurrencySymbol()}
          icon={Package}
          iconBg="bg-cyan-100"
          iconColor="text-cyan-600"
        />
        <StatCard
          title="Потенциальная прибыль"
          value={convertCurrency(potentialProfit)}
          subtitle="от склада"
          icon={DollarSign}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Всего товаров"
          value={products.length}
          icon={Package}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales & Profit Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Динамика продаж и прибыли</h3>
          <SalesChart sales={filteredSales} days={14} chartType={chartType} />
        </div>

        {/* Sales Type Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Наличные vs В долг</h3>
          <div className="h-64">
            <SalesTypeChart sales={filteredSales} />
          </div>
          <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <p className="text-sm font-medium text-slate-600">Наличные</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{cashPercent}%</p>
              <p className="text-sm text-slate-500 mt-1">{cashSales.length} продаж</p>
              <p className="text-lg font-semibold text-slate-900 mt-2">{cashAmount.toLocaleString()} с.</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <p className="text-sm font-medium text-slate-600">В долг</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">{debtPercent}%</p>
              <p className="text-sm text-slate-500 mt-1">{debtSales.length} продаж</p>
              <p className="text-lg font-semibold text-slate-900 mt-2">{debtAmount.toLocaleString()} с.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products by Revenue */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Топ товары по выручке</h3>
        <div className="space-y-3">
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

            return Object.entries(productStats)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .slice(0, 10)
              .map(([productId, stats], index) => {
                const product = products.find(p => p.id === productId);
                if (!product) return null;

                return (
                  <div key={productId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                      {index + 1}
                    </div>
                    {product.photo_url ? (
                      <img src={product.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{product.brand} {product.model}</p>
                      <p className="text-sm text-slate-500">{stats.boxes} коробок продано</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{stats.revenue.toLocaleString()} с.</p>
                      <p className="text-sm text-emerald-600">+{stats.profit.toLocaleString()} с.</p>
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