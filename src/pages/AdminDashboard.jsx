import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Package,
  CreditCard,
  ArrowRight
} from 'lucide-react';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user.email !== ADMIN_EMAIL) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      setIsAdmin(true);

      const [businessesData, salesData, productsData, customersData] = await Promise.all([
        base44.entities.Business.list(),
        base44.entities.Sale.list(),
        base44.entities.Product.list(),
        base44.entities.Customer.list()
      ]);

      setBusinesses(businessesData);
      setAllSales(salesData);
      setAllProducts(productsData);
      setAllCustomers(customersData);
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Доступ запрещён</h2>
          <p className="text-slate-500">У вас нет прав для доступа к админ-панели</p>
        </div>
      </div>
    );
  }

  // Расчёты
  const totalRevenue = allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = allSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalBoxes = allSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const totalDebt = allCustomers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const activeBusinesses = businesses.filter(b => b.is_active !== false).length;

  // Топ бизнесов по продажам
  const businessStats = businesses.map(biz => {
    const bizSales = allSales.filter(s => s.business_id === biz.id);
    const revenue = bizSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const profit = bizSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    return { ...biz, revenue, profit, salesCount: bizSales.length };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Админ-панель"
        subtitle="Обзор всей платформы"
      />

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Всего бизнесов"
          value={businesses.length}
          subtitle={`${activeBusinesses} активных`}
          icon={Building2}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Общая выручка"
          value={totalRevenue.toLocaleString()}
          subtitle="сомони"
          icon={ShoppingCart}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Общая прибыль"
          value={totalProfit.toLocaleString()}
          subtitle="сомони"
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Коробок продано"
          value={totalBoxes.toLocaleString()}
          icon={Package}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Всего товаров"
          value={allProducts.length}
          icon={Package}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Всего клиентов"
          value={allCustomers.length}
          icon={Users}
          iconBg="bg-cyan-100"
          iconColor="text-cyan-600"
        />
        <StatCard
          title="Общий долг"
          value={totalDebt.toLocaleString()}
          subtitle="сомони"
          icon={CreditCard}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Top Businesses */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Топ бизнесов по выручке</h3>
          <Link to={createPageUrl('AdminBusinesses')}>
            <Button variant="outline" size="sm" className="gap-2">
              Все бизнесы
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Бизнес</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Продаж</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Выручка</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businessStats.slice(0, 10).map((biz, index) => (
                <tr key={biz.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{biz.name}</p>
                      <p className="text-xs text-slate-500">{biz.owner_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{biz.salesCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {biz.revenue.toLocaleString()} с.
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {biz.profit.toLocaleString()} с.
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      biz.is_active !== false 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {biz.is_active !== false ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}