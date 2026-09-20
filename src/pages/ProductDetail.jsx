import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, Box, Layers, Hash, TrendingUp, Calendar, User, History, Plus, Edit2, Trash2 } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

export default function ProductDetail() {
  const navigate = useNavigate();
  const { can } = useEmployeeAccess();
  const [product, setProduct] = useState(null);
  const [sales, setSales] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [addedByEmployeeFallback, setAddedByEmployeeFallback] = useState(null);
  const [addedByFallback, setAddedByFallback] = useState(null);
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

      if (prod.business_id) {
        const [customersData, employeesData, logsData] = await Promise.all([
          base44.entities.Customer.filter({ business_id: prod.business_id }).catch(() => []),
          base44.entities.Employee.filter({ business_id: prod.business_id }).catch(() => []),
          base44.entities.ActivityLog.filter({ entity_id: productId, entity_type: 'Product' }).catch(() => []),
        ]);
        setCustomers(customersData);
        setEmployees(employeesData);
        setActivityLogs(logsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

        // Если нет лога создания — ищем сотрудника по created_by_id (через User email)
        const hasCreateLog = logsData.some(l => l.action_type === 'create');
        if (!hasCreateLog && prod.created_by_id) {
          try {
            const userData = await base44.entities.User.filter({ id: prod.created_by_id }).catch(() => []);
            const userEmail = userData?.[0]?.email || '';
            if (userEmail) {
              const emp = employeesData.find(e => e.user_email === userEmail);
              if (emp) setAddedByEmployeeFallback(emp);
              else setAddedByFallback({ name: userData?.[0]?.full_name || userEmail, email: userEmail });
            }
          } catch (_) {}
        }
      }

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
  const totalStockValue = (product.boxes_in_stock || 0) * (product.sale_price || 0);
  const potentialProfit = (product.boxes_in_stock || 0) * ((product.sale_price || 0) - (product.purchase_price || 0));
  
  const totalSold = sales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

  const getEmployeeByEmail = (email) => employees.find(e => e.user_email === email);
  const getEmployeeByName = (name) => employees.find(e => e.name === name);
  const findEmployeeByLog = (log) => {
    if (!log) return null;
    if (log.user_email) {
      const byEmail = getEmployeeByEmail(log.user_email);
      if (byEmail) return byEmail;
    }
    if (log.user_name) {
      const byName = getEmployeeByName(log.user_name);
      if (byName) return byName;
    }
    return null;
  };

  // Who added the product — first 'create' log entry, or fallback via created_by_id
  const createLog = activityLogs.find(l => l.action_type === 'create');
  const addedByEmployee = findEmployeeByLog(createLog) || addedByEmployeeFallback || null;
  const addedByName = createLog?.user_name || addedByFallback?.name || (addedByEmployee?.name) || '—';
  const addedByEmail = createLog?.user_email || addedByFallback?.email || (addedByEmployee?.user_email) || '';

  const handleBack = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from) {
      navigate(from);
    } else {
      navigate(-1);
    }
  };

  const actionIcon = (type) => type === 'create' ? <Plus className="w-3.5 h-3.5 text-emerald-600" /> : type === 'update' ? <Edit2 className="w-3.5 h-3.5 text-blue-600" /> : <Trash2 className="w-3.5 h-3.5 text-red-600" />;
  const actionLabel = (type) => type === 'create' ? 'Добавил' : type === 'update' ? 'Изменил' : 'Удалил';
  const actionColor = (type) => type === 'create' ? 'bg-emerald-100 text-emerald-700' : type === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={handleBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Button>

      {/* Product Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo */}
          <div className="w-full md:w-64 h-64 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
            <ProductPhoto
              photoUrl={product.photo_url}
              brand={product.brand}
              className="w-full h-full"
              textClassName="text-2xl"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{product.brand}</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">{product.model}</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                {product.product_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-slate-500">Цвет</p>
                <p className="font-medium text-slate-900 dark:text-white">{product.color}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Размеры</p>
                <p className="font-medium text-slate-900 dark:text-white">{product.size_from} - {product.size_to}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Пар в коробке</p>
                <p className="font-medium text-slate-900 dark:text-white">{product.pairs_per_box}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Склад</p>
                <p className="font-medium text-slate-900 dark:text-white">{warehouse?.name || 'Не указан'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Дата добавления</p>
                <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {product.created_date ? format(parseISO(product.created_date), 'dd MMM yyyy, HH:mm', { locale: ru }) : '—'}
                </div>
              </div>
            </div>

            {/* Who added this product */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-4 mb-4">
              <EmployeeAvatar
                employee={addedByEmployee}
                name={addedByName}
                sizeClass="w-14 h-14 rounded-2xl text-lg"
              />
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Кто добавил товар в систему</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white truncate">{addedByName}</p>
                {addedByEmail && <p className="text-xs text-slate-400 truncate">{addedByEmail}</p>}
                {addedByEmployee?.is_admin && <span className="text-[10px] font-bold text-indigo-600">Админ</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <p className="text-sm text-slate-500">Цена закупки</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{can('view_products_cost') ? `${product.purchase_price?.toLocaleString()} с.` : '•••••'}</p>
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <Box className="w-5 h-5 text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">На складе</p>
          <p className="text-2xl font-bold text-indigo-600">{can('view_warehouse_quantities') ? `${product.boxes_in_stock || 0} коробок` : '•••••'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <Layers className="w-5 h-5 text-purple-600 mb-2" />
          <p className="text-sm text-slate-500">Пар</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{can('view_warehouse_quantities') ? totalPairs : '•••••'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <Package className="w-5 h-5 text-cyan-600 mb-2" />
          <p className="text-sm text-slate-500">Стоимость склада</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{can('view_warehouse_value') ? `${totalStockValue.toLocaleString()} с.` : '•••••'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500">Потенциальная прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{can('view_warehouse_cost') ? `${potentialProfit.toLocaleString()} с.` : '•••••'}</p>
        </div>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-500">Всего продаж</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sales.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-500">Продано коробок</p>
          <p className="text-2xl font-bold text-blue-600">{totalSold}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-500">Прибыль</p>
          <p className="text-2xl font-bold text-emerald-600">{can('view_warehouse_cost') ? `${totalProfit.toLocaleString()} с.` : '•••••'}</p>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">История продаж</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Дата</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Коробок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-300">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-300">Прибыль</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">Тип</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Продавец</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map(sale => {
                const sellerEmp = getEmployeeByEmail(sale.seller_email) || getEmployeeByName(sale.seller_name);
                return (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                    {sale.boxes_sold}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {sale.total_amount?.toLocaleString()} с.
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {can('view_warehouse_cost') ? `+${sale.profit?.toLocaleString()} с.` : '•••••'}
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
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {sale.customer_id ? (customers.find(c => c.id === sale.customer_id)?.name || sale.customer_name || '—') : (sale.customer_name && sale.customer_name !== 'Неизвестный' ? sale.customer_name : '—')}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {(sale.seller_name || sale.seller_email) && (
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar employee={sellerEmp} name={sale.seller_name || sale.seller_email} sizeClass="!w-7 !h-7 !text-xs" />
                        <div className="min-w-0">
                          <p className="text-slate-900 dark:text-white truncate">{sale.seller_name || sale.seller_email}</p>
                          {sellerEmp?.is_admin && <span className="text-[10px] font-bold text-indigo-600">Админ</span>}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Этот товар ещё не продавался
          </div>
        )}
      </div>

      {/* История изменений */}
      {activityLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              История изменений
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activityLogs.map(log => {
              const logEmp = findEmployeeByLog(log);
              const changes = log.entity_data?.changes;
              const hasChanges = log.action_type === 'update' && changes && Object.keys(changes).length > 0;
              return (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <EmployeeAvatar employee={logEmp} name={log.user_name || log.user_email} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${actionColor(log.action_type)}`}>
                        {actionIcon(log.action_type)}
                        {actionLabel(log.action_type)}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{log.user_name || log.user_email}</span>
                    </div>
                    {hasChanges ? (
                      <div className="mt-2 space-y-1">
                        {Object.entries(changes).map(([field, c]) => (
                          <div key={field} className="text-xs flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{c.label}:</span>
                            {field === 'photo_url' ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Фото профиля обновлено</span>
                            ) : (
                              <>
                                <span className="text-slate-400 line-through truncate max-w-[8rem]">{String(c.from ?? '—')}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[8rem]">{String(c.to ?? '—')}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.description || '—'}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {format(parseISO(log.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}