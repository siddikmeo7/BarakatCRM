import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function SalesChart({ sales, days = 7 }) {
  // Группируем продажи по дням
  const chartData = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i));
    const daySales = sales.filter(s => {
      const saleDate = startOfDay(parseISO(s.sale_date || s.created_date));
      return saleDate.getTime() === date.getTime();
    });

    const revenue = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const profit = daySales.reduce((sum, s) => sum + (s.profit || 0), 0);

    chartData.push({
      date: format(date, 'dd MMM', { locale: ru }),
      revenue,
      profit,
      count: daySales.length
    });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          formatter={(value) => value.toLocaleString() + ' с.'}
        />
        <Legend />
        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" name="Выручка" />
        <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name="Прибыль" />
      </AreaChart>
    </ResponsiveContainer>
  );
}