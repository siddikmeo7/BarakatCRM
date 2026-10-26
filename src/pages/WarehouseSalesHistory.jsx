import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronUp, ChevronDown, Box, TrendingUp, Calendar, Table as TableIcon, List, Banknote } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function WarehouseSalesHistory() {
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const scrollRef = useRef(null);
  const holdRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const warehouseId = urlParams.get('id');

      if (!warehouseId) {
        navigate(-1);
        return;
      }

      const [warehouseData, salesData, productsData] = await Promise.all([
        base44.entities.Warehouse.filter({ id: warehouseId }),
        base44.entities.Sale.filter({ warehouse_id: warehouseId }),
        base44.entities.Product.list()
      ]);

      if (warehouseData.length === 0) {
        navigate(-1);
        return;
      }

      setWarehouse(warehouseData[0]);
      setSales(salesData.sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date)));
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Прокрутка идёт внутри бокса, поэтому длинная история не растягивает страницу.
  // Нажатие — шаг, удержание кнопки — плавная прокрутка.
  const scrollByStep = (dir) => scrollRef.current?.scrollBy({ top: dir * 90 });

  const startHold = (dir) => {
    stopHold();
    scrollByStep(dir);
    holdRef.current = setInterval(() => scrollRef.current?.scrollBy({ top: dir * 26 }), 40);
  };

  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  useEffect(() => stopHold, []);

  // Фильтрация по датам
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date || sale.created_date);
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return saleDate >= fromDate && saleDate <= toDate;
    }
    return true;
  });

  const totalBoxesSold = filteredSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Button>

      <PageHeader
        title={`История продаж: ${warehouse?.name}`}
        subtitle={warehouse?.address}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <Box className="w-5 h-5 text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Продано коробок</p>
          <p className="text-2xl font-bold text-indigo-600">{totalBoxesSold}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Выручка</p>
          <p className="text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString()} с.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{totalProfit.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Продажи — в фиксированном боксе с кнопками прокрутки */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Продажи ({filteredSales.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Все продажи прокручиваются внутри бокса — страница остаётся на месте
            </p>
          </div>

          {/* Режим отображения: таблица или список */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView('table')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all',
                view === 'table' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Таблица
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all',
                view === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              <List className="w-3.5 h-3.5" />
              Список
            </button>
          </div>
        </div>

        <div className="relative">
          <div ref={scrollRef} className="h-[56vh] min-h-[320px] overflow-y-auto custom-scroll">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Продаж не найдено за выбранный период</div>
            ) : view === 'table' ? (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Товар</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Коробок</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-300">Сумма</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-300">Прибыль</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Тип</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSales.map(sale => {
                    const product = products.find(p => p.id === sale.product_id);

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ProductPhoto
                              photoUrl={product?.photo_url}
                              brand={product?.brand}
                              className="w-8 h-8 rounded-lg"
                              textClassName="text-[7px]"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{product?.brand}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{product?.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                          {sale.boxes_sold}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                          {sale.total_amount?.toLocaleString()} с.
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          +{sale.profit?.toLocaleString()} с.
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sale.is_debt ? (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium">
                              В долг
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium">
                              Наличные
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map(sale => {
                  const product = products.find(p => p.id === sale.product_id);

                  return (
                    <div key={sale.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <ProductPhoto
                        photoUrl={product?.photo_url}
                        brand={product?.brand}
                        className="w-10 h-10 rounded-lg flex-none"
                        textClassName="text-[8px]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {product?.brand} {product?.model}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      <div className="text-center flex-none">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Коробок</p>
                        <p className="font-bold text-indigo-600">{sale.boxes_sold}</p>
                      </div>
                      <div className="text-right flex-none">
                        <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
                          {sale.total_amount?.toLocaleString()} с.
                        </p>
                        <p className="text-xs font-semibold text-emerald-600">+{sale.profit?.toLocaleString()} с.</p>
                      </div>
                      {sale.is_debt ? (
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium flex-none">
                          В долг
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium flex-none">
                          Наличные
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Кнопки прокрутки: нажмите или удерживайте */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
            <button
              type="button"
              onMouseDown={() => startHold(-1)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={(e) => { e.preventDefault(); startHold(-1); }}
              onTouchEnd={stopHold}
              title="Вверх — удерживайте для быстрой прокрутки"
              className="w-9 h-9 rounded-full bg-slate-900/85 dark:bg-slate-700 text-white flex items-center justify-center shadow-lg hover:bg-slate-900 active:scale-95 transition"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={() => startHold(1)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={(e) => { e.preventDefault(); startHold(1); }}
              onTouchEnd={stopHold}
              title="Вниз — удерживайте для быстрой прокрутки"
              className="w-9 h-9 rounded-full bg-slate-900/85 dark:bg-slate-700 text-white flex items-center justify-center shadow-lg hover:bg-slate-900 active:scale-95 transition"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Показаны все продажи за период: {filteredSales.length}</span>
          <span className="flex items-center gap-1">
            <Banknote className="w-3 h-3" />
            Итого: {totalRevenue.toLocaleString()} с.
          </span>
        </div>
      </div>
    </div>
  );
}