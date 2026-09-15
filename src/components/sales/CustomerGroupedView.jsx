import React, { useMemo, useState } from 'react';
import { Users, ChevronRight, Phone, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Список клиентов, которые когда-либо делали покупки.
 * Показывает абсолютно каждого клиента за весь период времени.
 * Props:
 *  - sales: массив unified-продаж (обычные + реализация), без отменённых
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
          totalPairs: 0,
          totalItems: 0,
          totalProfit: 0,
          debtRemaining: 0,
          cashAmount: 0,
          debtAmount: 0,
          count: 0,
          hasDebt: false,
          hasCash: false,
          lastDate: null,
          firstDate: null,
        };
      }
      const g = map[key];
      g.sales.push(sale);
      g.totalAmount += sale.total_amount || 0;
      g.totalBoxes += sale.boxes_sold || 0;
      g.totalPairs += sale.pairs_sold || 0;
      g.totalItems += sale.items_sold || 0;
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
      if (d) {
        if (!g.lastDate || new Date(d) > new Date(g.lastDate)) g.lastDate = d;
        if (!g.firstDate || new Date(d) < new Date(g.firstDate)) g.firstDate = d;
      }
    });
    return Object.values(map);
  }, [sales, customers]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (b.debtRemaining > 0 && a.debtRemaining === 0) return 1;
      if (a.debtRemaining > 0 && b.debtRemaining === 0) return -1;
      return new Date(b.lastDate || 0) - new Date(a.lastDate || 0);
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
        <p>Нет покупок</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Заголовок + поиск */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="text-sm text-slate-500">
          Всего клиентов: <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span>
        </p>
        <div className="relative sm:max-w-sm sm:ml-auto w-full">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск клиента по имени или телефону..."
            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Список клиентов */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {filtered.map((g, idx) => {
          const displayName = g.customer?.name || g.customer_name || 'Без клиента';
          const showName = can('view_sale_customer') || !!g.customer_id;
          const qtyVal = displayUnit === 'pairs' ? g.totalPairs : displayUnit === 'items' ? g.totalItems : g.totalBoxes;
          const qtyLabel = displayUnit === 'pairs' ? 'пар' : displayUnit === 'items' ? 'шт' : 'кор.';
          return (
            <div
              key={g.key}
              onClick={() => onSelectCustomer && onSelectCustomer(g)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition ${idx !== filtered.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
            >
              {/* Аватар */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${g.hasDebt ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
              </div>

              {/* Имя + телефон */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                    {showName ? displayName : 'Клиент'}
                  </p>
                  {g.hasDebt && g.debtRemaining > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex-shrink-0">
                      Долг {g.debtRemaining.toLocaleString()} с.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  {can('view_sale_customer') && g.customer?.phone && (
                    <span className="flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3" /> {g.customer.phone}
                    </span>
                  )}
                  {g.lastDate && (
                    <span className="truncate">
                      Последняя: {format(parseISO(g.lastDate), 'dd MMM yyyy', { locale: ru })}
                    </span>
                  )}
                </div>
              </div>

              {/* Статистика */}
              <div className="hidden sm:flex items-center gap-5 text-center flex-shrink-0">
                <div>
                  <p className="text-[10px] text-slate-400">Покупок</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{g.count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{qtyLabel}</p>
                  <p className="text-sm font-bold text-indigo-600">{qtyVal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Сумма</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{g.totalAmount.toLocaleString()} с.</p>
                </div>
              </div>

              {/* Мобильная сумма */}
              <div className="sm:hidden text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{g.totalAmount.toLocaleString()} с.</p>
                <p className="text-[10px] text-slate-400">{g.count} пок. · {qtyVal} {qtyLabel}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
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