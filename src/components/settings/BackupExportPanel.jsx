import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  Download, Save, Loader2, CloudUpload, 
  FileSpreadsheet, Database, ShoppingCart, Package, 
  CheckCircle, AlertCircle
} from 'lucide-react';

function StatusMsg({ msg }) {
  if (!msg) return null;
  const isError = msg.startsWith('❌');
  return (
    <div className={`flex items-center gap-2 text-sm mt-2 px-3 py-2 rounded-lg ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  );
}

export default function BackupExportPanel({ business, onBackupJSON }) {
  const [driveLoading, setDriveLoading] = useState(null); // null | 'full' | 'sales' | 'inventory'
  const [driveMsg, setDriveMsg] = useState({});
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMsg, setExcelMsg] = useState('');

  const driveBackup = async (type) => {
    setDriveLoading(type);
    setDriveMsg(prev => ({ ...prev, [type]: '' }));
    try {
      const res = await base44.functions.invoke('backupToGoogleDrive', { type });
      if (res.data?.success) {
        setDriveMsg(prev => ({ ...prev, [type]: `✅ Сохранено: ${res.data.file_name}` }));
      } else {
        setDriveMsg(prev => ({ ...prev, [type]: `❌ Ошибка: ${res.data?.error || 'Неизвестная ошибка'}` }));
      }
    } catch (e) {
      setDriveMsg(prev => ({ ...prev, [type]: `❌ Ошибка: ${e.message}` }));
    } finally {
      setDriveLoading(null);
    }
  };

  const exportExcel = async () => {
    setExcelLoading(true);
    setExcelMsg('');
    try {
      const res = await base44.functions.invoke('exportToExcel');
      if (!res.data?.success) {
        setExcelMsg(`❌ Ошибка: ${res.data?.error || 'Неизвестная ошибка'}`);
        return;
      }
      const { sheets, business_name, exported_at } = res.data;

      // Build HTML with multiple tables (opens as Excel-compatible file)
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${business_name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; }
  h2 { background: #4338ca; color: white; padding: 6px 10px; margin: 20px 0 0; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  th { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; padding: 6px 10px; text-align: left; font-weight: bold; }
  td { border: 1px solid #e5e7eb; padding: 5px 10px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
</style></head><body>
<h1 style="color:#1e293b;">${business_name} — Экспорт данных</h1>
<p class="meta">Дата экспорта: ${new Date(exported_at).toLocaleString('ru-RU')}</p>`;

      for (const [sheetName, sheet] of Object.entries(sheets)) {
        const cols = sheet.columns.length ? sheet.columns : Object.keys(sheet.rows[0] || {});
        html += `<h2>${sheetName} (${sheet.rows.length} записей)</h2><table><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
        for (const row of sheet.rows) {
          html += `<tr>${cols.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`;
        }
        html += `</table>`;
      }
      html += `</body></html>`;

      const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BarakatCRM_${business_name}_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      setExcelMsg('✅ Excel файл скачан успешно');
    } catch (e) {
      setExcelMsg(`❌ Ошибка: ${e.message}`);
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Excel Export */}
      <div className="p-5 border border-green-200 bg-green-50 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-1">Экспорт в Excel</h4>
            <p className="text-sm text-green-700 mb-3">
              Все данные бизнеса (продажи, товары, клиенты, возвраты, оплаты, сотрудники) в одном Excel файле
            </p>
            <Button
              onClick={exportExcel}
              disabled={excelLoading}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {excelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Скачать Excel
            </Button>
            <StatusMsg msg={excelMsg} />
          </div>
        </div>
      </div>

      {/* Google Drive Backups */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-indigo-600" />
          Резервное копирование в Google Drive
        </h4>

        {/* Full Backup */}
        <div className="p-4 border border-indigo-200 bg-indigo-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-indigo-900 text-sm">Полный бэкап</p>
              <p className="text-xs text-indigo-700 mb-2">Все данные: товары, продажи, клиенты, склады, сотрудники</p>
              <Button
                onClick={() => driveBackup('full')}
                disabled={driveLoading !== null}
                variant="outline"
                size="sm"
                className="text-indigo-700 border-indigo-300 hover:bg-indigo-100 gap-2"
              >
                {driveLoading === 'full' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Сохранить в Drive
              </Button>
              <StatusMsg msg={driveMsg['full']} />
            </div>
          </div>
        </div>

        {/* Sales Report */}
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
          <div className="flex items-start gap-3">
            <ShoppingCart className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 text-sm">Отчёт по продажам</p>
              <p className="text-xs text-blue-700 mb-2">Продажи, клиенты, возвраты</p>
              <Button
                onClick={() => driveBackup('sales')}
                disabled={driveLoading !== null}
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-100 gap-2"
              >
                {driveLoading === 'sales' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Сохранить в Drive
              </Button>
              <StatusMsg msg={driveMsg['sales']} />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 text-sm">Инвентаризация</p>
              <p className="text-xs text-amber-700 mb-2">Товары и склады</p>
              <Button
                onClick={() => driveBackup('inventory')}
                disabled={driveLoading !== null}
                variant="outline"
                size="sm"
                className="text-amber-700 border-amber-300 hover:bg-amber-100 gap-2"
              >
                {driveLoading === 'inventory' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Сохранить в Drive
              </Button>
              <StatusMsg msg={driveMsg['inventory']} />
            </div>
          </div>
        </div>
      </div>

      {/* JSON local download */}
      <div className="p-4 border border-slate-200 bg-slate-50 rounded-xl">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-slate-900 text-sm">Скачать JSON бэкап</p>
            <p className="text-xs text-slate-600 mb-2">Полный бэкап на устройство в формате JSON</p>
            <Button
              onClick={onBackupJSON}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-3 h-3" />
              Скачать JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}