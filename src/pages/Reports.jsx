import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, Download, Filter, TrendingUp, ShoppingCart,
  Package, Users, RefreshCw, FileSpreadsheet, Loader2,
  CalendarIcon, CreditCard, Banknote, ArrowUpRight, ArrowDownRight,
  BarChart2, Eye, EyeOff, X
} from 'lucide-react';
import {
  format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  isWithinInterval, subDays, subMonths, subYears
} from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const DATE_PRESETS = [
  { label: 'Сегодня', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Вчера', getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: '7 дней', getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: '30 дней', getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: 'Эта неделя', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Этот месяц', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Прошлый месяц', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: '3 месяца', getValue: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
  { label: '6 месяцев', getValue: () => ({ from: startOfDay(subMonths(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: 'Этот год', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: 'Прошлый год', getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
  { label: 'Всё время', getValue: () => ({ from: null, to: null }) },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [business, setBusiness] = useState(null);

  const [dateRange, setDateRange] = useState({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('30 дней');
  const [groupBy, setGroupBy] = useState('day');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [saleType, setSaleType] = useState('all'); // all | cash | debt
  const [chartType, setChartType] = useState('bar');
  const [chartMetric, setChartMetric] = useState('revenue'); // revenue | profit | boxes | count
  const [showProfit, setShowProfit] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | products | customers | table

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      let biz = null;
      const savedMode = localStorage.getItem('barakatcrm_mode');
      if (savedMode?.startsWith('employee_')) {
        const empId = savedMode.replace('employee_', '');
        const empRecords = await base44.entities.Employee.filter({ user_email: user.email, is_active: true });
        const emp = empRecords.find(e => e.id === empId) || empRecords[0];
        if (emp) {
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
        const [salesData, productsData, employeesData, customersData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
        ]);
        setSales(salesData);
        setProducts(productsData);
        setEmployees(employeesData);
        setCustomers(customersData);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    const val = preset.getValue();
    setDateRange(val);
    setCalendarOpen(false);
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.is_cancelled) return false;
      if (dateRange?.from && dateRange?.to) {
        const saleDate = parseISO(s.sale_date || s.created_date);
        if (saleDate < startOfDay(dateRange.from) || saleDate > endOfDay(dateRange.to)) return false;
      } else if (dateRange?.from) {
        const saleDate = parseISO(s.sale_date || s.created_date);
        if (saleDate < startOfDay(dateRange.from)) return false;
      }
      if (selectedEmployee !== 'all' && s.created_by !== selectedEmployee) return false;
      if (selectedProduct !== 'all' && s.product_id !== selectedProduct) return false;
      if (saleType === 'cash' && s.is_debt) return false;
      if (saleType === 'debt' && !s.is_debt) return false;
      return true;
    });
  }, [sales, dateRange, selectedEmployee, selectedProduct, saleType]);

  const chartData = useMemo(() => {
    const groups = {};
    filteredSales.forEach(s => {
      const d = parseISO(s.sale_date || s.created_date);
      let key;
      if (groupBy === 'day') key = format(d, 'dd.MM');
      else if (groupBy === 'week') key = `Нед ${format(startOfWeek(d, { locale: ru }), 'dd.MM')}`;
      else key = format(startOfMonth(d), 'MMM yy', { locale: ru });
      if (!groups[key]) groups[key] = { period: key, revenue: 0, profit: 0, boxes: 0, count: 0 };
      groups[key].revenue += s.total_amount || 0;
      groups[key].profit += s.profit || 0;
      groups[key].boxes += s.boxes_sold || 0;
      groups[key].count += 1;
    });
    return Object.values(groups);
  }, [filteredSales, groupBy]);

  const totalRevenue = filteredSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalBoxes = filteredSales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
  const totalCount = filteredSales.length;
  const cashSales = filteredSales.filter(s => !s.is_debt);
  const debtSales = filteredSales.filter(s => s.is_debt);
  const cashRevenue = cashSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const debtRevenue = debtSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const avgSale = totalCount > 0 ? totalRevenue / totalCount : 0;
  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      if (!map[s.product_id]) map[s.product_id] = { revenue: 0, boxes: 0, profit: 0, count: 0 };
      map[s.product_id].revenue += s.total_amount || 0;
      map[s.product_id].boxes += s.boxes_sold || 0;
      map[s.product_id].profit += s.profit || 0;
      map[s.product_id].count += 1;
    });
    return Object.entries(map)
      .map(([id, stats]) => ({ product: products.find(p => p.id === id), ...stats }))
      .filter(x => x.product)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredSales, products]);

  const topCustomers = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      if (!s.customer_id && !s.customer_name) return;
      const key = s.customer_id || s.customer_name;
      if (!map[key]) map[key] = { name: s.customer_name || s.customer_id, revenue: 0, count: 0, debt: 0 };
      map[key].revenue += s.total_amount || 0;
      map[key].count += 1;
      if (s.is_debt) map[key].debt += s.total_amount || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  const saleTypeData = [
    { name: 'Наличные', value: cashRevenue },
    { name: 'В долг', value: debtRevenue },
  ].filter(d => d.value > 0);

  const productTypeData = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const p = products.find(x => x.id === s.product_id);
      const type = p?.product_type || 'Другое';
      map[type] = (map[type] || 0) + (s.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredSales, products]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Summary
    const summaryWs = XLSX.utils.aoa_to_sheet([
      ['Отчёт о продажах', '', business?.name || ''],
      ['Период', dateRange?.from ? format(dateRange.from, 'dd.MM.yyyy') : 'Всё время', dateRange?.to ? format(dateRange.to, 'dd.MM.yyyy') : ''],
      [],
      ['Метрика', 'Значение'],
      ['Всего продаж', totalCount],
      ['Выручка (с.)', Math.round(totalRevenue)],
      ['Прибыль (с.)', Math.round(totalProfit)],
      ['Маржа (%)', Number(marginPct)],
      ['Коробок продано', totalBoxes],
      ['Средний чек (с.)', Math.round(avgSale)],
      ['Наличные (с.)', Math.round(cashRevenue)],
      ['В долг (с.)', Math.round(debtRevenue)],
    ]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Сводка');

    // Sheet 2: By period
    const periodRows = [['Период', 'Выручка', 'Прибыль', 'Коробок', 'Продаж']];
    chartData.forEach(r => periodRows.push([r.period, Math.round(r.revenue), Math.round(r.profit), r.boxes, r.count]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodRows), 'По периодам');

    // Sheet 3: Detailed sales
    const salesRows = [['Дата', 'Товар', 'Коробок', 'Выручка', 'Прибыль', 'Тип', 'Клиент', 'Сотрудник']];
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.product_id);
      salesRows.push([
        format(parseISO(s.sale_date || s.created_date), 'dd.MM.yyyy HH:mm'),
        prod ? `${prod.brand} ${prod.model}` : '—',
        s.boxes_sold || 0,
        s.total_amount || 0,
        s.profit || 0,
        s.is_debt ? 'В долг' : 'Наличные',
        s.customer_name || '—',
        s.created_by || '—',
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), 'Все продажи');

    // Sheet 4: Top products
    const prodRows = [['#', 'Товар', 'Выручка', 'Прибыль', 'Коробок', 'Продаж']];
    topProducts.forEach((tp, i) => prodRows.push([i + 1, `${tp.product.brand} ${tp.product.model}`, Math.round(tp.revenue), Math.round(tp.profit), tp.boxes, tp.count]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), 'Топ товаров');

    XLSX.writeFile(wb, `report_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Отчёт о продажах — ${business?.name || ''}`, 20, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Период: ${dateRange?.from ? format(dateRange.from, 'dd.MM.yyyy') : 'Всё время'} — ${dateRange?.to ? format(dateRange.to, 'dd.MM.yyyy') : ''}`, 20, 30);
      doc.text(`Создан: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 20, 37);

      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.text('Итоги', 20, 50);
      doc.setFontSize(10);
      const stats = [
        [`Продаж: ${totalCount}`, `Выручка: ${Math.round(totalRevenue).toLocaleString()} с.`],
        [`Прибыль: ${Math.round(totalProfit).toLocaleString()} с.`, `Маржа: ${marginPct}%`],
        [`Коробок: ${totalBoxes}`, `Средний чек: ${Math.round(avgSale).toLocaleString()} с.`],
        [`Наличные: ${Math.round(cashRevenue).toLocaleString()} с.`, `Долг: ${Math.round(debtRevenue).toLocaleString()} с.`],
      ];
      stats.forEach((row, i) => {
        doc.text(row[0], 20, 60 + i * 8);
        doc.text(row[1], 110, 60 + i * 8);
      });

      doc.setFontSize(13);
      doc.text('Топ товаров', 20, 102);
      doc.setFontSize(9);
      topProducts.slice(0, 8).forEach((tp, i) => {
        doc.text(
          `${i + 1}. ${tp.product.brand} ${tp.product.model}  —  ${Math.round(tp.revenue).toLocaleString()} с.  |  ${tp.boxes} кор.  |  прибыль ${Math.round(tp.profit).toLocaleString()} с.`,
          20, 112 + i * 8
        );
      });

      doc.setFontSize(13);
      doc.text('Динамика продаж', 20, 185);
      doc.setFontSize(8);
      const headers = ['Период', 'Выручка', 'Прибыль', 'Кор.', 'Прод.'];
      const cols = [20, 70, 115, 150, 170];
      headers.forEach((h, i) => doc.text(h, cols[i], 193));
      doc.setDrawColor(200);
      doc.line(20, 195, 190, 195);
      chartData.slice(0, 20).forEach((row, i) => {
        doc.text(row.period, cols[0], 200 + i * 7);
        doc.text(Math.round(row.revenue).toLocaleString(), cols[1], 200 + i * 7);
        doc.text(Math.round(row.profit).toLocaleString(), cols[2], 200 + i * 7);
        doc.text(String(row.boxes), cols[3], 200 + i * 7);
        doc.text(String(row.count), cols[4], 200 + i * 7);
      });

      doc.save(`report_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    } finally {
      setExportingPDF(false);
    }
  };

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
  const DataComponent = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;

  const formatDateDisplay = () => {
    if (!dateRange?.from) return 'Всё время';
    if (!dateRange?.to) return format(dateRange.from, 'dd MMM yyyy', { locale: ru });
    return `${format(dateRange.from, 'dd MMM', { locale: ru })} — ${format(dateRange.to, 'dd MMM yyyy', { locale: ru })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Отчёты
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {formatDateDisplay()} · {totalCount} продаж
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={exportPDF} disabled={exportingPDF} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0">
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* === FILTERS === */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        {/* Date presets */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Период
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                  activePreset === preset.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                )}
              >
                {preset.label}
              </button>
            ))}
            {/* Custom date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1",
                    activePreset === 'custom'
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                  )}
                >
                  <CalendarIcon className="w-3 h-3" />
                  Своя дата
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) {
                      setDateRange(range);
                      setActivePreset('custom');
                      if (range?.from && range?.to) setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>
          {dateRange?.from && (
            <p className="text-xs text-slate-400">
              📅 {formatDateDisplay()}
            </p>
          )}
        </div>

        {/* Other filters */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Select value={saleType} onValueChange={setSaleType}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="cash">💵 Наличные</SelectItem>
              <SelectItem value="debt">📋 В долг</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Товар" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все товары</SelectItem>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.brand} {p.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Сотрудник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.user_email}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Группировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">По дням</SelectItem>
              <SelectItem value="week">По неделям</SelectItem>
              <SelectItem value="month">По месяцам</SelectItem>
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Столбчатый</SelectItem>
              <SelectItem value="line">Линейный</SelectItem>
              <SelectItem value="area">Областной</SelectItem>
            </SelectContent>
          </Select>

          {(selectedEmployee !== 'all' || selectedProduct !== 'all' || saleType !== 'all') && (
            <button
              onClick={() => { setSelectedEmployee('all'); setSelectedProduct('all'); setSaleType('all'); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors h-8"
            >
              <X className="w-3 h-3" /> Сбросить
            </button>
          )}
        </div>
      </div>

      {/* === KPI CARDS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Выручка', value: `${Math.round(totalRevenue).toLocaleString()} с.`, icon: TrendingUp, color: 'from-blue-400 to-indigo-500', sub: `Ср. чек: ${Math.round(avgSale).toLocaleString()} с.` },
          { label: 'Прибыль', value: `${Math.round(totalProfit).toLocaleString()} с.`, icon: ArrowUpRight, color: 'from-emerald-400 to-teal-500', sub: `Маржа: ${marginPct}%` },
          { label: 'Коробок', value: totalBoxes, icon: Package, color: 'from-amber-400 to-orange-500', sub: `${totalCount} продаж` },
          { label: 'Наличные / Долг', value: `${Math.round(cashRevenue).toLocaleString()} с.`, icon: Banknote, color: 'from-violet-400 to-purple-500', sub: `Долг: ${Math.round(debtRevenue).toLocaleString()} с.` },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-slate-400">{card.label}</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* === TABS === */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Обзор' },
          { id: 'products', label: 'Товары' },
          { id: 'customers', label: 'Клиенты' },
          { id: 'table', label: 'Таблица' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Main chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-slate-800">Динамика продаж</h2>
              <div className="flex gap-1.5">
                {[
                  { key: 'revenue', label: 'Выручка' },
                  { key: 'profit', label: 'Прибыль' },
                  { key: 'boxes', label: 'Коробки' },
                  { key: 'count', label: 'Кол-во' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setChartMetric(m.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                      chartMetric === m.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                <p>Нет данных за выбранный период</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ChartComponent data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(v) => [`${Math.round(v).toLocaleString()}${chartMetric === 'revenue' || chartMetric === 'profit' ? ' с.' : ''}`, chartMetric === 'revenue' ? 'Выручка' : chartMetric === 'profit' ? 'Прибыль' : chartMetric === 'boxes' ? 'Коробок' : 'Продаж']}
                  />
                  <DataComponent
                    dataKey={chartMetric}
                    fill={chartMetric === 'profit' ? '#10b981' : chartMetric === 'boxes' ? '#f59e0b' : chartMetric === 'count' ? '#8b5cf6' : '#6366f1'}
                    stroke={chartMetric === 'profit' ? '#10b981' : chartMetric === 'boxes' ? '#f59e0b' : chartMetric === 'count' ? '#8b5cf6' : '#6366f1'}
                    strokeWidth={2}
                    fillOpacity={0.3}
                  />
                </ChartComponent>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie charts row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sales type pie */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Наличные vs Долг</h2>
              {saleTypeData.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Нет данных</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={saleTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                        {saleTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${Math.round(v).toLocaleString()} с.`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {saleTypeData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-slate-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{Math.round(d.value).toLocaleString()} с.</span>
                      </div>
                    ))}
                    <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                      Продаж: {cashSales.length} нал. / {debtSales.length} долг
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product type pie */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">По типу товара</h2>
              {productTypeData.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Нет данных</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={productTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                        {productTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${Math.round(v).toLocaleString()} с.`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {productTypeData.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-slate-600 truncate max-w-[80px]">{d.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{Math.round(d.value).toLocaleString()} с.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === PRODUCTS TAB === */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Топ товаров ({topProducts.length})</h2>
          {topProducts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((tp, i) => {
                const maxRevenue = topProducts[0]?.revenue || 1;
                const pct = Math.round((tp.revenue / maxRevenue) * 100);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1",
                      i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-600"
                    )}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">{tp.product.brand} {tp.product.model}</span>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-sm font-bold text-slate-900">{Math.round(tp.revenue).toLocaleString()} с.</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400">
                        <span>{tp.boxes} кор.</span>
                        <span>{tp.count} прод.</span>
                        <span className="text-emerald-600">↑ {Math.round(tp.profit).toLocaleString()} с. прибыль</span>
                        <span className="text-slate-500">{tp.revenue > 0 ? ((tp.profit / tp.revenue) * 100).toFixed(1) : 0}% маржа</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === CUSTOMERS TAB === */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Клиенты за период ({topCustomers.length})</h2>
          {topCustomers.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Нет данных о клиентах за выбранный период</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.count} покупок</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">{Math.round(c.revenue).toLocaleString()} с.</p>
                    {c.debt > 0 && <p className="text-xs text-red-500">Долг: {Math.round(c.debt).toLocaleString()} с.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === TABLE TAB === */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">По периодам</h2>
            <span className="text-xs text-slate-400">{chartData.length} строк</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Период</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Выручка</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Прибыль</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Маржа</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Коробок</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Продаж</th>
                </tr>
              </thead>
              <tbody>
                {chartData.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Нет данных</td></tr>
                ) : chartData.map((row, i) => {
                  const rowMargin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                      <td className="py-2 px-3 text-right text-indigo-600 font-semibold">{Math.round(row.revenue).toLocaleString()} с.</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{Math.round(row.profit).toLocaleString()} с.</td>
                      <td className="py-2 px-3 text-right text-slate-500 text-xs">{rowMargin}%</td>
                      <td className="py-2 px-3 text-right text-slate-600">{row.boxes}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{row.count}</td>
                    </tr>
                  );
                })}
              </tbody>
              {chartData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-2 px-3 text-slate-700">Итого</td>
                    <td className="py-2 px-3 text-right text-indigo-700">{Math.round(totalRevenue).toLocaleString()} с.</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{Math.round(totalProfit).toLocaleString()} с.</td>
                    <td className="py-2 px-3 text-right text-slate-600">{marginPct}%</td>
                    <td className="py-2 px-3 text-right text-slate-700">{totalBoxes}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{totalCount}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}