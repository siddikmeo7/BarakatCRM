import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import DateFilter from '@/components/filters/DateFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Box, TrendingUp, Calendar, Package } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function WarehouseSalesHistory() {
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <Box className="w-5 h-5 text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Продано коробок</p>
          <p className="text-2xl font-bold text-indigo-600">{totalBoxesSold}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-sm text-slate-500">Выручка</p>
          <p className="text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500">Прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{totalProfit.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Продажи ({filteredSales.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Товар</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Тип</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => {
                const product = products.find(p => p.id === sale.product_id);
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
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
                          <p className="text-sm font-medium text-slate-900">{product?.brand}</p>
                          <p className="text-xs text-slate-500">{product?.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                      {sale.boxes_sold}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {sale.total_amount?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      +{sale.profit?.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.is_debt ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                          В долг
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                          Наличные
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Продаж не найдено за выбранный период
          </div>
        )}
      </div>
    </div>
  );
}