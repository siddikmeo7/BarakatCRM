import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function SalesForecast({ sales, days = 30 }) {
  const forecastData = useMemo(() => {
    // Group sales by day
    const dailySales = {};
    sales.forEach(s => {
      const date = format(new Date(s.sale_date || s.created_date), 'yyyy-MM-dd');
      if (!dailySales[date]) dailySales[date] = 0;
      dailySales[date] += s.total_amount || 0;
    });

    // Get last N days
    const now = new Date();
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      data.push({
        date: format(d, 'dd MMM'),
        actual: dailySales[dateStr] || 0,
        forecast: 0
      });
    }

    // Simple linear regression for forecast
    const historicalData = Object.values(dailySales).slice(-days);
    if (historicalData.length > 0) {
      const avg = historicalData.reduce((a, b) => a + b) / historicalData.length;
      const trend = historicalData.length > 1 
        ? (historicalData[historicalData.length - 1] - historicalData[0]) / historicalData.length
        : 0;

      // Add forecast points (next 7 days)
      for (let i = 1; i <= 7; i++) {
        const futureDate = format(subDays(now, -i), 'dd MMM');
        const forecastValue = Math.max(0, avg + (trend * i));
        data.push({
          date: futureDate,
          actual: null,
          forecast: Math.round(forecastValue)
        });
      }
    }

    return data;
  }, [sales, days]);

  const avgSales = useMemo(() => {
    const vals = forecastData
      .filter(d => d.actual !== null)
      .map(d => d.actual)
      .filter(v => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b) / vals.length) : 0;
  }, [forecastData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-slate-900">Прогноз продаж (линейная тренд)</h4>
      </div>
      <div className="h-80 bg-white rounded-lg">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecastData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(v) => v ? `${v.toLocaleString()} с.` : '-'} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#3b82f6" 
              dot={{ r: 3 }} 
              name="Фактические продажи"
              connectNulls={false}
            />
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="#10b981" 
              dot={{ r: 3 }}
              strokeDasharray="5 5"
              name="Прогноз на 7 дней"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-blue-50 px-3 py-2 rounded-lg">
          <p className="text-slate-600">Среднее в день</p>
          <p className="font-semibold text-blue-900">{avgSales.toLocaleString()} с.</p>
        </div>
        <div className="bg-emerald-50 px-3 py-2 rounded-lg">
          <p className="text-slate-600">Прогноз за неделю</p>
          <p className="font-semibold text-emerald-900">{(avgSales * 7).toLocaleString()} с.</p>
        </div>
        <div className="bg-purple-50 px-3 py-2 rounded-lg">
          <p className="text-slate-600">Прогноз за месяц</p>
          <p className="font-semibold text-purple-900">{(avgSales * 30).toLocaleString()} с.</p>
        </div>
      </div>
    </div>
  );
}