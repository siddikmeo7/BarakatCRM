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
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${percent}%`}
          labelLine={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => value.toLocaleString() + ' с.'} 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}