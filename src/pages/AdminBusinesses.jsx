import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/filters/SearchInput';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Ban,
  CheckCircle,
  Trash2,
  Eye,
  Package,
  ShoppingCart,
  Users
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SubscriptionStatusBadge from '@/components/subscription/SubscriptionStatusBadge';
import BusinessSubscriptionActions from '@/components/subscription/BusinessSubscriptionActions';
import PlanEditorCard from '@/components/subscription/PlanEditorCard';
import FreeAccessPanel from '@/components/subscription/FreeAccessPanel';

const ADMIN_EMAIL = 'siddikme2007@gmail.com';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

      const [businessesData, salesData, productsData, warehousesData, customersData] = await Promise.all([
        base44.entities.Business.list(),
        base44.entities.Sale.list(),
        base44.entities.Product.list(),
        base44.entities.Warehouse.list(),
        base44.entities.Customer.list()
      ]);

      setBusinesses(businessesData);
      setAllSales(salesData);
      setAllProducts(productsData);
      setAllWarehouses(warehousesData);
      setAllCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновление списка бизнесов после изменения подписки
  const reloadBusinesses = async () => {
    const data = await base44.entities.Business.list();
    setBusinesses(data);
    if (selectedBusiness) {
      const fresh = data.find(b => b.id === selectedBusiness.id);
      if (fresh) setSelectedBusiness(fresh);
    }
  };

  const handleToggleBlock = async (business) => {
    const newStatus = business.is_active === false ? true : false;
    await base44.entities.Business.update(business.id, { is_active: !newStatus });
    await loadData();
  };

  const handleDelete = async (businessId) => {
    if (confirm('Вы уверены? Это действие удалит бизнес и все связанные данные!')) {
      await base44.entities.Business.delete(businessId);
      await loadData();
    }
  };

  const getBusinessStats = (businessId) => {
    const sales = allSales.filter(s => s.business_id === businessId);
    const products = allProducts.filter(p => p.business_id === businessId);
    const warehouses = allWarehouses.filter(w => w.business_id === businessId);
    const customers = allCustomers.filter(c => c.business_id === businessId);
    
    const revenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const profit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const boxes = sales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
    const stock = products.reduce((sum, p) => sum + (p.boxes_in_stock || 0), 0);
    const debt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);

    return { 
      salesCount: sales.length, 
      productsCount: products.length,
      warehousesCount: warehouses.length,
      customersCount: customers.length,
      revenue, 
      profit, 
      boxes,
      stock,
      debt
    };
  };

  const filteredBusinesses = businesses.filter(biz =>
    biz.name?.toLowerCase().includes(search.toLowerCase()) ||
    biz.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Управление бизнесами"
        subtitle={`${businesses.length} зарегистрированных бизнесов`}
      />

      <PlanEditorCard />

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Поиск по названию или email..."
          className="max-w-md"
        />
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Бизнес</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Товаров</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Складов</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Продаж</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Выручка</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Подписка</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Статус</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBusinesses.map(biz => {
                const stats = getBusinessStats(biz.id);
                
                return (
                  <tr key={biz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{biz.name}</p>
                          <p className="text-xs text-slate-500">{biz.owner_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600">{stats.productsCount}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{stats.warehousesCount}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{stats.salesCount}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {stats.revenue.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-emerald-600">
                      {stats.profit.toLocaleString()} с.
                    </td>
                    <td className="px-4 py-4 text-center">
                      <SubscriptionStatusBadge business={biz} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        biz.is_active !== false 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {biz.is_active !== false ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedBusiness(biz);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleToggleBlock(biz)}
                        >
                          {biz.is_active !== false ? (
                            <Ban className="w-4 h-4 text-orange-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(biz.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Business Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали бизнеса</DialogTitle>
          </DialogHeader>
          
          {selectedBusiness && (() => {
            const stats = getBusinessStats(selectedBusiness.id);
            
            return (
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedBusiness.name}</h3>
                    <p className="text-slate-500">{selectedBusiness.owner_email}</p>
                    {selectedBusiness.phone && (
                      <p className="text-sm text-slate-500">{selectedBusiness.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <SubscriptionStatusBadge business={selectedBusiness} />
                  <BusinessSubscriptionActions business={selectedBusiness} onUpdated={reloadBusinesses} />
                </div>

                <FreeAccessPanel business={selectedBusiness} onChanged={reloadBusinesses} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Package className="w-5 h-5 text-indigo-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.productsCount}</p>
                    <p className="text-sm text-slate-500">Товаров</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <ShoppingCart className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.salesCount}</p>
                    <p className="text-sm text-slate-500">Продаж</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Users className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.customersCount}</p>
                    <p className="text-sm text-slate-500">Клиентов</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Building2 className="w-5 h-5 text-cyan-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.warehousesCount}</p>
                    <p className="text-sm text-slate-500">Складов</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-500">Выручка</p>
                    <p className="text-xl font-bold text-slate-900">{stats.revenue.toLocaleString()} с.</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Прибыль</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.profit.toLocaleString()} с.</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Долги клиентов</p>
                    <p className="text-xl font-bold text-orange-600">{stats.debt.toLocaleString()} с.</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Продано коробок</p>
                    <p className="text-xl font-bold text-slate-900">{stats.boxes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">На складе</p>
                    <p className="text-xl font-bold text-slate-900">{stats.stock} коробок</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => handleToggleBlock(selectedBusiness)}
                    className={selectedBusiness.is_active !== false ? 'text-orange-600' : 'text-emerald-600'}
                  >
                    {selectedBusiness.is_active !== false ? (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Заблокировать
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Разблокировать
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleDelete(selectedBusiness.id);
                      setDetailsOpen(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}