import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { formatCompact } from '@/lib/formatCompact';

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

  const anim = { animationDuration: 2200, animationBegin: 400, animationEasing: 'ease' };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="tk-sp2" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f5b23e' }} />
          Прогноз продаж (линейный тренд)
        </h3>
        <div className="tk-leg">
          <span><i style={{ background: '#f5b23e' }} />Факт</span>
          <span><i style={{ background: '#6ee7b7' }} />Прогноз 7 дней</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232a35" vertical={false} />
          <XAxis dataKey="date" angle={-45} textAnchor="end" height={70} stroke="#7c8594" fontSize={10} tickLine={false} interval="preserveStartEnd" />
          <YAxis stroke="#7c8594" fontSize={10} tickLine={false} axisLine={false} width={45} />
          <Tooltip
            contentStyle={{ backgroundColor: '#12161d', border: '1px solid #232a35', borderRadius: '3px', fontSize: '12px', color: '#f2f4f8' }}
            labelStyle={{ color: '#7c8594' }}
            itemStyle={{ color: '#f2f4f8' }}
            formatter={(v) => v ? `${v.toLocaleString()} с.` : '-'}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#f5b23e"
            strokeWidth={2.5}
            dot={false}
            name="Фактические продажи"
            connectNulls={false}
            {...anim}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#6ee7b7"
            strokeWidth={2.5}
            dot={false}
            strokeDasharray="5 5"
            name="Прогноз на 7 дней"
            connectNulls={false}
            {...anim}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="tk-mat tk-mono" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12 }}>
        <div>
          <span className="tk-cap">Среднее в день</span>
          <b>{formatCompact(avgSales, 'ru')} с.</b>
        </div>
        <div>
          <span className="tk-cap">Прогноз за неделю</span>
          <b>{formatCompact(avgSales * 7, 'ru')} с.</b>
        </div>
        <div>
          <span className="tk-cap">Прогноз за месяц</span>
          <b>{formatCompact(avgSales * 30, 'ru')} с.</b>
        </div>
      </div>
    </div>
  );
}