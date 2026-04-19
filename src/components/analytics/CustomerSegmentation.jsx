import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, ChevronDown, ChevronUp, Phone, TrendingUp, AlertCircle, ExternalLink, Search } from 'lucide-react';

export default function CustomerSegmentation({ customers, sales }) {
  const [expandedSeg, setExpandedSeg] = useState(null); // which segment is expanded
  const [showAll, setShowAll] = useState({}); // { segName: true } if showing all

  const segments = useMemo(() => {
    if (!customers.length) return [];

    const customerStats = {};
    customers.forEach(c => {
      customerStats[c.id] = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalPurchases: 0,
        totalSpent: 0,
        totalDebt: c.total_debt || 0,
        isDebtor: (c.total_debt || 0) > 0
      };
    });

    sales.forEach(s => {
      if (customerStats[s.customer_id]) {
        customerStats[s.customer_id].totalPurchases += 1;
        customerStats[s.customer_id].totalSpent += s.total_amount || 0;
      }
    });

    const vip = Object.values(customerStats).filter(c => c.totalSpent > 100000);
    const regular = Object.values(customerStats).filter(c => c.totalSpent >= 30000 && c.totalSpent <= 100000);
    const occasional = Object.values(customerStats).filter(c => c.totalSpent > 0 && c.totalSpent < 30000);
    const inactive = Object.values(customerStats).filter(c => c.totalSpent === 0);
    const riskDebtors = Object.values(customerStats).filter(c => c.isDebtor && c.totalDebt > 50000);

    return [
      { name: 'VIP клиенты', desc: '>100k с.', value: vip.length, customers: vip, color: '#8b5cf6', icon: '👑' },
      { name: 'Постоянные', desc: '30-100k с.', value: regular.length, customers: regular, color: '#3b82f6', icon: '⭐' },
      { name: 'Случайные', desc: '<30k с.', value: occasional.length, customers: occasional, color: '#10b981', icon: '🛍' },
      { name: 'Неактивные', desc: 'Нет покупок', value: inactive.length, customers: inactive, color: '#9ca3af', icon: '😴' },
      { name: 'Риск (долг)', desc: 'Долг >50k', value: riskDebtors.length, customers: riskDebtors, color: '#ef4444', icon: '⚠️' }
    ].filter(s => s.value > 0);
  }, [customers, sales]);

  const [segSearch, setSegSearch] = useState('');
  const INITIAL_VISIBLE = 5;

  const toggleSeg = (name) => {
    setExpandedSeg(prev => prev === name ? null : name);
    setShowAll(prev => ({ ...prev, [name]: false }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-600" />
        <h4 className="font-semibold text-slate-900">Сегментация клиентов</h4>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${value}`}
                outerRadius={90}
                dataKey="value"
              >
                {segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [`${v} клиентов`, name]} />
              <Legend formatter={(value) => value} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Segments list */}
        <div className="space-y-2">
          {segments.map((seg) => {
            const isOpen = expandedSeg === seg.name;
            const isShowingAll = showAll[seg.name];
            const visibleCustomers = isShowingAll ? seg.customers : seg.customers.slice(0, INITIAL_VISIBLE);
            const hasMore = seg.customers.length > INITIAL_VISIBLE;

            return (
              <div key={seg.name} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Header row — clickable to expand */}
                <button
                  onClick={() => toggleSeg(seg.name)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-base">{seg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{seg.name}</p>
                    <p className="text-xs text-slate-400">{seg.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 mr-2">{seg.value} чел.</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {/* Expanded customer list */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50">
                    {seg.customers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Нет клиентов</p>
                    ) : (
                      <div>
                        {/* Поиск внутри сегмента */}
                        {isOpen && seg.customers.length > 3 && (
                          <div className="px-4 py-2 border-b border-slate-100 relative">
                            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input
                              value={segSearch}
                              onChange={e => setSegSearch(e.target.value)}
                              placeholder="Поиск клиента..."
                              className="w-full pl-7 pr-3 h-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {seg.customers
                          .filter(c => !segSearch || c.name?.toLowerCase().includes(segSearch.toLowerCase()) || c.phone?.includes(segSearch))
                          .map(c => (
                          <div key={c.id}
                            onClick={() => window.location.href = '/Customers'}
                            className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-indigo-50 cursor-pointer group transition-colors">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                              style={{ backgroundColor: seg.color }}>
                              {c.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">{c.name}</p>
                              {c.phone && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />{c.phone}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {c.totalSpent > 0 && (
                                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-emerald-500" />{c.totalSpent.toLocaleString()} с.
                                </p>
                              )}
                              {c.totalDebt > 0 && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />долг: {c.totalDebt.toLocaleString()} с.
                                </p>
                              )}
                              {c.totalPurchases > 0 && (
                                <p className="text-xs text-slate-400">{c.totalPurchases} покупок</p>
                              )}
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 flex-shrink-0" />
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}