import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DateFilter from '@/components/filters/DateFilter';
import SalesChart from '@/components/charts/SalesChart';
import ProductPhoto from '@/components/products/ProductPhoto';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { t } from '@/components/i18n/translations';
import SalesForecast from '@/components/analytics/SalesForecast';
import CustomerSegmentation from '@/components/analytics/CustomerSegmentation';
import EmployeeEfficiency from '@/components/analytics/EmployeeEfficiency';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import BackButton from '@/components/ui/BackButton';
import BrandedLoader from '@/components/ui/BrandedLoader';
import { formatCompact } from '@/lib/formatCompact';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Package, Calendar } from 'lucide-react';

const DEFAULT_RATES = { TJS: 1, USD: 0.091, RUB: 8.5, EUR: 0.084, CNY: 0.66 };
const RATES_CACHE_KEY = 'exchange_rates_cache';
const RATES_DATE_KEY = 'exchange_rates_date';

// Текстура шапки «Тёмного терминала» — обесцвеченный штабель коробок
const HERO_IMAGE = 'https://media.base44.com/images/public/698ff18fde0fc6a87223fd69/76318279a_generated_f6b51210.jpg';

const CURRENCIES = [
  { value: 'TJS', labelKey: 'analytics_somoni' },
  { value: 'USD', labelKey: 'analytics_usd' },
  { value: 'RUB', labelKey: 'analytics_rub' },
  { value: 'EUR', labelKey: 'analytics_eur' },
  { value: 'CNY', labelKey: 'analytics_cny' },
];

const CHART_TYPES = [
  { value: 'line', labelKey: 'analytics_chart_line' },
  { value: 'bar', labelKey: 'analytics_chart_bar' },
  { value: 'area', labelKey: 'analytics_chart_area' },
];

const QUICK_LINKS = [
  { to: 'Products', label: 'Товары' },
  { to: 'Sales', label: 'Продажи' },
  { to: 'Warehouses', label: 'Склады' },
  { to: 'Customers', label: 'Клиенты' },
];

const SORT_OPTIONS = [
  { value: 'revenue', label: 'По выручке' },
  { value: 'profit', label: 'По прибыли' },
  { value: 'boxes', label: 'По коробкам' },
];

const EXPENSE_CATS = ['Аренда', 'Зарплата', 'Транспорт', 'Коммунальные', 'Реклама', 'Прочее'];

