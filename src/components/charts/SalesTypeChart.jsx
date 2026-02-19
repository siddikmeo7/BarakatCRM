import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b'];

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export default function SalesTypeChart({ sales }) {
  const activeSales = sales.filter(s => !s.is_cancelled);
  const cashAmount = activeSales.filter(s => !s.is_debt).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const debtAmount = activeSales.filter(s => s.is_debt).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const total = cashAmount + debtAmount;

  const data = [
    { name: 'Наличные', value: cashAmount },
    { name: 'В долг', value: debtAmount },
  ].filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">Нет данных</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height="75%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value.toLocaleString()} с. (${total ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name
            ]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Manual legend with amounts */}
      <div className="flex justify-center gap-6 pb-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{entry.value.toLocaleString()} с.</span>
            <span className="text-xs text-slate-400">{total ? ((entry.value / total) * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}