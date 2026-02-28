import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, Download, Filter, TrendingUp, ShoppingCart,
  Package, Users, RefreshCw, FileSpreadsheet, Loader2
} from 'lucide-react';
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, isWithinInterval, subDays, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import DateFilter from '@/components/filters/DateFilter';
import { startOfMonth as som, endOfMonth as eom } from 'date-fns';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [business, setBusiness] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });
  const [groupBy, setGroupBy] = useState('day'); // day | week | month
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [chartType, setChartType] = useState('bar'); // bar | line | area
  const [exportingPDF, setExportingPDF] = useState(false);

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
        const [salesData, productsData, employeesData] = await Promise.all([
          base44.entities.Sale.filter({ business_id: biz.id }),
          base44.entities.Product.filter({ business_id: biz.id }),
          base44.entities.Employee.filter({ business_id: biz.id }),
        ]);
        setSales(salesData);
        setProducts(productsData);
        setEmployees(employeesData);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.is_cancelled) return false;
      const saleDate = parseISO(s.sale_date || s.created_date);
      if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: startOfDay(dateRange.to) })) {
          // allow same-day
          if (saleDate < startOfDay(dateRange.from) || saleDate > new Date(dateRange.to.getTime() + 86400000)) return false;
        }
      }
      if (selectedEmployee !== 'all' && s.created_by !== selectedEmployee) return false;
      if (selectedProduct !== 'all' && s.product_id !== selectedProduct) return false;
      return true;
    });
  }, [sales, dateRange, selectedEmployee, selectedProduct]);

  // Group sales by period
  const chartData = useMemo(() => {
    const groups = {};
    filteredSales.forEach(s => {
      const d = parseISO(s.sale_date || s.created_date);
      let key;
      if (groupBy === 'day') key = format(d, 'dd.MM');
      else if (groupBy === 'week') key = `Нед. ${format(startOfWeek(d, { locale: ru }), 'dd.MM')}`;
      else key = format(startOfMonth(d), 'MMM yyyy', { locale: ru });

      if (!groups[key]) groups[key] = { period: key, revenue: 0, profit: 0, boxes: 0, count: 0 };
      groups[key].revenue += s.total_amount || 0;
      groups[key].profit += s.profit || 0;
      groups[key].boxes += s.boxes_sold || 0;
      groups[key].count += 1;
    });
    return Object.values(groups);
  }, [filteredSales, groupBy]);

  // Summary stats
  const totalRevenue = filteredSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalBoxes = filteredSales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
  const totalCount = filteredSales.length;

  // Top products in filtered sales
  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      if (!map[s.product_id]) map[s.product_id] = { revenue: 0, boxes: 0, profit: 0 };
      map[s.product_id].revenue += s.total_amount || 0;
      map[s.product_id].boxes += s.boxes_sold || 0;
      map[s.product_id].profit += s.profit || 0;
    });
    return Object.entries(map)
      .map(([id, stats]) => ({ product: products.find(p => p.id === id), ...stats }))
      .filter(x => x.product)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales, products]);

  // Export CSV
  const exportCSV = () => {
    const rows = filteredSales.map(s => {
      const prod = products.find(p => p.id === s.product_id);
      return {
        'Дата': format(parseISO(s.sale_date || s.created_date), 'dd.MM.yyyy HH:mm'),
        'Товар': prod ? `${prod.brand} ${prod.model}` : '—',
        'Коробок': s.boxes_sold || 0,
        'Выручка': s.total_amount || 0,
        'Прибыль': s.profit || 0,
        'Тип': s.is_debt ? 'В долг' : 'Наличные',
        'Клиент': s.customer_name || '—',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
    XLSX.writeFile(wb, `report_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  // Export PDF
  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Отчёт о продажах', 20, 20);
      doc.setFontSize(11);
      doc.text(`Период: ${dateRange?.from ? format(dateRange.from, 'dd.MM.yyyy') : '—'} — ${dateRange?.to ? format(dateRange.to, 'dd.MM.yyyy') : '—'}`, 20, 32);
      doc.text(`Бизнес: ${business?.name || '—'}`, 20, 40);

      doc.setFontSize(13);
      doc.text('Итоги:', 20, 54);
      doc.setFontSize(11);
      doc.text(`Выручка: ${Math.round(totalRevenue).toLocaleString()} с.`, 20, 63);
      doc.text(`Прибыль: ${Math.round(totalProfit).toLocaleString()} с.`, 20, 71);
      doc.text(`Коробок продано: ${totalBoxes}`, 20, 79);
      doc.text(`Кол-во продаж: ${totalCount}`, 20, 87);

      doc.setFontSize(13);
      doc.text('Топ-5 товаров:', 20, 101);
      doc.setFontSize(10);
      topProducts.forEach((tp, i) => {
        doc.text(
          `${i + 1}. ${tp.product.brand} ${tp.product.model} — ${Math.round(tp.revenue).toLocaleString()} с. (${tp.boxes} кор.)`,
          20, 112 + i * 9
        );
      });

      doc.setFontSize(13);
      doc.text('Детали по периодам:', 20, 160);
      doc.setFontSize(9);
      chartData.slice(0, 20).forEach((row, i) => {
        doc.text(
          `${row.period}  |  Выручка: ${Math.round(row.revenue).toLocaleString()} с.  |  Прибыль: ${Math.round(row.profit).toLocaleString()} с.  |  Коробок: ${row.boxes}`,
          20, 170 + i * 8
        );
      });

      doc.save(`report_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    } finally {
      setExportingPDF(false);
    }
  };

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
  const DataComponent = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Отчёты
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Детальный анализ продаж с экспортом</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={exportPDF} disabled={exportingPDF} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0">
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Фильтры</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Группировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">По дням</SelectItem>
              <SelectItem value="week">По неделям</SelectItem>
              <SelectItem value="month">По месяцам</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-44">
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
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Сотрудник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.user_email}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Столбчатый</SelectItem>
              <SelectItem value="line">Линейный</SelectItem>
              <SelectItem value="area">Областной</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Выручка', value: `${Math.round(totalRevenue).toLocaleString()} с.`, icon: TrendingUp, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
          { label: 'Прибыль', value: `${Math.round(totalProfit).toLocaleString()} с.`, icon: TrendingUp, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
          { label: 'Коробок продано', value: totalBoxes, icon: Package, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
          { label: 'Продаж', value: totalCount, icon: ShoppingCart, color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{card.label}</p>
              <p className="text-lg font-bold text-slate-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Динамика продаж</h2>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
            <p>Нет данных за выбранный период</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ChartComponent data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                formatter={(v, name) => [`${Math.round(v).toLocaleString()} с.`, name === 'revenue' ? 'Выручка' : 'Прибыль']}
                labelStyle={{ fontWeight: 600, color: '#1e293b' }}
              />
              <Legend formatter={(val) => val === 'revenue' ? 'Выручка' : 'Прибыль'} />
              <DataComponent dataKey="revenue" fill="#6366f1" stroke="#6366f1" strokeWidth={2} fillOpacity={0.3} name="revenue" />
              <DataComponent dataKey="profit" fill="#10b981" stroke="#10b981" strokeWidth={2} fillOpacity={0.3} name="profit" />
            </ChartComponent>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Топ-5 товаров</h2>
        {topProducts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">Нет данных</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((tp, i) => {
              const maxRevenue = topProducts[0]?.revenue || 1;
              const pct = Math.round((tp.revenue / maxRevenue) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate">{tp.product.brand} {tp.product.model}</span>
                      <span className="text-sm font-semibold text-slate-900 ml-2 flex-shrink-0">{Math.round(tp.revenue).toLocaleString()} с.</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{tp.boxes} кор. · прибыль {Math.round(tp.profit).toLocaleString()} с.</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Детали по периодам</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Период</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Выручка</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Прибыль</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Коробок</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Продаж</th>
              </tr>
            </thead>
            <tbody>
              {chartData.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Нет данных</td></tr>
              ) : chartData.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                  <td className="py-2 px-3 text-right text-indigo-600 font-semibold">{Math.round(row.revenue).toLocaleString()} с.</td>
                  <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{Math.round(row.profit).toLocaleString()} с.</td>
                  <td className="py-2 px-3 text-right text-slate-600">{row.boxes}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{row.count}</td>
                </tr>
              ))}
            </tbody>
            {chartData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-3 text-slate-700">Итого</td>
                  <td className="py-2 px-3 text-right text-indigo-700">{Math.round(totalRevenue).toLocaleString()} с.</td>
                  <td className="py-2 px-3 text-right text-emerald-700">{Math.round(totalProfit).toLocaleString()} с.</td>
                  <td className="py-2 px-3 text-right text-slate-700">{totalBoxes}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{totalCount}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}