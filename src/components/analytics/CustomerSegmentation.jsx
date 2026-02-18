import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CustomerSegmentation({ customers, sales }) {
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

    // Segmentation logic
    const vip = Object.values(customerStats).filter(c => c.totalSpent > 100000);
    const regular = Object.values(customerStats).filter(c => c.totalSpent >= 30000 && c.totalSpent <= 100000);
    const occasional = Object.values(customerStats).filter(c => c.totalSpent > 0 && c.totalSpent < 30000);
    const inactive = Object.values(customerStats).filter(c => c.totalSpent === 0);
    const riskDebtors = Object.values(customerStats).filter(c => c.isDebtor && c.totalDebt > 50000);

    return [
      { name: 'VIP клиенты (>100k с.)', value: vip.length, customers: vip, color: '#8b5cf6' },
      { name: 'Постоянные (30-100k с.)', value: regular.length, customers: regular, color: '#3b82f6' },
      { name: 'Случайные (<30k с.)', value: occasional.length, customers: occasional, color: '#10b981' },
      { name: 'Неактивные', value: inactive.length, customers: inactive, color: '#9ca3af' },
      { name: 'Риск (долг >50k)', value: riskDebtors.length, customers: riskDebtors, color: '#ef4444' }
    ].filter(s => s.value > 0);
  }, [customers, sales]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-600" />
        <h4 className="font-semibold text-slate-900">Сегментация клиентов</h4>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {segments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} клиентов`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {segments.map((seg, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></div>
                <p className="font-medium text-slate-900">{seg.name}</p>
                <span className="ml-auto text-sm font-semibold text-slate-600">{seg.value}</span>
              </div>
              {seg.customers.length > 0 && (
                <div className="text-xs text-slate-500 space-y-1">
                  {seg.customers.slice(0, 3).map(c => (
                    <p key={c.id}>{c.name} - {c.totalSpent.toLocaleString()} с.</p>
                  ))}
                  {seg.customers.length > 3 && (
                    <p className="text-slate-400">+ ещё {seg.customers.length - 3}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}