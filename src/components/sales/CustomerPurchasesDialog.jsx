import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, ChevronRight, X } from 'lucide-react';
import ProductPhoto from '@/components/products/ProductPhoto';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Диалог со всеми покупками клиента за выбранный период.
 * Props:
 *  - group: объект группы из CustomerGroupedView (содержит sales, customer, ...)
 *  - products, consignmentProducts, can, displayUnit, lang
 *  - onClose()
 *  - onSelectSale(sale) — перейти к деталям конкретной продажи
 */
export default function CustomerPurchasesDialog({
  group,
  products,
  consignmentProducts,
  can,
  displayUnit = 'boxes',
  lang = 'ru',
  onClose,
  onSelectSale,
}) {
  if (!group) return null;

  const displayName = group.customer?.name || group.customer_name || 'Без клиента';
  const showName = can('view_sale_customer') || !!group.customer_id;

  const productName = (sale) => {
    const p = sale._isConsignment
      ? consignmentProducts.find(p => p.id === sale.product_id)
      : products.find(p => p.id === sale.product_id);
    return p ? `${p.brand || ''} ${p.model || ''}`.trim() : '—';
  };
  const productPhoto = (sale) => {
    const p = sale._isConsignment
      ? consignmentProducts.find(p => p.id === sale.product_id)
      : products.find(p => p.id === sale.product_id);
    return p?.photo_url || null;
  };

  const productTypeOf = (sale) => {
    const p = sale._isConsignment
      ? consignmentProducts.find(p => p.id === sale.product_id)
      : products.find(p => p.id === sale.product_id);
    return p?.product_type || '';
  };
  const productMeta = (sale) => {
    const p = sale._isConsignment
      ? consignmentProducts.find(p => p.id === sale.product_id)
      : products.find(p => p.id === sale.product_id);
    if (!p) return '';
    return [p.color, p.product_type, p.size_from && p.size_to ? `${p.size_from}–${p.size_to}` : null]
      .filter(Boolean).join(' · ');
  };
  const qty = (sale) => displayUnit === 'pairs' ? sale.pairs_sold : displayUnit === 'items' ? sale.items_sold : sale.boxes_sold;

  const sortedSales = [...group.sales].sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date));

  return (
    <Dialog open={!!group} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${group.hasDebt ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
              <span className="text-white font-bold">{(displayName).charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate">{showName ? displayName : 'Клиент'}</p>
              <p className="text-xs font-normal text-slate-400">
                {group.count} покупок · {group.totalBoxes} кор. · {group.totalAmount.toLocaleString()} с.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Сводка */}
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800 text-center">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
            <p className="text-[10px] text-slate-400">Наличные</p>
            <p className="text-sm font-bold text-emerald-600">{group.cashAmount.toLocaleString()} с.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
            <p className="text-[10px] text-slate-400">В долг</p>
            <p className="text-sm font-bold text-orange-600">{group.debtAmount.toLocaleString()} с.</p>
          </div>
          {group.hasDebt && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Непогашенный долг</p>
              <p className="text-sm font-bold text-red-600">{group.debtRemaining.toLocaleString()} с.</p>
            </div>
          )}
          {can('view_sale_profit') && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Прибыль</p>
              <p className="text-sm font-bold text-emerald-600">{group.totalProfit.toLocaleString()} с.</p>
            </div>
          )}
        </div>

        {/* Список покупок */}
        <div className="flex-1 overflow-y-auto custom-scroll px-3 py-2">
          {sortedSales.map(sale => {
            const photo = productPhoto(sale);
            return (
              <div
                key={sale.id}
                onClick={() => onSelectSale && onSelectSale(sale)}
                className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${sale.is_cancelled ? 'opacity-50' : ''}`}
              >
                <ProductPhoto
                  photoUrl={photo}
                  productType={productTypeOf(sale)}
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                  textClassName="text-[8px]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{productName(sale)}</p>
                  <p className="text-xs text-slate-400 truncate">{productMeta(sale)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(parseISO(sale.sale_date || sale.created_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{sale.total_amount?.toLocaleString()} с.</p>
                  <p className="text-xs text-slate-400">{qty(sale)} {displayUnit === 'pairs' ? 'пар' : displayUnit === 'items' ? 'шт' : 'кор.'}</p>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${sale.is_debt ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'}`}>
                    {sale.is_debt ? 'В долг' : 'Наличные'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            );
          })}
          {sortedSales.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">Нет покупок за период</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}