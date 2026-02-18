import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, Box, Layers, Hash, TrendingUp, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ProductDetail() {
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [sales, setSales] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('id');
      
      if (!productId) {
        navigate(-1);
        return;
      }

      const [productData, salesData] = await Promise.all([
        base44.entities.Product.filter({ id: productId }),
        base44.entities.Sale.filter({ product_id: productId })
      ]);

      if (productData.length === 0) {
        navigate(-1);
        return;
      }

      const prod = productData[0];
      setProduct(prod);
      setSales(salesData.sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date)));

      if (prod.warehouse_id) {
        const warehouseData = await base44.entities.Warehouse.filter({ id: prod.warehouse_id });
        if (warehouseData.length > 0) {
          setWarehouse(warehouseData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Товар не найден</p>
      </div>
    );
  }

  const totalPairs = (product.boxes_in_stock || 0) * (product.pairs_per_box || 6);
  const totalItems = totalPairs * 2;
  const totalStockValue = (product.boxes_in_stock || 0) * (product.sale_price || 0);
  const potentialProfit = (product.boxes_in_stock || 0) * ((product.sale_price || 0) - (product.purchase_price || 0));
  
  const totalSold = sales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Button>

      {/* Product Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo */}
          <div className="w-full md:w-64 h-64 bg-slate-100 rounded-xl overflow-hidden">
            {product.photo_url ? (
              <img src={product.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-slate-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{product.brand}</h1>
                <p className="text-lg text-slate-600">{product.model}</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600">
                {product.product_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-slate-500">Цвет</p>
                <p className="font-medium text-slate-900">{product.color}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Размеры</p>
                <p className="font-medium text-slate-900">{product.size_from} - {product.size_to}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Пар в коробке</p>
                <p className="font-medium text-slate-900">{product.pairs_per_box}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Склад</p>
                <p className="font-medium text-slate-900">{warehouse?.name || 'Не указан'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Дата добавления</p>
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {product.created_date ? format(parseISO(product.created_date), 'dd MMM yyyy', { locale: ru }) : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500">Цена закупки</p>
                <p className="text-xl font-bold text-slate-900">{product.purchase_price?.toLocaleString()} с.</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Цена продажи</p>
                <p className="text-xl font-bold text-emerald-600">{product.sale_price?.toLocaleString()} с.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <Box className="w-5 h-5 text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">На складе</p>
          <p className="text-2xl font-bold text-indigo-600">{product.boxes_in_stock || 0} коробок</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <Layers className="w-5 h-5 text-purple-600 mb-2" />
          <p className="text-sm text-slate-500">Пар</p>
          <p className="text-2xl font-bold text-slate-900">{totalPairs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <Package className="w-5 h-5 text-cyan-600 mb-2" />
          <p className="text-sm text-slate-500">Стоимость склада</p>
          <p className="text-2xl font-bold text-slate-900">{totalStockValue.toLocaleString()} с.</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500">Потенциальная прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{potentialProfit.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Всего продаж</p>
          <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Продано коробок</p>
          <p className="text-2xl font-bold text-blue-600">{totalSold}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{totalProfit.toLocaleString()} с.</p>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">История продаж</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Дата</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Коробок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Тип</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
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
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Этот товар ещё не продавался
          </div>
        )}
      </div>
    </div>
  );
}