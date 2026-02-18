import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportBuilder({ sales, customers, products, business, lang = 'ru' }) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    summary: true,
    topProducts: true,
    topCustomers: true,
    debtAnalysis: true,
    forecast: false
  });
  const [generating, setGenerating] = useState(false);
  const [reportName, setReportName] = useState(`Отчёт ${format(new Date(), 'dd.MM.yyyy')}`);

  const metrics = {
    summary: { label: 'Общая статистика', desc: 'Выручка, прибыль, количество продаж' },
    topProducts: { label: 'Топ товаров', desc: 'ТОП-10 товаров по продажам' },
    topCustomers: { label: 'Лучшие клиенты', desc: 'ТОП-10 клиентов по выручке' },
    debtAnalysis: { label: 'Анализ долгов', desc: 'Информация о задолженности' },
    forecast: { label: 'Прогноз', desc: 'Прогноз продаж на месяц' }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const reportLines = [];
      reportLines.push(`# ${reportName}`);
      reportLines.push(`Дата: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`);
      reportLines.push(`Бизнес: ${business?.name || 'N/A'}`);
      reportLines.push('');

      if (selectedMetrics.summary) {
        const totalRevenue = sales.reduce((s, x) => s + (x.total_amount || 0), 0);
        const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
        const totalBoxes = sales.reduce((s, x) => s + (x.boxes_sold || 0), 0);
        const totalDebt = customers.reduce((s, c) => s + (c.total_debt || 0), 0);

        reportLines.push('## Общая статистика');
        reportLines.push(`- Всего продаж: ${sales.length}`);
        reportLines.push(`- Выручка: ${totalRevenue.toLocaleString()} сомони`);
        reportLines.push(`- Прибыль: ${totalProfit.toLocaleString()} сомони`);
        reportLines.push(`- Коробок продано: ${totalBoxes}`);
        reportLines.push(`- Общий долг: ${totalDebt.toLocaleString()} сомони`);
        reportLines.push(`- Маржа: ${totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`);
        reportLines.push('');
      }

      if (selectedMetrics.topProducts) {
        const productStats = {};
        sales.forEach(s => {
          if (!productStats[s.product_id]) productStats[s.product_id] = { boxes: 0, revenue: 0 };
          productStats[s.product_id].boxes += s.boxes_sold || 0;
          productStats[s.product_id].revenue += s.total_amount || 0;
        });

        reportLines.push('## ТОП-10 Товаров');
        const topProds = Object.entries(productStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 10);

        topProds.forEach((item, i) => {
          const prod = products.find(p => p.id === item[0]);
          if (prod) {
            reportLines.push(`${i + 1}. ${prod.brand} ${prod.model} - ${item[1].revenue.toLocaleString()} с. (${item[1].boxes} кор.)`);
          }
        });
        reportLines.push('');
      }

      if (selectedMetrics.topCustomers) {
        reportLines.push('## ТОП-10 Клиентов');
        const topCusts = customers
          .filter(c => (c.total_debt || 0) > 0 || (c.total_paid || 0) > 0)
          .sort((a, b) => (b.total_debt || 0) + (b.total_paid || 0) - ((a.total_debt || 0) + (a.total_paid || 0)))
          .slice(0, 10);

        topCusts.forEach((c, i) => {
          reportLines.push(`${i + 1}. ${c.name} - Куплено: ${(c.total_paid || 0).toLocaleString()} с., Долг: ${(c.total_debt || 0).toLocaleString()} с.`);
        });
        reportLines.push('');
      }

      if (selectedMetrics.debtAnalysis) {
        const debtors = customers.filter(c => (c.total_debt || 0) > 0);
        const totalDebt = debtors.reduce((s, c) => s + (c.total_debt || 0), 0);

        reportLines.push('## Анализ Долгов');
        reportLines.push(`- Должников: ${debtors.length} из ${customers.length}`);
        reportLines.push(`- Общий долг: ${totalDebt.toLocaleString()} сомони`);
        reportLines.push(`- Средний долг: ${debtors.length > 0 ? Math.round(totalDebt / debtors.length).toLocaleString() : 0} сомони`);
        reportLines.push(`- Макс долг: ${debtors.length > 0 ? Math.max(...debtors.map(c => c.total_debt || 0)).toLocaleString() : 0} сомони`);
        reportLines.push('');
      }

      if (selectedMetrics.forecast) {
        const dailySales = {};
        sales.forEach(s => {
          const d = format(new Date(s.sale_date || s.created_date), 'yyyy-MM-dd');
          dailySales[d] = (dailySales[d] || 0) + (s.total_amount || 0);
        });

        const values = Object.values(dailySales).slice(-30);
        const avgDaily = values.length > 0 ? values.reduce((a, b) => a + b) / values.length : 0;

        reportLines.push('## Прогноз на месяц');
        reportLines.push(`- Среднее в день: ${Math.round(avgDaily).toLocaleString()} сомони`);
        reportLines.push(`- Прогноз на неделю: ${Math.round(avgDaily * 7).toLocaleString()} сомони`);
        reportLines.push(`- Прогноз на месяц: ${Math.round(avgDaily * 30).toLocaleString()} сомони`);
        reportLines.push('');
      }

      // Generate CSV
      const csv = reportLines.join('\n');
      const blob = new Blob([csv], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Генератор отчётов</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Название отчёта</label>
        <Input
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          placeholder="Название отчёта"
          className="mb-4"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Выберите разделы:</p>
        {Object.entries(metrics).map(([key, { label, desc }]) => (
          <label key={key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <Checkbox
              checked={selectedMetrics[key]}
              onChange={(e) => setSelectedMetrics(p => ({ ...p, [key]: e.target.checked }))}
            />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          </label>
        ))}
      </div>

      <Button
        onClick={generateReport}
        disabled={generating || !Object.values(selectedMetrics).some(v => v)}
        className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Генерирую...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Скачать отчёт (Markdown)
          </>
        )}
      </Button>
    </div>
  );
}