import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function SalesTypeChart({ sales }) {
  const cashSales = sales.filter(s => !s.is_debt);
  const debtSales = sales.filter(s => s.is_debt);

  const cashAmount = cashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const debtAmount = debtSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const total = cashAmount + debtAmount;

  const data = [
    { name: 'Наличные', value: cashAmount, percent: total ? ((cashAmount / total) * 100).toFixed(1) : 0 },
    { name: 'В долг', value: debtAmount, percent: total ? ((debtAmount / total) * 100).toFixed(1) : 0 }
  ];

  const COLORS = ['#10b981', '#f59e0b'];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label={({ percent }) => `${percent}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString() + ' с.'} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <div>
              <p className="text-xs text-slate-500">{item.name}</p>
              <p className="font-semibold text-slate-900">{item.value.toLocaleString()} с.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}