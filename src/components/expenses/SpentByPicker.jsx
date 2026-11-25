import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { Check, Plus, X, Pencil, Trash2, Loader2 } from 'lucide-react';
import DeleteSpentByNameDialog from './DeleteSpentByNameDialog';

// Выбор сотрудника, от имени которого фиксируется расход.
// Показываем имена всех сотрудников бизнеса и все ранее указанные лица.
// У каждого имени есть две кнопки — «Изменить» и «Удалить» (удаление в три этапа).
// Своё имя выбирать не нужно: расход и так записывается на автора.
export default function SpentByPicker({
  value,
  onChange,
  employees = [],
  usedNames = [],
  businessId,
  canManage = true,
  selfName = '',
  onChanged,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');
  const [extras, setExtras] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busyName, setBusyName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const self = (selfName || '').trim().toLowerCase();
  const isSelf = (name) => !!self && (name || '').trim().toLowerCase() === self;

  const activeEmployees = employees.filter(e => !e.deleted_at);
  const teamNames = activeEmployees.map(e => e.name).filter(Boolean);

  // Одинаковые имена, записанные по-разному, показываем один раз
  const seen = new Set();
  const options = [...teamNames, ...usedNames, ...extras]
    .filter(Boolean)
    .filter((name) => {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

  const findEmployee = (name) => activeEmployees.find(
    e => (e.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase()
  );

  const confirmNew = () => {
    const name = draft.trim();
    if (!name) return;
    if (isSelf(name)) {
      setAddError('Это ваше имя. Своё имя добавлять не нужно — расход и так запишется на вас.');
      return;
    }
    setAddError('');
    setExtras(prev => (prev.some(n => n.trim().toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]));
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
    <div className="space-y-2">
      <div className="ex-pick">
        {/* Пустое значение — расход записывается на автора */}
        <div className={`ex-pick-row ${value ? '' : 'on'}`}>
          <button type="button" onClick={() => onChange('')} className="ex-pick-name">
            {!value && <Check className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--ex-stamp)' }} />}
            <span>Не указано — расход на вас</span>
          </button>
        </div>

        {options.map((name) => (
          editingName === name ? (
            <div key={name} className="ex-pick-row">
              <Input
                autoFocus
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') setEditingName(null);
                }}
                className="ex-field h-8 flex-1"
              />
              <button
                type="button"
                onClick={saveEdit}
                disabled={!editDraft.trim() || busyName === name}
                className="ex-pick-act"
                title="Сохранить"
              >
                {busyName === name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => setEditingName(null)} className="ex-pick-act" title="Отмена">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              key={name}
              className={`ex-pick-row ${value === name ? 'on' : ''} ${isSelf(name) ? 'self' : ''}`}
            >
              <button type="button" onClick={() => onChange(name)} className="ex-pick-name">
                {value === name && <Check className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--ex-stamp)' }} />}
                <span>{name}</span>
                {isSelf(name) && <em>это вы</em>}
              </button>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(name)}
                    className="ex-pick-act"
                    title="Изменить имя"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ name, isEmployee: !!findEmployee(name) })}
                    className="ex-pick-act"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )
        ))}

        {!adding && (
          <button type="button" onClick={() => { setAdding(true); setAddError(''); }} className="ex-pick-add">
            <Plus className="w-3.5 h-3.5" /> Добавить нового сотрудника
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Имя сотрудника"
            value={draft}
            onChange={e => { setDraft(e.target.value); setAddError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } }}
            className="ex-field flex-1"
          />
          <button type="button" onClick={confirmNew} disabled={!draft.trim()} className="ex-btn pri" title="Добавить и выбрать">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => { setAdding(false); setDraft(''); setAddError(''); }} className="ex-btn" title="Отмена">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {addError && <div className="ex-warn">{addError}</div>}

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