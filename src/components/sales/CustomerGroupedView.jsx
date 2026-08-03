import React, { useMemo, useState } from 'react';
import { Users, ChevronRight, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Группировка продаж по клиентам.
 * Props:
 *  - sales: отфильтрованный массив unified-продаж (обычные + реализация), без отменённых
 *  - customers, products, consignmentProducts, lang, can, displayUnit
 *  - onSelectCustomer(group) — открыть детальный диалог покупок клиента
 */
export default function CustomerGroupedView({
  sales,
  customers,
  products,
  consignmentProducts,
  lang = 'ru',
  can,
  displayUnit = 'boxes',
  onSelectCustomer,
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const map = {};
    sales.forEach(sale => {
      const cid = sale.customer_id || '';
      const cname = (sale.customer_name && sale.customer_name !== 'Неизвестный') ? sale.customer_name : '';
      const key = cid || (cname ? `name:${cname}` : '__no_customer__');
      if (!map[key]) {
        map[key] = {
          key,
          customer_id: cid,
          customer_name: cname,
          customer: cid ? customers.find(c => c.id === cid) : null,
          sales: [],
          totalAmount: 0,
          totalBoxes: 0,
          totalProfit: 0,
          debtRemaining: 0,
          cashAmount: 0,
          debtAmount: 0,
          count: 0,
          hasDebt: false,
          hasCash: false,
          lastDate: null,
        };
      }
      const g = map[key];
      g.sales.push(sale);
      g.totalAmount += sale.total_amount || 0;
      g.totalBoxes += sale.boxes_sold || 0;
      g.totalProfit += sale.profit || 0;
      g.count += 1;
      if (sale.is_debt) {
        g.hasDebt = true;
        g.debtAmount += sale.total_amount || 0;
        g.debtRemaining += (sale.total_amount || 0) - (sale.partial_payment || 0);
      } else {
        g.hasCash = true;
        g.cashAmount += sale.total_amount || 0;
      }
      const d = sale.sale_date || sale.created_date;
      if (d && (!g.lastDate || new Date(d) > new Date(g.lastDate))) g.lastDate = d;
    });
    return Object.values(map);
  }, [sales, customers]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (b.debtRemaining > 0 && a.debtRemaining === 0) return 1;
      if (a.debtRemaining > 0 && b.debtRemaining === 0) return -1;
      return b.totalAmount - a.totalAmount;
    });
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sortedGroups;
    return sortedGroups.filter(g => {
      const name = (g.customer?.name || g.customer_name || '').toLowerCase();
      const phone = (g.customer?.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [sortedGroups, query]);

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p>Нет продаж за выбранный период</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Поиск по клиенту */}
      <div className="relative max-w-sm">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск клиента..."
          className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(g => {
          const displayName = g.customer?.name || g.customer_name || 'Без клиента';
          const showName = can('view_sale_customer') || !!g.customer_id;
          return (
            <div
              key={g.key}
              onClick={() => onSelectCustomer && onSelectCustomer(g)}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${g.hasDebt ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                    <span className="text-white font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                      {showName ? displayName : 'Клиент'}
                    </p>
                    {can('view_sale_customer') && g.customer?.phone && (
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {g.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-400">Покупок</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{g.count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Коробок</p>
                  <p className="text-sm font-bold text-indigo-600">{g.totalBoxes}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Сумма</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{g.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {g.hasCash && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    Наличные: {g.cashAmount.toLocaleString()} с.
                  </span>
                )}
                {g.hasDebt && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    В долг: {g.debtAmount.toLocaleString()} с.
                  </span>
                )}
                {g.hasDebt && g.debtRemaining > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                    Долг: {g.debtRemaining.toLocaleString()} с.
                  </span>
                )}
              </div>

              {g.lastDate && (
                <p className="text-[11px] text-slate-400 mt-2">
                  Последняя покупка: {format(parseISO(g.lastDate), 'dd MMM yyyy, HH:mm', { locale: ru })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && query && (
        <div className="text-center py-8 text-slate-400 text-sm">Клиент не найден</div>
      )}
    </div>
  );
}