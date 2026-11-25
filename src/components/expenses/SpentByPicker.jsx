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
    <div>
      <div className="ep-st" style={{ alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange('')}
          className={`ep-chip ${value ? '' : 'on'}`}
        >
          Не указано — расход на вас
        </button>

        {options.map((name) => (
          editingName === name ? (
            <span key={name} className="ep-chip on" style={{ gap: 4 }}>
              <Input
                autoFocus
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') setEditingName(null);
                }}
                className="ep-fld box"
                style={{ height: 26, width: 120, padding: '0 10px', fontSize: 12 }}
              />
              <button type="button" className="ep-chip-i" onClick={saveEdit} disabled={!editDraft.trim()} title="Сохранить">
                {busyName === name ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> : <Check style={{ width: 11, height: 11 }} />}
              </button>
              <button type="button" className="ep-chip-i" onClick={() => setEditingName(null)} title="Отмена">
                <X style={{ width: 11, height: 11 }} />
              </button>
            </span>
          ) : (
            <span
              key={name}
              className={`ep-chip ${value === name ? 'on' : ''} ${isSelf(name) ? 'self' : ''}`}
            >
              <button type="button" className="ep-chip-n" onClick={() => onChange(name)}>
                {name}
                {isSelf(name) && <em>это вы</em>}
              </button>
              {canManage && (
                <>
                  <button type="button" className="ep-chip-i" onClick={() => startEdit(name)} title="Изменить имя">
                    <Pencil style={{ width: 11, height: 11 }} />
                  </button>
                  <button
                    type="button"
                    className="ep-chip-i"
                    onClick={() => setDeleteTarget({ name, isEmployee: !!findEmployee(name) })}
                    title="Удалить"
                  >
                    <Trash2 style={{ width: 11, height: 11 }} />
                  </button>
                </>
              )}
            </span>
          )
        ))}

        {!adding && (
          <button
            type="button"
            className="ep-btn"
            style={{ height: 30, fontSize: 12, padding: '0 12px' }}
            onClick={() => { setAdding(true); setAddError(''); }}
          >
            <Plus />
            Добавить нового сотрудника
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <Input
            autoFocus
            placeholder="Имя сотрудника"
            value={draft}
            onChange={e => { setDraft(e.target.value); setAddError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } }}
            className="ep-fld box"
            style={{ height: 34, flex: 1 }}
          />
          <button type="button" className="ep-btn" style={{ height: 34 }} onClick={confirmNew} disabled={!draft.trim()} title="Добавить и выбрать">
            <Check />
          </button>
          <button
            type="button"
            className="ep-btn"
            style={{ height: 34 }}
            onClick={() => { setAdding(false); setDraft(''); setAddError(''); }}
            title="Отмена"
          >
            <X />
          </button>
        </div>
      )}

      {addError && <div className="ep-warn">{addError}</div>}

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