import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Phone, MapPin, Mail, ShoppingBag, UserPlus, X, MessageCircle, Send, Package } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import { resolveSaleProduct } from '@/lib/saleProductResolver';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Dialog showing a customer's full profile: contacts, who added them,
 * and the employees who sold to them — each with an avatar.
 *
 * Props:
 *  - customer: customer record (or null)
 *  - sales: all sales (unified, with seller_email/seller_name)
 *  - employees: employee list (for avatar lookup)
 *  - products, consignmentProducts: for product names in purchase history
 *  - onClose: () => void
 */
export default function CustomerProfileDialog({ customer, sales, employees, products, consignmentProducts, deletedProductsMap = {}, onClose }) {
  const findEmp = (email, name) =>
    employees.find(e => e.user_email === email) ||
    employees.find(e => e.name === name) ||
    null;

  const addedByEmployee = useMemo(() => {
    if (!customer) return null;
    return employees.find(e => e.id === customer.added_by_employee_id) ||
      employees.find(e => e.user_email === customer.added_by_email) ||
      (customer.added_by_employee_name ? { name: customer.added_by_employee_name, avatar_url: null, is_admin: false } : null);
  }, [customer, employees]);

  const customerSales = useMemo(() => {
    if (!customer) return [];
    return (sales || [])
      .filter(s => s.customer_id === customer.id || s.customer_name === customer.name)
      .filter(s => !s.is_cancelled)
      .sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date));
  }, [customer, sales]);

  // Unique sellers who sold to this customer
  const sellers = useMemo(() => {
    const map = new Map();
    customerSales.forEach(s => {
      const key = s.seller_email || s.seller_name || '';
      if (!key) return;
      if (!map.has(key)) {
        const emp = findEmp(s.seller_email, s.seller_name);
        map.set(key, { emp, name: s.seller_name || s.seller_email, email: s.seller_email, count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values());
  }, [customerSales, employees]);

  const totalSpent = customerSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalBoxes = customerSales.reduce((sum, s) => sum + (s.boxes_sold || 0), 0);

  const prodName = (sale) => {
    const p = resolveSaleProduct(sale, products, consignmentProducts, deletedProductsMap);
    if (!p) return 'Товар удалён';
    return `${p.brand || ''} ${p.model || ''}`.trim() || 'Товар удалён';
  };

  const prodPhoto = (sale) => resolveSaleProduct(sale, products, consignmentProducts, deletedProductsMap)?.photo_url || null;

  const brandOfSale = (sale) => resolveSaleProduct(sale, products, consignmentProducts, deletedProductsMap)?.brand || '';

  const prodMeta = (sale) => {
    const p = resolveSaleProduct(sale, products, consignmentProducts, deletedProductsMap);
    if (!p) return '';
    return [p.color, p.product_type, p.size_from && p.size_to ? `${p.size_from}–${p.size_to}` : null]
      .filter(Boolean).join(' · ');
  };

  if (!customer) return null;

  return (
    <Dialog open={!!customer} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Профиль клиента</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identity */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-bold text-xl">{customer.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{customer.name}</p>
              <p className="text-xs text-slate-500">{customerSales.length} покупок • {totalBoxes} кор.</p>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-700 dark:text-slate-200">{customer.phone || '—'}</span>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="ml-auto text-xs text-indigo-600 hover:underline">Позвонить</a>
              )}
            </div>
            {customer.whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">{customer.whatsapp}</span>
              </div>
            )}
            {customer.telegram && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">{customer.telegram}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 truncate">{customer.email}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-200">{customer.address || '—'}</span>
            </div>
          </div>

          {/* Who added the customer */}
          <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Кто добавил клиента
            </p>
            {addedByEmployee ? (
              <div className="flex items-center gap-2.5">
                <EmployeeAvatar employee={addedByEmployee.emp || addedByEmployee} name={addedByEmployee.name || addedByEmployee.emp?.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{addedByEmployee.name || addedByEmployee.emp?.name}</p>
                  <p className="text-xs text-slate-400">
                    {customer.added_by_role === 'owner' ? 'Владелец' : customer.added_by_role === 'admin' ? 'Админ' : 'Сотрудник'}
                    {customer.created_date ? ` · ${format(parseISO(customer.created_date), 'dd MMM yyyy', { locale: ru })}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Неизвестно</p>
            )}
          </div>

          {/* Sellers who sold to this customer */}
          {sellers.length > 0 && (
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Продавали этому клиенту ({sellers.length})
              </p>
              <div className="space-y-2.5">
                {sellers.map(s => (
                  <div key={s.email || s.name} className="flex items-center gap-2.5">
                    <EmployeeAvatar employee={s.emp} name={s.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.count} продаж</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase history */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> История покупок ({customerSales.length})
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scroll pr-1">
              {customerSales.map(s => {
                const photo = prodPhoto(s);
                const meta = prodMeta(s);
                return (
                  <div key={s.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <ProductPhoto
                      photoUrl={photo}
                      brand={brandOfSale(s)}
                      className="w-9 h-9 rounded-lg flex-shrink-0"
                      placeholderClassName="bg-slate-200 dark:bg-slate-700"
                      textClassName="text-[8px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{prodName(s)}</p>
                      {meta && <p className="text-[11px] text-slate-400 truncate">{meta}</p>}
                      <p className="text-xs text-slate-400">
                        {format(parseISO(s.sale_date || s.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })} · {s.boxes_sold || 0} кор. · {s.pairs_sold || 0} пар
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-semibold block ${s.is_debt ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {s.total_amount?.toLocaleString()} с.
                      </span>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${s.is_debt ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'}`}>
                        {s.is_debt ? 'В долг' : 'Наличные'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {customerSales.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Покупок нет</p>}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-sm">
              <span className="text-slate-500">Всего потрачено:</span>
              <span className="font-bold text-slate-900 dark:text-white">{totalSpent.toLocaleString()} с.</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}