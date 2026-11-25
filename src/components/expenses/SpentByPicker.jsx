import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { Check, Plus, X, Pencil, Trash2, Settings2, Loader2 } from 'lucide-react';
import DeleteSpentByNameDialog from './DeleteSpentByNameDialog';

// Выбор сотрудника, от имени которого фиксируется расход.
// В списке — сотрудники бизнеса и ранее указанные лица; если человека ещё нет,
// его можно добавить прямо здесь и сразу выбрать. Любое имя из списка можно
// переименовать или удалить (удаление — в три этапа подтверждения).
export default function SpentByPicker({
  value,
  onChange,
  employees = [],
  usedNames = [],
  businessId,
  canManage = true,
  onChanged,
  className,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [extras, setExtras] = useState([]);
  const [managing, setManaging] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busyName, setBusyName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeEmployees = employees.filter(e => !e.deleted_at);
  const teamNames = activeEmployees.map(e => e.name).filter(Boolean);
  const options = [...new Set([...teamNames, ...usedNames, ...extras].filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const findEmployee = (name) => activeEmployees.find(
    e => (e.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase()
  );

  const confirmNew = () => {
    const name = draft.trim();
    if (!name) return;
    setExtras(prev => (prev.includes(name) ? prev : [...prev, name]));
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  const startEdit = (name) => {
    setEditingName(name);
    setEditDraft(name);
  };

  // Переименование: обновляем имя у сотрудника (если это он) и в прошлых расходах,
  // чтобы суммы «От имени» остались за тем же человеком.
  const saveEdit = async () => {
    const oldName = editingName;
    const nextName = editDraft.trim();
    if (!oldName) return;
    if (!nextName || nextName === oldName) { setEditingName(null); return; }
    setBusyName(oldName);
    try {
      const emp = findEmployee(oldName);
      if (emp) await base44.entities.Employee.update(emp.id, { name: nextName });
      if (businessId) {
        await base44.entities.Expense.updateMany(
          { business_id: businessId, spent_by_name: oldName },
          { $set: { spent_by_name: nextName } }
        );
      }
      setExtras(prev => prev.map(n => (n === oldName ? nextName : n)));
      if (value === oldName) onChange(nextName);
      setEditingName(null);
      toast({ title: 'Имя изменено', description: `«${oldName}» → «${nextName}»` });
      onChanged?.();
    } catch (e) {
      console.error('Rename spent-by name error:', e);
      toast({ title: 'Ошибка', description: 'Не удалось изменить имя', variant: 'destructive' });
    } finally {
      setBusyName('');
    }
  };

  // Удаление: убираем сотрудника из команды (если это он) и очищаем отметку
  // «от имени» в прошлых расходах, чтобы имя исчезло из списка.
  const handleDelete = async () => {
    const name = deleteTarget?.name;
    if (!name) return false;
    try {
      const emp = findEmployee(name);
      if (emp) await base44.entities.Employee.delete(emp.id);
      if (businessId) {
        await base44.entities.Expense.updateMany(
          { business_id: businessId, spent_by_name: name },
          { $set: { spent_by_name: '' } }
        );
      }
      setExtras(prev => prev.filter(n => n !== name));
      if (value === name) onChange('');
      toast({ title: 'Удалено', description: `«${name}» больше нет в списке` });
      onChanged?.();
      return true;
    } catch (e) {
      console.error('Delete spent-by name error:', e);
      toast({ title: 'Ошибка', description: 'Не удалось удалить имя', variant: 'destructive' });
      return false;
    }
  };

  return (
    <div className="mt-1.5 space-y-2">
      <Select
        value={value || '__none__'}
        onValueChange={(v) => {
          if (v === '__new__') { setAdding(true); return; }
          onChange(v === '__none__' ? '' : v);
        }}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder="Не указано" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Не указано</SelectItem>
          {options.map(name => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
          <SelectItem value="__new__" className="font-semibold text-indigo-600">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Добавить нового сотрудника
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Имя сотрудника"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } }}
            className={className}
          />
          <Button
            type="button"
            onClick={confirmNew}
            disabled={!draft.trim()}
            className="h-9 rounded-[11px] px-3 bg-indigo-600 text-white font-bold"
            title="Добавить и выбрать"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setAdding(false); setDraft(''); }}
            className="h-9 rounded-[11px] px-2.5 border-slate-300"
            title="Отмена"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {canManage && options.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => { setManaging(v => !v); setEditingName(null); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Управление именами ({options.length})
          </button>

          {managing && (
            <div className="mt-1.5 max-h-56 overflow-y-auto custom-scroll rounded-[11px] border border-slate-200 bg-white divide-y divide-slate-100">
              {options.map(name => (
                <div key={name} className="flex items-center gap-2 px-3 py-1.5">
                  {editingName === name ? (
                    <>
                      <Input
                        autoFocus
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                          if (e.key === 'Escape') setEditingName(null);
                        }}
                        className="h-8 flex-1 rounded-lg bg-slate-50 text-sm"
                      />
                      <Button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editDraft.trim() || busyName === name}
                        className="h-8 w-8 rounded-lg bg-indigo-600 px-0 text-white"
                        title="Сохранить"
                      >
                        {busyName === name
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Check className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingName(null)}
                        className="h-8 w-8 rounded-lg px-0 border-slate-300"
                        title="Отмена"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onChange(name)}
                        className="flex-1 truncate text-left text-sm font-medium text-slate-700 hover:text-indigo-600"
                      >
                        {name}
                        {value === name && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            выбрано
                          </span>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => startEdit(name)}
                        className="h-7 w-7 rounded-lg px-0 text-slate-400 hover:text-indigo-600"
                        title="Изменить имя"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDeleteTarget({ name, isEmployee: !!findEmployee(name) })}
                        className="h-7 w-7 rounded-lg px-0 text-slate-400 hover:text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DeleteSpentByNameDialog
        open={!!deleteTarget}
        name={deleteTarget?.name}
        isEmployee={!!deleteTarget?.isEmployee}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        onConfirm={handleDelete}
      />
    </div>
  );
}