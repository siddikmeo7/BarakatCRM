import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, ChevronDown, ChevronUp, Phone, TrendingUp, AlertCircle, ExternalLink, Search } from 'lucide-react';

// Палитра сегментов в языке «Тёмного терминала»
const SEG_COLORS = ['#f5b23e', '#6ee7b7', '#7c8594', '#4b5563', '#f87171'];

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
      { name: 'VIP клиенты', desc: '>100k с.', value: vip.length, customers: vip, color: SEG_COLORS[0] },
      { name: 'Постоянные', desc: '30-100k с.', value: regular.length, customers: regular, color: SEG_COLORS[1] },
      { name: 'Случайные', desc: '<30k с.', value: occasional.length, customers: occasional, color: SEG_COLORS[2] },
      { name: 'Неактивные', desc: 'Нет покупок', value: inactive.length, customers: inactive, color: SEG_COLORS[3] },
      { name: 'Риск (долг)', desc: 'Долг >50k', value: riskDebtors.length, customers: riskDebtors, color: SEG_COLORS[4] }
    ].filter(s => s.value > 0);
  }, [customers, sales]);

  const [segSearch, setSegSearch] = useState('');
  const INITIAL_VISIBLE = 5;

  const toggleSeg = (name) => {
    setExpandedSeg(prev => prev === name ? null : name);
    setShowAll(prev => ({ ...prev, [name]: false }));
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="tk-sp2" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users className="w-3.5 h-3.5" style={{ color: '#f5b23e' }} />
          Сегментация клиентов
        </h3>
      </div>

      {segments.length === 0 ? (
        <p className="tk-cap">Нет клиентов для сегментации</p>
      ) : (
        <>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#12161d', border: '1px solid #232a35', borderRadius: '3px', fontSize: '12px', color: '#f2f4f8' }}
                  itemStyle={{ color: '#f2f4f8' }}
                  formatter={(v, name) => [`${v} клиентов`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="tk-mono" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map((seg) => {
              const isOpen = expandedSeg === seg.name;
              const isShowingAll = showAll[seg.name];
              const visibleCustomers = isShowingAll ? seg.customers : seg.customers.slice(0, INITIAL_VISIBLE);
              const hasMore = seg.customers.length > INITIAL_VISIBLE;

              return (
                <div key={seg.name} className="border border-[#232a35]" style={{ overflow: 'hidden' }}>
                  {/* Header row — clickable to expand */}
                  <button
                    onClick={() => toggleSeg(seg.name)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#171c25]"
                    style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
                  >
                    <span style={{ width: 10, height: 10, background: seg.color, flexShrink: 0 }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold" style={{ color: '#f2f4f8' }}>{seg.name}</span>
                      <span className="block text-[11px]" style={{ color: '#7c8594' }}>{seg.desc}</span>
                    </span>
                    <span className="text-xs font-bold" style={{ color: '#d7dbe2' }}>{seg.value} чел.</span>
                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#7c8594' }} />
                      : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#7c8594' }} />}
                  </button>

                  {/* Expanded customer list */}
                  {isOpen && (
                    <div className="border-t border-[#232a35]" style={{ background: '#0f131a' }}>
                      {seg.customers.length === 0 ? (
                        <p className="tk-cap text-center py-3">Нет клиентов</p>
                      ) : (
                        <>
                          {/* Поиск внутри сегмента */}
                          {seg.customers.length > 3 && (
                            <div className="relative px-3 py-2 border-b border-[#1b212a]">
                              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#7c8594' }} />
                              <input
                                value={segSearch}
                                onChange={e => setSegSearch(e.target.value)}
                                placeholder="Поиск клиента..."
                                className="tk-input w-full pl-6"
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          )}
                          <div className="max-h-64 overflow-y-auto divide-y divide-[#1b212a]">
                            {seg.customers
                              .filter(c => !segSearch || c.name?.toLowerCase().includes(segSearch.toLowerCase()) || c.phone?.includes(segSearch))
                              .map(c => (
                                <div
                                  key={c.id}
                                  onClick={() => window.location.href = '/Customers'}
                                  className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-[#171c25]"
                                >
                                  <span
                                    className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                    style={{ backgroundColor: seg.color, color: '#0b0e13', borderRadius: 3 }}
                                  >
                                    {c.name?.charAt(0)?.toUpperCase()}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-xs font-bold truncate" style={{ color: '#d7dbe2' }}>{c.name}</span>
                                    {c.phone && (
                                      <span className="text-[11px] flex items-center gap-1" style={{ color: '#7c8594' }}>
                                        <Phone className="w-2.5 h-2.5" />{c.phone}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-right flex-shrink-0">
                                    {c.totalSpent > 0 && (
                                      <span className="block text-[11px] font-bold flex items-center gap-1" style={{ color: '#6ee7b7' }}>
                                        <TrendingUp className="w-3 h-3" />{c.totalSpent.toLocaleString()} с.
                                      </span>
                                    )}
                                    {c.totalDebt > 0 && (
                                      <span className="block text-[11px] flex items-center gap-1" style={{ color: '#f87171' }}>
                                        <AlertCircle className="w-3 h-3" />долг: {c.totalDebt.toLocaleString()} с.
                                      </span>
                                    )}
                                    {c.totalPurchases > 0 && (
                                      <span className="block text-[11px]" style={{ color: '#7c8594' }}>{c.totalPurchases} покупок</span>
                                    )}
                                  </span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: '#4b5563' }} />
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}