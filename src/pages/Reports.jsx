import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FileText, Download, Filter, TrendingUp, ShoppingCart,
  Package, Users, FileSpreadsheet, Loader2,
  CalendarIcon, Banknote, ArrowUpRight, X,
  CreditCard, Warehouse, RotateCcw, Star
} from 'lucide-react';
import {
  format, parseISO, startOfDay, endOfDay, startOfWeek, startOfMonth,
  isWithinInterval, subDays, subMonths, subYears,
  startOfYear, endOfYear, endOfMonth, endOfWeek
} from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';

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

const TABS = [
  { id: 'overview', label: '📊 Обзор', icon: TrendingUp },
  { id: 'sales', label: '🛒 Продажи', icon: ShoppingCart },
  { id: 'products', label: '📦 Товары', icon: Package },
  { id: 'customers', label: '👥 Клиенты', icon: Users },
  { id: 'employees', label: '🧑‍💼 Сотрудники', icon: Users },
  { id: 'debts', label: '💳 Долги', icon: CreditCard },
  { id: 'warehouses', label: '🏭 Склады', icon: Warehouse },
  { id: 'returns', label: '↩️ Возвраты', icon: RotateCcw },
];

export default function Reports() {
  const { can, isOwner, isReady } = useEmployeeAccess();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [returns, setReturns] = useState([]);
  const [business, setBusiness] = useState(null);

  const [dateRange, setDateRange] = useState({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('30 дней');
  const [groupBy, setGroupBy] = useState('day');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [saleType, setSaleType] = useState('all');
  const [chartType, setChartType] = useState('bar');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showComparison, setShowComparison] = useState(false);

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
        const [salesData, productsData, employeesData, customersData, warehousesData, returnsData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id }),
          base44.entities.Customer.filter({ business_id: biz.id }),
          base44.entities.Warehouse.filter({ business_id: biz.id }),
          base44.entities.Return.filter({ business_id: biz.id }),
        ]);
        setSales(salesData);
        setProducts(productsData);
        setEmployees(employeesData);
        setCustomers(customersData);
        setWarehouses(warehousesData);
        setReturns(returnsData);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    setDateRange(preset.getValue());
    setCalendarOpen(false);
  };

  // Previous period for comparison
  const prevPeriodSales = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const duration = dateRange.to.getTime() - dateRange.from.getTime();
    const prevFrom = new Date(dateRange.from.getTime() - duration - 86400000);
    const prevTo = new Date(dateRange.from.getTime() - 86400000);
    return sales.filter(s => {
      if (s.is_cancelled) return false;
      const d = parseISO(s.sale_date || s.created_date);
      return d >= startOfDay(prevFrom) && d <= endOfDay(prevTo);
    });
  }, [sales, dateRange]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.is_cancelled) return false;
      if (dateRange?.from) {
        const d = parseISO(s.sale_date || s.created_date);
        if (d < startOfDay(dateRange.from)) return false;
        if (dateRange?.to && d > endOfDay(dateRange.to)) return false;
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

  // Summary
  const totalRevenue = filteredSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalBoxes = filteredSales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
  const totalCount = filteredSales.length;
  const cashSales = filteredSales.filter(s => !s.is_debt);
  const debtSales = filteredSales.filter(s => s.is_debt);
  const cashRevenue = cashSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const debtRevenue = debtSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const avgSale = totalCount > 0 ? totalRevenue / totalCount : 0;

  // Employee stats
  const employeeStats = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const email = s.created_by || 'unknown';
      if (!map[email]) map[email] = { email, revenue: 0, profit: 0, boxes: 0, count: 0, debtCount: 0 };
      map[email].revenue += s.total_amount || 0;
      map[email].profit += s.profit || 0;
      map[email].boxes += s.boxes_sold || 0;
      map[email].count += 1;
      if (s.is_debt) map[email].debtCount += 1;
    });
    return Object.values(map)
      .map(stat => ({ ...stat, employee: employees.find(e => e.user_email === stat.email) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, employees]);

  // Products
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
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // Customers from filtered sales
  const topCustomers = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const key = s.customer_id || s.customer_name;
      if (!key) return;
      if (!map[key]) map[key] = { name: s.customer_name || key, revenue: 0, count: 0, debt: 0 };
      map[key].revenue += s.total_amount || 0;
      map[key].count += 1;
      if (s.is_debt) map[key].debt += s.total_amount || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Debtors
  const debtors = customers.filter(c => (c.total_debt || 0) > 0).sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0));
  const totalDebt = debtors.reduce((s, c) => s + (c.total_debt || 0), 0);

  // Warehouses
  const warehouseStats = useMemo(() => {
    return warehouses.map(w => {
      const wProds = products.filter(p => p.warehouse_id === w.id);
      const boxes = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
      const value = wProds.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.sale_price || 0), 0);
      const wSales = filteredSales.filter(s => s.warehouse_id === w.id);
      const revenue = wSales.reduce((s, x) => s + (x.total_amount || 0), 0);
      return { ...w, boxes, value, productsCount: wProds.length, salesRevenue: revenue, salesCount: wSales.length };
    });
  }, [warehouses, products, filteredSales]);

  // Returns
  const filteredReturns = useMemo(() => {
    if (!dateRange?.from) return returns;
    return returns.filter(r => {
      const d = parseISO(r.return_date || r.created_date);
      if (d < startOfDay(dateRange.from)) return false;
      if (dateRange?.to && d > endOfDay(dateRange.to)) return false;
      return true;
    });
  }, [returns, dateRange]);
  const totalRefund = filteredReturns.reduce((s, r) => s + (r.refund_amount || 0), 0);

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

  const formatDate = () => {
    if (!dateRange?.from) return 'Всё время';
    if (!dateRange?.to) return format(dateRange.from, 'dd MMM yyyy', { locale: ru });
    return `${format(dateRange.from, 'dd MMM', { locale: ru })} — ${format(dateRange.to, 'dd MMM yyyy', { locale: ru })}`;
  };

  // === EXPORT PDF ===
  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      const totalPairs = filteredSales.reduce((s, x) => s + (x.pairs_sold || (x.boxes_sold || 0) * 6), 0);
      const stockTotalBoxes = products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
      const stockTotalPairs = products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.pairs_per_box || 6), 0);

      const tS = 'padding:5px 8px;border:1px solid #e2e8f0;font-size:10px;';
      const hS = 'background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #e2e8f0;font-weight:700;font-size:10px;';
      const tableS = 'width:100%;border-collapse:collapse;margin-bottom:16px;';
      const h2S = 'font-size:13px;font-weight:700;margin:18px 0 8px;color:#1e293b;padding-bottom:4px;border-bottom:2px solid #6366f1;';

      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:24px;width:780px;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <h1 style="font-size:20px;margin:0 0 6px;">${business?.name || 'Бизнес'} — Отчёт</h1>
            <p style="margin:0 0 2px;font-size:12px;opacity:0.9;">Период: <b>${formatDate()}</b></p>
            <p style="margin:0;font-size:11px;opacity:0.7;">Создан: ${format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
          </div>

          <h2 style="${h2S}">📊 Сводка продаж</h2>
          <table style="${tableS}">
            <tr><th style="${hS}">Метрика</th><th style="${hS}">Значение</th></tr>
            <tr><td style="${tS}">Всего продаж</td><td style="${tS}"><b>${totalCount}</b></td></tr>
            <tr><td style="${tS}">Выручка</td><td style="${tS}"><b>${Math.round(totalRevenue).toLocaleString()} с.</b></td></tr>
            <tr><td style="${tS}">Прибыль</td><td style="${tS}"><b>${Math.round(totalProfit).toLocaleString()} с.</b></td></tr>
            <tr><td style="${tS}">Маржа прибыли</td><td style="${tS}">${marginPct}%</td></tr>
            <tr><td style="${tS}">Средний чек</td><td style="${tS}">${Math.round(avgSale).toLocaleString()} с.</td></tr>
            <tr><td style="${tS}">Коробок продано</td><td style="${tS}"><b>${totalBoxes}</b></td></tr>
            <tr><td style="${tS}">Пар продано</td><td style="${tS}">${totalPairs}</td></tr>
            <tr><td style="${tS}">Наличные</td><td style="${tS}">${Math.round(cashRevenue).toLocaleString()} с. (${cashSales.length} прод.)</td></tr>
            <tr><td style="${tS}">В долг</td><td style="${tS}">${Math.round(debtRevenue).toLocaleString()} с. (${debtSales.length} прод.)</td></tr>
          </table>

          <h2 style="${h2S}">🛒 Топ товаров по выручке</h2>
          <table style="${tableS}">
            <tr>
              <th style="${hS}">#</th><th style="${hS}">Товар</th><th style="${hS}">Тип</th>
              <th style="${hS}">Выручка</th><th style="${hS}">Прибыль</th><th style="${hS}">Маржа</th>
              <th style="${hS}">Коробок</th><th style="${hS}">Пар</th>
            </tr>
            ${topProducts.slice(0, 15).map((tp, i) => {
              const m = tp.revenue > 0 ? ((tp.profit / tp.revenue) * 100).toFixed(1) : 0;
              const pairs = tp.boxes * (tp.product.pairs_per_box || 6);
              return `<tr>
                <td style="${tS}">${i + 1}</td>
                <td style="${tS}"><b>${tp.product.brand} ${tp.product.model}</b></td>
                <td style="${tS}">${tp.product.product_type || '—'}</td>
                <td style="${tS}">${Math.round(tp.revenue).toLocaleString()} с.</td>
                <td style="${tS}">${Math.round(tp.profit).toLocaleString()} с.</td>
                <td style="${tS}">${m}%</td>
                <td style="${tS}">${tp.boxes}</td>
                <td style="${tS}">${pairs}</td>
              </tr>`;
            }).join('')}
          </table>

          <h2 style="${h2S}">🏭 Склады</h2>
          <table style="${tableS}">
            <tr>
              <th style="${hS}">Склад</th><th style="${hS}">Товаров</th><th style="${hS}">Коробок</th>
              <th style="${hS}">Стоимость склада</th><th style="${hS}">Продаж</th><th style="${hS}">Выручка за период</th>
            </tr>
            ${warehouseStats.map(w => `<tr>
              <td style="${tS}"><b>${w.name}</b></td>
              <td style="${tS}">${w.productsCount}</td>
              <td style="${tS}">${w.boxes}</td>
              <td style="${tS}">${Math.round(w.value).toLocaleString()} с.</td>
              <td style="${tS}">${w.salesCount}</td>
              <td style="${tS}">${Math.round(w.salesRevenue).toLocaleString()} с.</td>
            </tr>`).join('')}
          </table>

          <h2 style="${h2S}">💳 Должники (${debtors.length})</h2>
          ${debtors.length > 0 ? `<table style="${tableS}">
            <tr>
              <th style="${hS}">#</th><th style="${hS}">Клиент</th><th style="${hS}">Телефон</th>
              <th style="${hS}">Долг</th><th style="${hS}">Оплачено</th>
            </tr>
            ${debtors.slice(0, 20).map((c, i) => `<tr>
              <td style="${tS}">${i + 1}</td>
              <td style="${tS}"><b>${c.name}</b></td>
              <td style="${tS}">${c.phone || '—'}</td>
              <td style="${tS};color:#ef4444;font-weight:700;">${Math.round(c.total_debt || 0).toLocaleString()} с.</td>
              <td style="${tS}">${Math.round(c.total_paid || 0).toLocaleString()} с.</td>
            </tr>`).join('')}
            <tr style="background:#fef2f2;">
              <td style="${tS}" colspan="3"><b>ИТОГО ДОЛГ</b></td>
              <td style="${tS};color:#ef4444;font-weight:700;">${Math.round(totalDebt).toLocaleString()} с.</td>
              <td style="${tS}"></td>
            </tr>
          </table>` : '<p style="color:#94a3b8;font-size:12px;">Должников нет</p>'}

          <h2 style="${h2S}">📦 Остатки товаров на складах</h2>
          <p style="font-size:11px;color:#64748b;margin:0 0 8px;">Всего: ${stockTotalBoxes} коробок · ${stockTotalPairs} пар</p>
          <table style="${tableS}">
            <tr>
              <th style="${hS}">Товар</th><th style="${hS}">Тип</th><th style="${hS}">Склад</th>
              <th style="${hS}">Коробок</th><th style="${hS}">Пар</th>
              <th style="${hS}">Закупка/кор.</th><th style="${hS}">Продажа/кор.</th><th style="${hS}">Стоимость</th>
            </tr>
            ${[...products].sort((a, b) => (b.boxes_in_stock || 0) - (a.boxes_in_stock || 0)).map(p => {
              const wh = warehouses.find(w => w.id === p.warehouse_id);
              const boxes = p.boxes_in_stock || 0;
              const pairs = boxes * (p.pairs_per_box || 6);
              return `<tr>
                <td style="${tS}"><b>${p.brand} ${p.model}</b></td>
                <td style="${tS}">${p.product_type || '—'}</td>
                <td style="${tS}">${wh?.name || '—'}</td>
                <td style="${tS}">${boxes}</td>
                <td style="${tS}">${pairs}</td>
                <td style="${tS}">${p.purchase_price || 0} с.</td>
                <td style="${tS}">${p.sale_price || 0} с.</td>
                <td style="${tS}">${Math.round(boxes * (p.sale_price || 0)).toLocaleString()} с.</td>
              </tr>`;
            }).join('')}
            <tr style="background:#f1f5f9;font-weight:700;">
              <td style="${tS}" colspan="3">ИТОГО</td>
              <td style="${tS}">${stockTotalBoxes}</td>
              <td style="${tS}">${stockTotalPairs}</td>
              <td style="${tS}" colspan="2"></td>
              <td style="${tS}">${Math.round(products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.sale_price || 0), 0)).toLocaleString()} с.</td>
            </tr>
          </table>

          ${filteredReturns.length > 0 ? `
          <h2 style="${h2S}">↩️ Возвраты (${filteredReturns.length})</h2>
          <table style="${tableS}">
            <tr>
              <th style="${hS}">Дата</th><th style="${hS}">Товар</th><th style="${hS}">Клиент</th>
              <th style="${hS}">Коробок</th><th style="${hS}">Сумма возврата</th><th style="${hS}">Причина</th>
            </tr>
            ${filteredReturns.map(r => {
              const prod = products.find(p => p.id === r.product_id);
              const cust = customers.find(c => c.id === r.customer_id);
              return `<tr>
                <td style="${tS}">${r.return_date ? format(parseISO(r.return_date), 'dd.MM.yyyy') : '—'}</td>
                <td style="${tS}">${prod ? `${prod.brand} ${prod.model}` : '—'}</td>
                <td style="${tS}">${cust?.name || '—'}</td>
                <td style="${tS}">${r.boxes_returned || 0}</td>
                <td style="${tS};color:#ef4444;">${Math.round(r.refund_amount || 0).toLocaleString()} с.</td>
                <td style="${tS}">${r.reason || '—'}</td>
              </tr>`;
            }).join('')}
          </table>` : ''}
        </div>
      `;

      const el = document.createElement('div');
      el.innerHTML = html;
      el.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:white;';
      document.body.appendChild(el);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await doc.html(el, {
        callback: (doc) => {
          doc.save(`report_${business?.name || 'business'}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
          document.body.removeChild(el);
          setExportingPDF(false);
        },
        x: 5, y: 5, width: 200, windowWidth: 800, autoPaging: 'text'
      });
    } catch (e) {
      console.error('PDF export error:', e);
      setExportingPDF(false);
    }
  };

  // === EXPORT MARKDOWN ===
  const exportMarkdown = () => {
    const lines = [];
    const sep = () => lines.push('');
    const h1 = (t) => lines.push(`# ${t}`);
    const h2 = (t) => lines.push(`\n## ${t}`);
    const li = (t) => lines.push(`- ${t}`);
    const row = (...cols) => lines.push(`| ${cols.join(' | ')} |`);
    const divider = (n) => lines.push(`| ${Array(n).fill('---').join(' | ')} |`);
    const hr = () => lines.push('---');

    h1(`Отчёт: ${business?.name || '—'}`);
    li(`Период: **${formatDate()}**`);
    li(`Дата создания: **${format(new Date(), 'dd.MM.yyyy HH:mm')}**`);
    sep();
    hr();

    h2('📊 ОБЩАЯ СВОДКА ПРОДАЖ');
    const totalPairs = filteredSales.reduce((s, x) => s + (x.pairs_sold || (x.boxes_sold || 0) * 6), 0);
    const totalItems = filteredSales.reduce((s, x) => s + (x.items_sold || (x.boxes_sold || 0) * 12), 0);
    row('Метрика', 'Значение');
    divider(2);
    row('Всего продаж', `**${totalCount}**`);
    row('Выручка', `**${Math.round(totalRevenue).toLocaleString()} с.**`);
    row('Прибыль', `**${Math.round(totalProfit).toLocaleString()} с.**`);
    row('Маржа прибыли', `**${marginPct}%**`);
    row('Средний чек', `${Math.round(avgSale).toLocaleString()} с.`);
    row('Коробок продано', `**${totalBoxes}**`);
    row('Пар продано', `**${totalPairs}**`);
    row('Штук продано', totalItems);
    row('Наличные', `${Math.round(cashRevenue).toLocaleString()} с. (${cashSales.length} продаж)`);
    row('В долг', `${Math.round(debtRevenue).toLocaleString()} с. (${debtSales.length} продаж)`);
    sep();
    hr();

    h2('🛒 ТОП ТОВАРОВ ПО ВЫРУЧКЕ');
    row('#', 'Товар', 'Тип', 'Выручка', 'Прибыль', 'Маржа', 'Коробок', 'Пар', 'Продаж');
    divider(9);
    topProducts.slice(0, 15).forEach((tp, i) => {
      const m = tp.revenue > 0 ? ((tp.profit / tp.revenue) * 100).toFixed(1) : 0;
      const pairs = tp.boxes * (tp.product.pairs_per_box || 6);
      row(i + 1, `${tp.product.brand} ${tp.product.model}`, tp.product.product_type || '—',
        `${Math.round(tp.revenue).toLocaleString()} с.`, `${Math.round(tp.profit).toLocaleString()} с.`,
        `${m}%`, tp.boxes, pairs, tp.count);
    });
    sep();
    hr();

    h2('👥 КЛИЕНТЫ ЗА ПЕРИОД');
    if (topCustomers.length === 0) {
      li('Нет данных о клиентах за период');
    } else {
      row('#', 'Клиент', 'Выручка', 'Покупок', 'Долг');
      divider(5);
      topCustomers.slice(0, 15).forEach((c, i) => {
        row(i + 1, c.name, `${Math.round(c.revenue).toLocaleString()} с.`, c.count,
          c.debt > 0 ? `**${Math.round(c.debt).toLocaleString()} с.**` : '—');
      });
    }
    sep();
    hr();

    h2('💳 ДОЛЖНИКИ');
    li(`Всего должников: **${debtors.length}** из ${customers.length} клиентов`);
    li(`Общий долг: **${Math.round(totalDebt).toLocaleString()} с.**`);
    if (debtors.length > 0) {
      li(`Средний долг: **${Math.round(totalDebt / debtors.length).toLocaleString()} с.**`);
      li(`Максимальный долг: **${Math.round(debtors[0]?.total_debt || 0).toLocaleString()} с.** (${debtors[0]?.name})`);
      sep();
      row('#', 'Клиент', 'Долг', 'Оплачено', 'Телефон');
      divider(5);
      debtors.slice(0, 20).forEach((c, i) => {
        row(i + 1, c.name, `**${Math.round(c.total_debt || 0).toLocaleString()} с.**`,
          `${Math.round(c.total_paid || 0).toLocaleString()} с.`, c.phone || '—');
      });
    }
    sep();
    hr();

    h2('🏭 СКЛАДЫ');
    row('Склад', 'Товаров', 'Коробок', 'Стоимость склада', 'Продаж за период', 'Выручка за период');
    divider(6);
    warehouseStats.forEach(w => {
      row(w.name, w.productsCount, w.boxes, `${Math.round(w.value).toLocaleString()} с.`,
        w.salesCount, `${Math.round(w.salesRevenue).toLocaleString()} с.`);
    });
    sep();
    hr();

    h2('📦 ОСТАТКИ ТОВАРОВ НА СКЛАДАХ');
    const stockProds = [...products].sort((a, b) => (b.boxes_in_stock || 0) - (a.boxes_in_stock || 0));
    const stockTotalBoxesMd = stockProds.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
    const stockTotalPairsMd = stockProds.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.pairs_per_box || 6), 0);
    li(`Всего коробок: **${stockTotalBoxesMd}** | Всего пар: **${stockTotalPairsMd}**`);
    li(`Общая стоимость: **${Math.round(products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.sale_price || 0), 0)).toLocaleString()} с.**`);
    sep();
    row('Товар', 'Тип', 'Цвет', 'Склад', 'Коробок', 'Пар', 'Закупка/кор.', 'Продажа/кор.', 'Стоимость');
    divider(9);
    stockProds.forEach(p => {
      const wh = warehouses.find(w => w.id === p.warehouse_id);
      const pairs = (p.boxes_in_stock || 0) * (p.pairs_per_box || 6);
      const val = (p.boxes_in_stock || 0) * (p.sale_price || 0);
      row(`${p.brand} ${p.model}`, p.product_type || '—', p.color || '—', wh?.name || '—',
        `${p.boxes_in_stock || 0}`, pairs, `${p.purchase_price || 0} с.`, `${p.sale_price || 0} с.`,
        `${Math.round(val).toLocaleString()} с.`);
    });
    sep();
    hr();

    h2('↩️ ВОЗВРАТЫ ЗА ПЕРИОД');
    li(`Всего возвратов: **${filteredReturns.length}**`);
    li(`Общая сумма возвратов: **${Math.round(totalRefund).toLocaleString()} с.**`);
    if (filteredReturns.length > 0) {
      sep();
      row('Дата', 'Товар', 'Клиент', 'Коробок', 'Сумма возврата', 'Причина');
      divider(6);
      filteredReturns.forEach(r => {
        const prod = products.find(p => p.id === r.product_id);
        const cust = customers.find(c => c.id === r.customer_id);
        row(r.return_date ? format(parseISO(r.return_date), 'dd.MM.yyyy') : '—',
          prod ? `${prod.brand} ${prod.model}` : '—',
          cust?.name || '—', r.boxes_returned || 0,
          `${Math.round(r.refund_amount || 0).toLocaleString()} с.`, r.reason || '—');
      });
    }
    sep();
    hr();

    h2('📈 ДИНАМИКА ПО ПЕРИОДАМ');
    row('Период', 'Выручка', 'Прибыль', 'Маржа', 'Коробок', 'Пар', 'Продаж', 'Ср. чек');
    divider(8);
    chartData.forEach(r => {
      const m = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : 0;
      const avgChk = r.count > 0 ? Math.round(r.revenue / r.count) : 0;
      const pairsR = r.boxes * 6;
      row(r.period, `${Math.round(r.revenue).toLocaleString()} с.`, `${Math.round(r.profit).toLocaleString()} с.`,
        `${m}%`, r.boxes, pairsR, r.count, `${avgChk.toLocaleString()} с.`);
    });
    sep();

    const md = lines.join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${business?.name || 'business'}_${format(new Date(), 'dd-MM-yyyy')}.md`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // === EXPORT EXCEL ===
  const exportExcel = () => {

    const wb = XLSX.utils.book_new();

    // Summary
    const exTotalPairs = filteredSales.reduce((s, x) => s + (x.pairs_sold || (x.boxes_sold || 0) * 6), 0);
    const exTotalItems = filteredSales.reduce((s, x) => s + (x.items_sold || (x.boxes_sold || 0) * 12), 0);
    const stockTotalBoxesEx = products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0);
    const stockTotalPairsEx = products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.pairs_per_box || 6), 0);
    const summaryRows = [
      ['Отчёт', business?.name || '', '', 'Период', formatDate(), '', 'Дата создания', format(new Date(), 'dd.MM.yyyy HH:mm')],
      [],
      ['=== ПРОДАЖИ ==='],
      ['Метрика', 'Значение'],
      ['Продаж', totalCount],
      ['Выручка (с.)', Math.round(totalRevenue)],
      ['Прибыль (с.)', Math.round(totalProfit)],
      ['Маржа (%)', Number(marginPct)],
      ['Коробок продано', totalBoxes],
      ['Пар продано', exTotalPairs],
      ['Штук продано', exTotalItems],
      ['Средний чек (с.)', Math.round(avgSale)],
      ['Наличные (с.)', Math.round(cashRevenue)],
      ['Наличных продаж', cashSales.length],
      ['В долг (с.)', Math.round(debtRevenue)],
      ['Долговых продаж', debtSales.length],
      [],
      ['=== СКЛАД ==='],
      ['Метрика', 'Значение'],
      ['Товаров на складах', products.length],
      ['Коробок на складах', stockTotalBoxesEx],
      ['Пар на складах', stockTotalPairsEx],
      [],
      ['=== ВОЗВРАТЫ ==='],
      ['Метрика', 'Значение'],
      ['Возвратов', filteredReturns.length],
      ['Сумма возвратов (с.)', Math.round(totalRefund)],
      [],
      ['=== КЛИЕНТЫ И ДОЛГИ ==='],
      ['Метрика', 'Значение'],
      ['Клиентов всего', customers.length],
      ['Должников', debtors.length],
      ['Общий долг (с.)', Math.round(totalDebt)],
      ['Средний долг (с.)', debtors.length > 0 ? Math.round(totalDebt / debtors.length) : 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Сводка');

    // Sales by period
    const periodRows = [['Период', 'Выручка (с.)', 'Прибыль (с.)', 'Маржа %', 'Коробок', 'Пар', 'Продаж', 'Ср. чек (с.)']];
    chartData.forEach(r => {
      const m = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : 0;
      const avgChk = r.count > 0 ? Math.round(r.revenue / r.count) : 0;
      const pairsR = r.boxes * 6;
      periodRows.push([r.period, Math.round(r.revenue), Math.round(r.profit), Number(m), r.boxes, pairsR, r.count, avgChk]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodRows), 'По периодам');

    // All sales detail
    const salesRows = [['Дата', 'Товар', 'Тип товара', 'Склад', 'Коробок', 'Пар', 'Штук', 'Выручка (с.)', 'Прибыль (с.)', 'Тип оплаты', 'Клиент', 'Сотрудник']];
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.product_id);
      const wh = warehouses.find(w => w.id === s.warehouse_id);
      const boxes = s.boxes_sold || 0;
      const pairs = s.pairs_sold || boxes * (prod?.pairs_per_box || 6);
      const items = s.items_sold || pairs * 2;
      salesRows.push([
        format(parseISO(s.sale_date || s.created_date), 'dd.MM.yyyy HH:mm'),
        prod ? `${prod.brand} ${prod.model}` : '—',
        prod?.product_type || '—',
        wh?.name || '—',
        boxes,
        pairs,
        items,
        s.total_amount || 0,
        s.profit || 0,
        s.is_debt ? 'В долг' : 'Наличные',
        s.customer_name || '—',
        s.created_by || '—',
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), 'Все продажи');

    // Top products
    const prodRows = [['#', 'Товар', 'Тип', 'Выручка (с.)', 'Прибыль (с.)', 'Маржа %', 'Коробок', 'Пар', 'Продаж']];
    topProducts.forEach((tp, i) => {
      const m = tp.revenue > 0 ? ((tp.profit / tp.revenue) * 100).toFixed(1) : 0;
      const pairs = tp.boxes * (tp.product.pairs_per_box || 6);
      prodRows.push([i + 1, `${tp.product.brand} ${tp.product.model}`, tp.product.product_type || '—', Math.round(tp.revenue), Math.round(tp.profit), Number(m), tp.boxes, pairs, tp.count]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), 'Топ товаров');

    // Stock
    const stockRows = [['Товар', 'Тип', 'Цвет', 'Склад', 'Коробок', 'Пар', 'Штук', 'Закупка/кор. (с.)', 'Продажа/кор. (с.)', 'Стоимость оптовая (с.)', 'Стоимость розничная (с.)']];
    [...products].sort((a, b) => (b.boxes_in_stock || 0) - (a.boxes_in_stock || 0)).forEach(p => {
      const wh = warehouses.find(w => w.id === p.warehouse_id);
      const boxes = p.boxes_in_stock || 0;
      const pairs = boxes * (p.pairs_per_box || 6);
      const items = pairs * 2;
      stockRows.push([
        `${p.brand} ${p.model}`,
        p.product_type || '—',
        p.color || '—',
        wh?.name || '—',
        boxes,
        pairs,
        items,
        p.purchase_price || 0,
        p.sale_price || 0,
        boxes * (p.purchase_price || 0),
        boxes * (p.sale_price || 0),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockRows), 'Остатки');

    // Customers
    const custRows = [['#', 'Клиент', 'Телефон', 'Адрес', 'Долг', 'Оплачено']];
    customers.sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0)).forEach((c, i) => {
      custRows.push([i + 1, c.name, c.phone || '—', c.address || '—', c.total_debt || 0, c.total_paid || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custRows), 'Клиенты');

    // Debtors
    const debtRows = [['#', 'Клиент', 'Телефон', 'Долг (с.)', 'Оплачено (с.)']];
    debtors.forEach((c, i) => {
      debtRows.push([i + 1, c.name, c.phone || '—', c.total_debt || 0, c.total_paid || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(debtRows), 'Должники');

    // Warehouses
    const whRows = [['Склад', 'Товаров', 'Коробок', 'Стоимость склада', 'Продаж за период', 'Выручка за период']];
    warehouseStats.forEach(w => {
      whRows.push([w.name, w.productsCount, w.boxes, Math.round(w.value), w.salesCount, Math.round(w.salesRevenue)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(whRows), 'Склады');

    // Returns
    const retRows = [['Дата', 'Товар', 'Клиент', 'Коробок', 'Сумма возврата', 'Причина', 'Состояние']];
    filteredReturns.forEach(r => {
      const prod = products.find(p => p.id === r.product_id);
      const cust = customers.find(c => c.id === r.customer_id);
      retRows.push([
        r.return_date ? format(parseISO(r.return_date), 'dd.MM.yyyy') : '—',
        prod ? `${prod.brand} ${prod.model}` : '—',
        cust?.name || '—',
        r.boxes_returned || 0,
        r.refund_amount || 0,
        r.reason || '—',
        r.condition || '—',
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(retRows), 'Возвраты');

    XLSX.writeFile(wb, `report_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const ChartComp = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
  const DataComp = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!can('view_reports')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Нет доступа</h2>
        <p className="text-slate-400 max-w-sm">У вас нет разрешения на просмотр раздела «Отчёты». Обратитесь к владельцу бизнеса.</p>
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
          <p className="text-slate-500 text-sm mt-0.5">{formatDate()} · {totalCount} продаж</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportPDF} disabled={exportingPDF} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {exportingPDF ? 'Генерация...' : 'PDF'}
          </Button>
          <Button variant="outline" onClick={exportExcel} className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportMarkdown} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
            <FileText className="w-4 h-4" />
            Markdown
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Период</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DATE_PRESETS.map(preset => (
              <button key={preset.label} onClick={() => applyPreset(preset)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                  activePreset === preset.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                )}>
                {preset.label}
              </button>
            ))}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1",
                  activePreset === 'custom' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>
                  <CalendarIcon className="w-3 h-3" /> Своя дата
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={dateRange}
                  onSelect={(range) => { if (range) { setDateRange(range); setActivePreset('custom'); if (range?.from && range?.to) setCalendarOpen(false); } }}
                  numberOfMonths={2} locale={ru} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Select value={saleType} onValueChange={setSaleType}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="cash">💵 Наличные</SelectItem>
              <SelectItem value="debt">📋 В долг</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Товар" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все товары</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.brand} {p.model}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Сотрудник" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.user_email}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">По дням</SelectItem>
              <SelectItem value="week">По неделям</SelectItem>
              <SelectItem value="month">По месяцам</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Столбчатый</SelectItem>
              <SelectItem value="line">Линейный</SelectItem>
              <SelectItem value="area">Областной</SelectItem>
            </SelectContent>
          </Select>
          {(selectedEmployee !== 'all' || selectedProduct !== 'all' || saleType !== 'all') && (
            <button onClick={() => { setSelectedEmployee('all'); setSelectedProduct('all'); setSaleType('all'); }}
              className="flex items-center gap-1 px-2.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 h-8">
              <X className="w-3 h-3" /> Сбросить
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(() => {
          const prevRevenue = prevPeriodSales.reduce((s, x) => s + (x.total_amount || 0), 0);
          const prevProfit = prevPeriodSales.reduce((s, x) => s + (x.profit || 0), 0);
          const prevBoxes = prevPeriodSales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
          const delta = (cur, prev) => {
            if (!prev || !showComparison) return null;
            const pct = ((cur - prev) / prev * 100).toFixed(1);
            return { pct, positive: cur >= prev };
          };
          return [
            { label: 'Выручка', value: `${Math.round(totalRevenue).toLocaleString()} с.`, sub: `Ср. чек: ${Math.round(avgSale).toLocaleString()} с.`, icon: TrendingUp, color: 'from-blue-400 to-indigo-500', d: delta(totalRevenue, prevRevenue) },
            { label: 'Прибыль', value: `${Math.round(totalProfit).toLocaleString()} с.`, sub: `Маржа: ${marginPct}%`, icon: ArrowUpRight, color: 'from-emerald-400 to-teal-500', d: delta(totalProfit, prevProfit) },
            { label: 'Коробок продано', value: totalBoxes, sub: `${totalCount} продаж`, icon: Package, color: 'from-amber-400 to-orange-500', d: delta(totalBoxes, prevBoxes) },
            { label: 'Долг клиентов', value: `${Math.round(totalDebt).toLocaleString()} с.`, sub: `${debtors.length} должников`, icon: CreditCard, color: 'from-red-400 to-rose-500', d: null },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-slate-400">{card.label}</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-slate-400">{card.sub}</p>
                {card.d && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${card.d.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {card.d.positive ? '▲' : '▼'} {Math.abs(card.d.pct)}%
                  </span>
                )}
              </div>
            </div>
          ));
        })()}
      </div>
      {/* Comparison toggle */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowComparison(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showComparison ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
          {showComparison ? '✓ ' : ''}Сравнение с пред. периодом
        </button>
        {showComparison && prevPeriodSales.length > 0 && (
          <span className="text-xs text-slate-400">Пред. период: {prevPeriodSales.length} продаж · {Math.round(prevPeriodSales.reduce((s,x)=>s+(x.total_amount||0),0)).toLocaleString()} с.</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Динамика продаж</h2>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                <p>Нет данных за выбранный период</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ChartComp data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(v, name) => [`${Math.round(v).toLocaleString()} с.`, name === 'revenue' ? 'Выручка' : 'Прибыль']} />
                  <DataComp dataKey="revenue" fill="#6366f1" stroke="#6366f1" strokeWidth={2} fillOpacity={0.3} name="revenue" />
                  <DataComp dataKey="profit" fill="#10b981" stroke="#10b981" strokeWidth={2} fillOpacity={0.3} name="profit" />
                </ChartComp>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Наличные vs Долг</h2>
              {saleTypeData.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Нет данных</p> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart><Pie data={saleTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {saleTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie><Tooltip formatter={(v) => `${Math.round(v).toLocaleString()} с.`} /></PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {saleTypeData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} /><span className="text-slate-600">{d.name}</span></div>
                        <span className="font-semibold text-slate-800">{Math.round(d.value).toLocaleString()} с.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">По типу товара</h2>
              {productTypeData.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Нет данных</p> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart><Pie data={productTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {productTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie><Tooltip formatter={(v) => `${Math.round(v).toLocaleString()} с.`} /></PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {productTypeData.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-slate-600 truncate max-w-[80px]">{d.name}</span></div>
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

      {/* SALES TAB */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Все продажи ({filteredSales.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
               <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Дата</th>
               <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Товар</th>
               <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Кор.</th>
               <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Пар</th>
               <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Выручка</th>
               <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Прибыль</th>
               <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Тип</th>
               <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Клиент</th>
              </tr></thead>
              <tbody>
               {filteredSales.slice(0, 100).map((s, i) => {
                 const prod = products.find(p => p.id === s.product_id);
                 const boxes = s.boxes_sold || 0;
                 const pairs = s.pairs_sold || boxes * (prod?.pairs_per_box || 6);
                 return (
                   <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                     <td className="py-1.5 px-2 text-xs text-slate-500">{s.sale_date ? format(parseISO(s.sale_date), 'dd.MM HH:mm') : '—'}</td>
                     <td className="py-1.5 px-2 text-xs font-medium text-slate-700 max-w-[120px] truncate">{prod ? `${prod.brand} ${prod.model}` : '—'}</td>
                     <td className="py-1.5 px-2 text-xs text-right font-semibold text-indigo-700">{boxes}</td>
                     <td className="py-1.5 px-2 text-xs text-right text-slate-500">{pairs}</td>
                     <td className="py-1.5 px-2 text-xs text-right text-indigo-600 font-semibold">{Math.round(s.total_amount || 0).toLocaleString()} с.</td>
                     <td className="py-1.5 px-2 text-xs text-right text-emerald-600">{Math.round(s.profit || 0).toLocaleString()} с.</td>
                     <td className="py-1.5 px-2"><span className={`text-xs px-1.5 py-0.5 rounded-full ${s.is_debt ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{s.is_debt ? 'Долг' : 'Нал'}</span></td>
                     <td className="py-1.5 px-2 text-xs text-slate-500 max-w-[80px] truncate">{s.customer_name || '—'}</td>
                   </tr>
                 );
               })}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-semibold">
               <td colSpan={2} className="py-2 px-2 text-xs">Итого</td>
               <td className="py-2 px-2 text-xs text-right text-indigo-700">{totalBoxes} кор.</td>
               <td className="py-2 px-2 text-xs text-right text-slate-500">{filteredSales.reduce((s, x) => s + (x.pairs_sold || (x.boxes_sold||0)*6), 0)} пар</td>
               <td className="py-2 px-2 text-xs text-right text-indigo-700">{Math.round(totalRevenue).toLocaleString()} с.</td>
               <td className="py-2 px-2 text-xs text-right text-emerald-700">{Math.round(totalProfit).toLocaleString()} с.</td>
               <td colSpan={2}></td>
              </tr></tfoot>
            </table>
            {filteredSales.length > 100 && <p className="text-xs text-slate-400 text-center mt-2">Показано 100 из {filteredSales.length}. Скачайте Excel для полного отчёта.</p>}
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Low stock warning */}
          {(() => {
            const lowStock = products.filter(p => (p.boxes_in_stock || 0) <= 2 && p.boxes_in_stock !== undefined);
            if (lowStock.length === 0) return null;
            return (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Мало на складе ({lowStock.length} товаров)</p>
                <div className="flex flex-wrap gap-2">
                  {lowStock.map(p => (
                    <span key={p.id} className="px-2.5 py-1 bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                      {p.brand} {p.model} — {p.boxes_in_stock} кор.
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Топ товаров по продажам</h2>
            {topProducts.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">Нет данных</p> : (
              <div className="space-y-3">
                {topProducts.slice(0, 15).map((tp, i) => {
                  const pct = Math.round((tp.revenue / (topProducts[0]?.revenue || 1)) * 100);
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn("w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1",
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-600")}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800 truncate">{tp.product.brand} {tp.product.model}</span>
                          <span className="text-sm font-bold text-slate-900 ml-2 flex-shrink-0">{Math.round(tp.revenue).toLocaleString()} с.</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="font-semibold text-indigo-600">{tp.boxes} кор.</span>
                          <span>{tp.boxes * (tp.product.pairs_per_box || 6)} пар</span>
                          <span>{tp.count} прод.</span>
                          <span className="text-emerald-600">+{Math.round(tp.profit).toLocaleString()} с.</span>
                          <span>{tp.revenue > 0 ? ((tp.profit / tp.revenue) * 100).toFixed(1) : 0}% маржа</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Остатки на складах ({products.length} товаров)</h2>
              <div className="flex gap-2 text-sm">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-semibold">{products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0)} кор.</span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-semibold">{products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.pairs_per_box || 6), 0)} пар</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Товар</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Тип</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Коробок</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Пар</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Закупка</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Продажа</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Стоимость</th>
                </tr></thead>
                <tbody>
                  {[...products].sort((a, b) => (b.boxes_in_stock || 0) - (a.boxes_in_stock || 0)).map((p) => {
                    const boxes = p.boxes_in_stock || 0;
                    const pairs = boxes * (p.pairs_per_box || 6);
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-xs font-medium text-slate-700">{p.brand} {p.model}</td>
                        <td className="py-1.5 px-2 text-xs text-slate-500">{p.product_type || '—'}</td>
                        <td className="py-1.5 px-2 text-xs text-right font-semibold text-indigo-700">{boxes}</td>
                        <td className="py-1.5 px-2 text-xs text-right text-slate-500">{pairs}</td>
                        <td className="py-1.5 px-2 text-xs text-right text-slate-500">{p.purchase_price || 0} с.</td>
                        <td className="py-1.5 px-2 text-xs text-right text-indigo-600">{p.sale_price || 0} с.</td>
                        <td className="py-1.5 px-2 text-xs text-right text-emerald-600 font-semibold">{Math.round(boxes * (p.sale_price || 0)).toLocaleString()} с.</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="bg-slate-50 font-semibold">
                  <td colSpan={2} className="py-2 px-2 text-xs">Итого</td>
                  <td className="py-2 px-2 text-xs text-right text-indigo-700">{products.reduce((s, p) => s + (p.boxes_in_stock || 0), 0)} кор.</td>
                  <td className="py-2 px-2 text-xs text-right">{products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.pairs_per_box || 6), 0)} пар</td>
                  <td colSpan={2}></td>
                  <td className="py-2 px-2 text-xs text-right text-emerald-700">{Math.round(products.reduce((s, p) => s + (p.boxes_in_stock || 0) * (p.sale_price || 0), 0)).toLocaleString()} с.</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
          </div>
          )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {employeeStats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Нет данных о продажах сотрудников за период</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Статистика по сотрудникам ({employeeStats.length})</h2>
              <div className="space-y-3">
                {employeeStats.map((stat, i) => {
                  const name = stat.employee?.name || stat.email || 'Неизвестно';
                  const pct = Math.round((stat.revenue / (employeeStats[0]?.revenue || 1)) * 100);
                  const margin = stat.revenue > 0 ? ((stat.profit / stat.revenue) * 100).toFixed(1) : 0;
                  return (
                    <div key={stat.email} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-indigo-400'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{name}</p>
                          <p className="text-xs text-slate-400">{stat.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{Math.round(stat.revenue).toLocaleString()} с.</p>
                          <p className="text-xs text-emerald-600">+{Math.round(stat.profit).toLocaleString()} с. прибыль</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-center">
                        <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Продаж</p><p className="font-bold text-slate-700">{stat.count}</p></div>
                        <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Коробок</p><p className="font-bold text-indigo-700">{stat.boxes}</p></div>
                        <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Маржа</p><p className="font-bold text-emerald-700">{margin}%</p></div>
                        <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">В долг</p><p className={`font-bold ${stat.debtCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{stat.debtCount}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Сотрудников</p>
                  <p className="text-xl font-bold text-indigo-700">{employeeStats.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Лидер по выручке</p>
                  <p className="text-sm font-bold text-emerald-700 truncate">{employeeStats[0]?.employee?.name || employeeStats[0]?.email || '—'}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Ср. выручка/чел.</p>
                  <p className="text-sm font-bold text-amber-700">{Math.round(totalRevenue / (employeeStats.length || 1)).toLocaleString()} с.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Все клиенты ({customers.length})</h2>
          <div className="space-y-2">
            {customers.sort((a, b) => (b.total_paid || 0) + (b.total_debt || 0) - ((a.total_paid || 0) + (a.total_debt || 0))).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {c.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">Оплачено: <span className="font-semibold text-slate-800">{Math.round(c.total_paid || 0).toLocaleString()} с.</span></p>
                  {(c.total_debt || 0) > 0 && <p className="text-xs text-red-500 font-semibold">Долг: {Math.round(c.total_debt).toLocaleString()} с.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEBTS TAB */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Должников', value: debtors.length, sub: `из ${customers.length} клиентов`, color: 'bg-red-50 border-red-100' },
              { label: 'Общий долг', value: `${Math.round(totalDebt).toLocaleString()} с.`, sub: debtors.length > 0 ? `Ср.: ${Math.round(totalDebt / debtors.length).toLocaleString()} с.` : '—', color: 'bg-orange-50 border-orange-100' },
              { label: 'Макс. долг', value: debtors.length > 0 ? `${Math.round(debtors[0]?.total_debt || 0).toLocaleString()} с.` : '—', sub: debtors[0]?.name || '—', color: 'bg-amber-50 border-amber-100' },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${c.color}`}>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{c.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Должники</h2>
            <div className="space-y-2">
              {debtors.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50">
                  <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-red-600">{Math.round(c.total_debt).toLocaleString()} с.</p>
                    <p className="text-xs text-slate-400">Оплачено: {Math.round(c.total_paid || 0).toLocaleString()} с.</p>
                  </div>
                </div>
              ))}
              {debtors.length === 0 && <p className="text-center text-slate-400 py-8">Нет должников 🎉</p>}
            </div>
          </div>
        </div>
      )}

      {/* WAREHOUSES TAB */}
      {activeTab === 'warehouses' && (
        <div className="space-y-3">
          {warehouseStats.map(w => (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Warehouse className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{w.name}</h3>
                  {w.address && <p className="text-xs text-slate-400">{w.address}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Товаров', value: w.productsCount },
                  { label: 'Коробок', value: w.boxes },
                  { label: 'Стоимость склада', value: `${Math.round(w.value).toLocaleString()} с.` },
                  { label: 'Выручка за период', value: `${Math.round(w.salesRevenue).toLocaleString()} с.` },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {warehouseStats.length === 0 && <p className="text-center text-slate-400 py-8">Нет складов</p>}
        </div>
      )}

      {/* RETURNS TAB */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Возвратов за период</p>
              <p className="text-2xl font-bold text-slate-900">{filteredReturns.length}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Сумма возвратов</p>
              <p className="text-2xl font-bold text-red-700">{Math.round(totalRefund).toLocaleString()} с.</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Все возвраты</h2>
            {filteredReturns.length === 0 ? <p className="text-center text-slate-400 py-8">Нет возвратов за период</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Дата</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Товар</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Клиент</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Кор.</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Возврат</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Причина</th>
                  </tr></thead>
                  <tbody>
                    {filteredReturns.map((r, i) => {
                      const prod = products.find(p => p.id === r.product_id);
                      const cust = customers.find(c => c.id === r.customer_id);
                      return (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-1.5 px-2 text-xs text-slate-500">{r.return_date ? format(parseISO(r.return_date), 'dd.MM.yyyy') : '—'}</td>
                          <td className="py-1.5 px-2 text-xs font-medium text-slate-700">{prod ? `${prod.brand} ${prod.model}` : '—'}</td>
                          <td className="py-1.5 px-2 text-xs text-slate-500">{cust?.name || '—'}</td>
                          <td className="py-1.5 px-2 text-xs text-right">{r.boxes_returned || 0}</td>
                          <td className="py-1.5 px-2 text-xs text-right text-red-600 font-semibold">{Math.round(r.refund_amount || 0).toLocaleString()} с.</td>
                          <td className="py-1.5 px-2 text-xs text-slate-400">{r.reason || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}