export default function Analytics() {
  const { can } = useEmployeeAccess();
  const [business, setBusiness] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [consignmentSales, setConsignmentSales] = useState([]);
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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showLossModal, setShowLossModal] = useState(false);
  const [deletedProductsMap, setDeletedProductsMap] = useState({});

  useEffect(() => {
    loadExchangeRates(false);
    // Wait for Layout to finish loading business data before fetching
    if (window.__barakatAccessReady) {
      loadData();
    } else {
      const handler = () => loadData();
      window.addEventListener('barakatAccessReady', handler);
      return () => window.removeEventListener('barakatAccessReady', handler);
    }
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
      setCurrentUserId(user.id);
      const biz = window.__barakatBusiness;
      if (!biz) { setLoading(false); return; }

      if (biz) {
        setBusiness(biz);
        setLang(biz.language || 'ru');

        const [salesData, productsData, customersData, expensesData, delLogs] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Expense.filter({ business_id: biz.id }),
          base44.entities.ActivityLog.filter({ business_id: biz.id, action_type: 'delete' }).catch(() => []),
        ]);

        setSales(salesData);
        setProducts(productsData);
        setCustomers(customersData);
        setExpenses(expensesData);

        // Снимки удалённых товаров из журнала активности — чтобы продажи удалённых
        // товаров оставались в разбивках аналитики (история продаж сохраняется,
        // а складские метрики считаются только по живым товарам).
        const dpm = {};
        (delLogs || []).forEach(log => {
          if ((log.entity_type === 'Product' || log.entity_type === 'ConsignmentProduct') && log.entity_id && log.entity_data && !dpm[log.entity_id]) {
            dpm[log.entity_id] = log.entity_data;
          }
        });
        setDeletedProductsMap(dpm);

        // Загружаем продажи на реализации отдельно
        try {
          const consignmentData = await base44.entities.ConsignmentSale.filter({ business_id: biz.id });
          setConsignmentSales(consignmentData);
        } catch (_) {
          setConsignmentSales([]);
        }
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
    if (mySalesOnly && currentUserEmail && sale.created_by !== currentUserEmail) return false;
    if (!dateRange?.from) return true;
    try {
      const saleDate = parseISO(sale.sale_date || sale.created_date);
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to || dateRange.from);
      return isWithinInterval(saleDate, { start: startDate, end: endDate });
    } catch (e) {
      return false;
    }
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

  // Убыточные продажи (profit < 0)
  const lossSales = filteredSales.filter(s => (s.profit || 0) < 0);
  const totalLoss = lossSales.reduce((sum, s) => sum + (s.profit || 0), 0); // отрицательное число

  // Продажи на реализации за период
  const filteredConsignmentSales = consignmentSales.filter(s => {
    if (s.is_cancelled) return false;
    if (!dateRange?.from) return true;
    try {
      const saleDate = parseISO(s.sale_date || s.created_date);
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to || dateRange.from);
      return isWithinInterval(saleDate, { start: startDate, end: endDate });
    } catch (e) {
      return false;
    }
  });
  const consignmentProfit = filteredConsignmentSales.reduce((sum, s) => sum + (s.seller_profit || 0), 0);
  const consignmentBoxes = filteredConsignmentSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const consignmentOwnerAmount = filteredConsignmentSales.reduce((sum, s) => sum + (s.owner_amount || 0), 0);

  // Расходы за период
  const filteredExpenses = expenses.filter(e => {
    if (!dateRange?.from) return true;
    try {
      const d = parseISO(e.expense_date);
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to || dateRange.from);
      return isWithinInterval(d, { start: startDate, end: endDate });
    } catch { return false; }
  });
  // Сотрудники без view_all_expenses видят только свои расходы
  const canViewAllExpenses = can('view_all_expenses');
  const displayedExpenses = canViewAllExpenses
    ? filteredExpenses
    : filteredExpenses.filter(e => e.created_by_id === currentUserId);
  const totalExpenses = displayedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Чистая прибыль = прибыль от продаж + прибыль с реализации − расходы
  const netProfit = totalProfit + consignmentProfit - totalExpenses;

  // Маржа прибыли
  const profitMargin = totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Разрешение товара продажи: живой продукт либо снимок удалённого из журнала.
  // Гарантирует, что продажи удалённых товаров остаются в разбивках аналитики.
  const resolveProductInfo = (pid) => {
    if (!pid) return null;
    const live = products.find(p => p.id === pid);
    if (live) return live;
    const snap = deletedProductsMap[pid];
    return snap ? { ...snap, _deleted: true } : null;
  };

  if (loading) {
    return <BrandedLoader message="Загрузка аналитики..." />;
  }

  // Нет доступа к аналитике
  if (!can('view_analytics')) {
    return (
      <div className="tk-console flex flex-col items-center justify-center text-center gap-3">
        <span className="tk-cap">Аналитика и статистика</span>
        <TrendingUp className="w-8 h-8" style={{ color: '#7c8594' }} />
        <h2 className="text-base font-bold" style={{ color: '#f2f4f8' }}>Нет доступа</h2>
        <p className="text-xs max-w-sm" style={{ color: '#7c8594' }}>У вас нет разрешения на просмотр раздела «Аналитика». Обратитесь к владельцу бизнеса.</p>
      </div>
    );
  }

  const masked = '•••••';

  const convertCurrency = (amount) => {
    if (hideData) return masked;
    const converted = amount * (exchangeRates[currency] || DEFAULT_RATES[currency] || 1);
    return formatCompact(converted, lang);
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

  const symbol = getCurrencySymbol();

  const periodLabel = dateRange?.from
    ? `${format(dateRange.from, 'dd MMM yyyy', { locale: ru })}${dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? ` — ${format(dateRange.to, 'dd MMM yyyy', { locale: ru })}` : ''}`
    : '';

  // Разбивка продаж по товарам за период
  const productStats = {};
  filteredSales.forEach(sale => {
    const pid = sale.product_id;
    if (!productStats[pid]) productStats[pid] = { boxes: 0, revenue: 0, profit: 0, count: 0 };
    productStats[pid].boxes += sale.boxes_sold || 0;
    productStats[pid].revenue += sale.total_amount || 0;
    productStats[pid].profit += sale.profit || 0;
    productStats[pid].count += 1;
  });

  let productRows = Object.entries(productStats).map(([pid, stats]) => ({ pid, stats, product: resolveProductInfo(pid) })).filter(r => r.product);
  if (topProductsSort === 'profit') productRows = productRows.sort((a, b) => b.stats.profit - a.stats.profit);
  else if (topProductsSort === 'boxes') productRows = productRows.sort((a, b) => b.stats.boxes - a.stats.boxes);
  else productRows = productRows.sort((a, b) => b.stats.revenue - a.stats.revenue);

  const showStockColumn = can('view_warehouse_quantities');
  const maxStock = productRows.reduce((m, r) => Math.max(m, r.product.boxes_in_stock || 0), 0);

  // Расходы по категориям
  const expenseRows = EXPENSE_CATS.map(label => {
    const total = displayedExpenses.filter(e => e.category === label).reduce((s, e) => s + (e.amount || 0), 0);
    return { label, total, pct: totalExpenses ? ((total / totalExpenses) * 100).toFixed(0) : 0 };
  }).filter(r => r.total);

  const showExpenses = can('view_profit') && filteredExpenses.length > 0;

  // Клиентская сводка для матрицы расширенной аналитики
  const debtors = customers.filter(c => (c.total_debt || 0) > 0);
  const totalDebt = debtors.reduce((s, c) => s + (c.total_debt || 0), 0);
  const topDebtor = [...debtors].sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0))[0];

  return (
    <div className="tk-console">
      <div className="tk-hero">
        <img src={HERO_IMAGE} alt="" />
      </div>

      <div className="tk-in">
        {/* Строка 1: раздел, период, валюта, курс */}
        <div className="tk-bar">
          <BackButton variant="terminal" />
          <span className="tk-cap t">{t(lang, 'analytics_title')}</span>
          <DateFilter variant="terminal" dateRange={dateRange} onDateRangeChange={setDateRange} />
          <span className="tk-sp" />
          <div className="tk-grp">
            {CURRENCIES.map(c => (
              <button
                key={c.value}
                className={cn('tk-btn', currency === c.value && 'on')}
                onClick={() => setCurrency(c.value)}
              >
                {t(lang, c.labelKey)}
              </button>
            ))}
            <button
              className="tk-btn"
              onClick={() => loadExchangeRates(true)}
              disabled={ratesLoading}
            >
              {ratesLoading ? t(lang, 'analytics_loading_rate') : t(lang, 'analytics_refresh_rate')}
            </button>
            {ratesDate && currency !== 'TJS' && (
              <span className="tk-cap">1 с. = {exchangeRates[currency]} {currency}</span>
            )}
          </div>
        </div>

        {/* Строка 2: подзаголовок, настройки графиков, отбор продаж, скрытие данных */}
        <div className="tk-bar flat">
          <span className="tk-sub">{t(lang, 'analytics_subtitle')}</span>
          <span className="tk-sp" />
          <div className="tk-grp">
            <Link to={createPageUrl('ChartSettings')} className="tk-btn">
              {t(lang, 'analytics_chart_settings')}
            </Link>
            <button className={cn('tk-btn', !mySalesOnly && 'on')} onClick={() => setMySalesOnly(false)}>Все продажи</button>
            <button className={cn('tk-btn', mySalesOnly && 'on')} onClick={() => setMySalesOnly(true)}>Мои продажи</button>
            <button className={cn('tk-btn', hideData && 'on')} onClick={() => setHideData(true)}>{t(lang, 'analytics_hide')}</button>
            <button className={cn('tk-btn', !hideData && 'on')} onClick={() => setHideData(false)}>{t(lang, 'analytics_show')}</button>
          </div>
        </div>

        {/* Строка 3: быстрый доступ и тип графика */}
        <div className="tk-bar tight">
          <span className="tk-cap">Быстрый доступ:</span>
          <div className="tk-grp">
            {QUICK_LINKS.map(q => (
              <Link key={q.to} to={createPageUrl(q.to)} className="tk-btn">{q.label}</Link>
            ))}
          </div>
          <span className="tk-sp" />
          <div className="tk-grp">
            {CHART_TYPES.map(c => (
              <button
                key={c.value}
                className={cn('tk-btn', chartType === c.value && 'on')}
                onClick={() => setChartType(c.value)}
              >
                {t(lang, c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Приборная полоса метрик */}
        <div className="tk-strip tk-mono">
          {can('view_revenue') ? (
            <div className="tk-cell">
              <span className="tk-cap">{t(lang, 'analytics_revenue')}</span>
              <b className="tk-pulse">{convertCurrency(totalRevenue)} {symbol}</b>
            </div>
          ) : (
            <div className="tk-cell">
              <span className="tk-cap">{t(lang, 'analytics_revenue')}</span>
              <b>{masked}</b>
              <small>Нет доступа</small>
            </div>
          )}

          {can('view_profit') && (
            <div className="tk-cell g">
              <span className="tk-cap">{t(lang, 'analytics_profit')}</span>
              <b>{hideData ? masked : `${formatCompact(totalProfit, lang)} ${symbol}`}</b>
            </div>
          )}

          {can('view_profit') && (
            <div className="tk-cell">
              <span className="tk-cap">{t(lang, 'analytics_margin')}</span>
              <b>{hideData ? masked : `${profitMargin}%`}</b>
            </div>
          )}

          <div className="tk-cell">
            <span className="tk-cap">{t(lang, 'analytics_boxes_sold')}</span>
            <b>{totalBoxes}</b>
          </div>

          {can('view_profit') && (
            <button
              className="tk-cell r"
              onClick={() => lossSales.length > 0 && setShowLossModal(true)}
            >
              <span className="tk-cap">Убыток от продаж</span>
              <b>{hideData ? masked : `${formatCompact(totalLoss, lang)} с.`}</b>
              <small>{lossSales.length} продаж ниже себестоимости</small>
            </button>
          )}

          <div className="tk-cell r">
            <span className="tk-cap">{canViewAllExpenses ? 'Расходы за период' : 'Ваши расходы за период'}</span>
            <b>{hideData ? masked : `−${formatCompact(totalExpenses, lang)} с.`}</b>
            <small>
              {displayedExpenses.length} транзакций ·{' '}
              <Link to={createPageUrl('Expenses')} className="tk-lnk">Управление →</Link>
            </small>
          </div>

          <div className="tk-cell g">
            <span className="tk-cap">Чистая прибыль</span>
            <b>{hideData ? masked : `${formatCompact(netProfit, lang)} с.`}</b>
            <small>после расходов</small>
          </div>

          <div className="tk-cell">
            <span className="tk-cap">Прибыль с реализации</span>
            <b>{hideData ? masked : `${formatCompact(consignmentProfit, lang)} с.`}</b>
            <small>
              {consignmentBoxes} кор. · владельцам: {hideData ? masked : `${formatCompact(consignmentOwnerAmount, lang)} с.`} ·{' '}
              <Link to={createPageUrl('OwnerPayments')} className="tk-lnk">Управление →</Link>
            </small>
          </div>

          {can('view_stock_value') ? (
            <div className="tk-cell">
              <span className="tk-cap">{t(lang, 'analytics_stock_value')}</span>
              <b>{convertCurrency(totalStockValue)} {symbol}</b>
            </div>
          ) : (
            <div className="tk-cell">
              <span className="tk-cap">{t(lang, 'analytics_stock_value')}</span>
              <b>{masked}</b>
              <small>Нет доступа</small>
            </div>
          )}

          {can('view_profit') ? (
            <div className="tk-cell g">
              <span className="tk-cap">{t(lang, 'analytics_potential_profit')}</span>
              <b>{convertCurrency(potentialProfit)} {symbol}</b>
              <small>{t(lang, 'analytics_from_stock')}</small>
            </div>
          ) : (
            <div className="tk-cell g">
              <span className="tk-cap">{t(lang, 'analytics_potential_profit')}</span>
              <b>{masked}</b>
              <small>Нет доступа</small>
            </div>
          )}

          <div className="tk-cell">
            <span className="tk-cap">{t(lang, 'analytics_total_products')}</span>
            <b>{products.length}</b>
          </div>

          <div className="tk-cell">
            <span className="tk-cap">Коробок на складе</span>
            <b>{hideData ? masked : totalBoxesInStock}</b>
          </div>
        </div>

        {/* Графики: динамика продаж и прибыли + наличные/долг */}
        <div className="tk-slab">
          <div className="tk-sp2">
            <h3 style={{ margin: 0 }}>Графики: {t(lang, 'analytics_dynamics')}</h3>
            <div className="tk-leg">
              <span><i style={{ background: '#f5b23e' }} />Выручка</span>
              <span><i style={{ background: '#6ee7b7' }} />Прибыль</span>
            </div>
          </div>
          <SalesChart
            sales={filteredSales}
            days={14}
            chartType={chartType}
            showProfit={can('view_profit')}
          />
          <div className="tk-mirror tk-mono">
            <div className="tk-mrow">
              <div className="h">
                <span className="tk-cap">{t(lang, 'analytics_cash')}</span>
                <span>{hideData ? masked : `${cashPercent}% · ${cashSales.length} · ${formatCompact(cashAmount, lang)} с.`}</span>
              </div>
              <div className="tk-trk"><span style={{ width: `${cashPercent}%`, background: '#6ee7b7' }} /></div>
            </div>
            <div className="tk-mrow">
              <div className="h">
                <span className="tk-cap">{t(lang, 'analytics_in_debt')}</span>
                <span>{hideData ? masked : `${debtPercent}% · ${debtSales.length} · ${formatCompact(debtAmount, lang)} с.`}</span>
              </div>
              <div className="tk-trk"><span style={{ width: `${debtPercent}%`, background: '#f5b23e' }} /></div>
            </div>
          </div>
        </div>

        {/* Продажи по товарам за период с сортировкой */}
        <div className="tk-slab">
          <div className="tk-sp2">
            <h3 style={{ margin: 0 }}>
              Продажи по товарам за период, {filteredSales.length} продаж
              {periodLabel && <span className="tk-cap" style={{ marginLeft: 10 }}>{periodLabel}</span>}
            </h3>
            <div className="tk-srt">
              <span className="tk-cap" style={{ marginRight: 6 }}>{t(lang, 'analytics_top_products')}, сортировка:</span>
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={cn('tk-btn', topProductsSort === o.value && 'on')}
                  onClick={() => setTopProductsSort(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: '#7c8594', opacity: .4 }} />
              <p className="text-xs" style={{ color: '#7c8594' }}>Нет продаж за выбранный период</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
              <table className="tk-tbl tk-mono">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Товар</th>
                    <th>Коробок</th>
                    <th className="n">Выручка</th>
                    {can('view_profit') && <th className="n">Прибыль</th>}
                    {showStockColumn && <th className="n">Остаток</th>}
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, i) => (
                    <tr key={row.pid}>
                      <td className="rk">{i + 1}</td>
                      <td>
                        <ProductPhoto
                          photoUrl={row.product.photo_url}
                          brand={row.product.brand}
                          className="tk-ph"
                          textClassName="text-[8px]"
                        />
                        {row.product.brand} {row.product.model}
                      </td>
                      <td>{row.stats.boxes} кор. · {row.stats.count} продаж</td>
                      <td className="n">
                        {(hideData || !can('view_revenue')) ? masked : `${formatCompact(row.stats.revenue, lang)} с.`}
                      </td>
                      {can('view_profit') && (
                        <td className="n" style={{ color: row.stats.profit >= 0 ? '#6ee7b7' : '#f87171' }}>
                          {hideData ? masked : `${row.stats.profit >= 0 ? '+' : ''}${formatCompact(row.stats.profit, lang)} с.`}
                        </td>
                      )}
                      {showStockColumn && (
                        <td>
                          <span className="tk-m">
                            <i style={{ width: `${maxStock ? ((row.product.boxes_in_stock || 0) / maxStock) * 100 : 0}%` }} />
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Расходы по категориям и расширенная аналитика */}
        <div className={showExpenses ? 'tk-two' : ''}>
          {showExpenses && (
            <div className="tk-slab">
              <div className="tk-sp2">
                <h3 style={{ margin: 0 }}>Расходы по категориям</h3>
                <Link to={createPageUrl('Expenses')} className="tk-lnk">Все расходы →</Link>
              </div>
              {expenseRows.map(cat => (
                <div key={cat.label} className="tk-exr tk-mono">
                  <span>{cat.label}</span>
                  <div className="tk-trk">
                    <span style={{ width: `${cat.pct}%`, background: '#f5b23e' }} />
                  </div>
                  <span className="v">{hideData ? masked : `${formatCompact(cat.total, lang)} с.`} ({cat.pct}%)</span>
                </div>
              ))}
              <div className="tk-tot tk-mono">
                <span className="tk-cap">Итого расходов:</span>
                <b>{hideData ? masked : `−${formatCompact(totalExpenses, lang)} с.`}</b>
              </div>
            </div>
          )}

          <div className="tk-slab">
            <div className="tk-sp2">
              <h3 style={{ margin: 0 }}>Расширенная аналитика</h3>
            </div>
            <div className="tk-mat tk-mono">
              <div>
                <span className="tk-cap">Клиентов</span>
                <b>{customers.length}</b>
              </div>
              <div>
                <span className="tk-cap">С долгом</span>
                <b>{debtors.length}</b>
              </div>
              <div>
                <span className="tk-cap">Долг клиентов</span>
                <b>{hideData ? masked : `${formatCompact(totalDebt, lang)} с.`}</b>
              </div>
              <div>
                <span className="tk-cap">Продаж за период</span>
                <b>{filteredSales.length}</b>
              </div>
              <div>
                <span className="tk-cap">Средний чек</span>
                <b>{(hideData || !can('view_revenue')) ? masked : `${filteredSales.length ? formatCompact(totalRevenue / filteredSales.length, lang) : 0} с.`}</b>
              </div>
            </div>

            <SalesForecast sales={filteredSales} days={30} />
            <CustomerSegmentation customers={customers} sales={filteredSales} />

            {topDebtor && (
              <div className="tk-dbt tk-mono">
                <span>{topDebtor.name}</span>
                <b style={{ color: '#f87171' }}>{hideData ? masked : `${(topDebtor.total_debt || 0).toLocaleString()} с.`}</b>
              </div>
            )}
          </div>
        </div>

        {/* Эффективность сотрудников */}
        {can('view_employee_analytics') && (
          <div className="tk-slab">
            <h3>Эффективность сотрудников</h3>
            <EmployeeEfficiency
              sales={sales}
              canViewProfit={can('view_profit')}
              hideData={hideData}
              lang={lang}
            />
          </div>
        )}

        {/* Убыточные продажи */}
        <Dialog open={showLossModal} onOpenChange={setShowLossModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#12161d] border-[#232a35] text-[#d7dbe2]">
            <DialogHeader>
              <DialogTitle className="tk-mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#f87171]">
                <TrendingDown className="w-4 h-4" />
                Убыточные продажи — {lossSales.length} шт.
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 space-y-2">
              {/* Итог */}
              <div className="flex items-center justify-between bg-[#0f131a] border-l-2 border-[#f87171] px-3 py-2">
                <span className="tk-cap">Общий убыток:</span>
                <span className="tk-mono text-base font-bold text-[#f87171]">{formatCompact(totalLoss, lang)} с.</span>
              </div>

              {/* Список продаж */}
              <div className="border border-[#232a35]">
                {lossSales
                  .sort((a, b) => (a.profit || 0) - (b.profit || 0)) // самые большие убытки сверху
                  .map(sale => {
                    const product = resolveProductInfo(sale.product_id);
                    const lossPerBox = sale.boxes_sold ? Math.round((sale.profit || 0) / sale.boxes_sold) : 0;
                    return (
                      <div key={sale.id} className="tk-mono flex items-center gap-3 px-3 py-2.5 border-b border-[#1b212a] last:border-b-0 hover:bg-[#171c25] transition-colors">
                        <ProductPhoto
                          photoUrl={product?.photo_url}
                          brand={product?.brand}
                          className="tk-ph"
                          textClassName="text-[8px]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#f2f4f8] truncate">
                            {product ? `${product.brand} ${product.model}` : 'Неизвестный товар'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#7c8594] mt-0.5 flex-wrap">
                            <span>{sale.boxes_sold} кор.</span>
                            <span>·</span>
                            <span>Продажа: {(sale.sale_price || 0).toLocaleString()} с.</span>
                            <span>·</span>
                            <span>Закупка: {(sale.purchase_price || 0).toLocaleString()} с.</span>
                            {sale.sale_date && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(sale.sale_date), 'dd.MM.yyyy', { locale: ru })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-[#f87171]">{formatCompact(sale.profit || 0, lang)} с.</p>
                          <p className="text-[11px] text-[#7c8594]">{lossPerBox.toLocaleString()} с./кор.</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}