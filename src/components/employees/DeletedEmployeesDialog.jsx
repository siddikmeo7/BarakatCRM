import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';

// История удалённых сотрудников: отдельный список, из которого профиль можно
// восстановить — сотрудник снова появляется в команде и может войти в систему.
export default function DeletedEmployeesDialog({ open, onOpenChange, employees = [], onRestore }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-600" /> История удалённых сотрудников
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          {employees.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">Удалённых сотрудников нет</p>
          )}

          {employees.map(emp => (
            <div
              key={emp.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700"
            >
              <EmployeeAvatar employee={emp} sizeClass="w-9 h-9 text-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.name}</p>
                <p className="text-xs text-slate-500 truncate">{emp.user_email}</p>
                {emp.deleted_at && (
                  <p className="text-[11px] text-red-500">
                    Удалён {format(new Date(emp.deleted_at), 'dd.MM.yyyy, HH:mm')}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRestore(emp.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Восстановить
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}