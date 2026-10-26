import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// Палитра «Тёмного терминала»: янтарь — выручка, мята — прибыль, сетка — графит.
const REVENUE_COLOR = '#f5b23e';
const PROFIT_COLOR = '#6ee7b7';
const GRID_COLOR = '#232a35';
const AXIS_COLOR = '#7c8594';

export default function SalesChart({ sales, days = 7, chartType = 'line', showProfit = true }) {
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

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart;
  const anim = { animationDuration: 2200, animationBegin: 400, animationEasing: 'ease' };

  return (
    <ResponsiveContainer width="100%" height={210}>
      <ChartComponent data={chartData}>
        <defs>
          <linearGradient id="tkColorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="tkColorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PROFIT_COLOR} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={PROFIT_COLOR} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS_COLOR} fontSize={11} tickLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#12161d', border: '1px solid #232a35', borderRadius: '3px', fontSize: '12px', color: '#f2f4f8' }}
          labelStyle={{ color: '#7c8594' }}
          itemStyle={{ color: '#f2f4f8' }}
          formatter={(value) => value.toLocaleString() + ' с.'}
        />
        {chartType === 'bar' ? (
          <>
            <Bar dataKey="revenue" fill={REVENUE_COLOR} name="Выручка" {...anim} />
            {showProfit && <Bar dataKey="profit" fill={PROFIT_COLOR} name="Прибыль" {...anim} />}
          </>
        ) : chartType === 'area' ? (
          <>
            <Area type="monotone" dataKey="revenue" stroke={REVENUE_COLOR} fillOpacity={1} fill="url(#tkColorRevenue)" name="Выручка" {...anim} />
            {showProfit && <Area type="monotone" dataKey="profit" stroke={PROFIT_COLOR} fillOpacity={1} fill="url(#tkColorProfit)" name="Прибыль" {...anim} />}
          </>
        ) : (
          <>
            <Line type="monotone" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={2.5} dot={false} name="Выручка" {...anim} />
            {showProfit && <Line type="monotone" dataKey="profit" stroke={PROFIT_COLOR} strokeWidth={2.5} dot={false} name="Прибыль" {...anim} />}
          </>
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}