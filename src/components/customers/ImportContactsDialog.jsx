import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactRound, Loader2, Phone, Plus, CheckCircle2, Info } from 'lucide-react';

// Диалог импорта клиентов из телефонной книги устройства.
// Использует Contacts Picker API (navigator.contacts) — поддерживается на Android Chrome.
export default function ImportContactsDialog({ open, onClose, onImport, existingPhones = [] }) {
  const [contacts, setContacts] = useState([]);       // выбранные из телефонной книги
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supported, setSupported] = useState(
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window
  );
  const [error, setError] = useState('');

  const existingSet = new Set(existingPhones.map(p => normalizePhone(p)));

  const pickContacts = async () => {
    setError('');
    setLoading(true);
    try {
      const props = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true });
      if (!props || props.length === 0) {
        setLoading(false);
        return;
      }
      // Разворачиваем: у одного контакта может быть несколько номеров
      const flat = [];
      props.forEach((c, idx) => {
        const name = (Array.isArray(c.name) ? c.name[0] : c.name) || `Контакт ${idx + 1}`;
        const tels = Array.isArray(c.tel) ? c.tel : (c.tel ? [c.tel] : []);
        const emails = Array.isArray(c.email) ? c.email : (c.email ? [c.email] : []);
        if (tels.length === 0) {
          flat.push({ id: `${idx}_0`, name, phone: '', email: emails[0] || '', address: '', include: true, already: false });
        } else {
          tels.forEach((tel, j) => {
            const norm = normalizePhone(tel);
            flat.push({
              id: `${idx}_${j}`,
              name,
              phone: tel,
              email: j === 0 ? (emails[0] || '') : '',
              address: '',
              include: true,
              already: existingSet.has(norm)
            });
          });
        }
      });
      setContacts(prev => [...prev, ...flat]);
    } catch (e) {
      setError('Не удалось получить доступ к контактам: ' + (e?.message || 'ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const toggleInclude = (id) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, include: !c.include } : c));
  };
  const updateField = (id, field, value) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeRow = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleImport = async () => {
    const selected = contacts.filter(c => c.include && c.phone && !c.already);
    if (selected.length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await onImport(selected);
      setContacts([]);
      onClose();
    } catch (e) {
      setError('Ошибка при добавлении: ' + (e?.message || 'ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = contacts.filter(c => c.include && c.phone && !c.already).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ContactRound className="w-5 h-5 text-indigo-600" />
            Импорт из контактов телефона
          </DialogTitle>
        </DialogHeader>

        {!supported && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-sm">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700">
              Ваш браузер не поддерживает доступ к контактам устройства. Эта функция работает на Android в браузере Chrome.
            </p>
          </div>
        )}

        {supported && (
          <>
            <Button
              onClick={pickContacts}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              {loading ? 'Открытие контактов...' : 'Выбрать контакты из телефона'}
            </Button>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {contacts.length > 0 && (
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Выбрано: {contacts.length}</span>
                  <span>К добавлению: {selectedCount}</span>
                </div>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto custom-scroll pr-1">
                  {contacts.map(c => (
                    <div
                      key={c.id}
                      className={`rounded-xl border p-2.5 ${c.already ? 'border-emerald-200 bg-emerald-50' : c.include ? 'border-indigo-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleInclude(c.id)}
                          disabled={c.already}
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${c.already ? 'bg-emerald-500' : c.include ? 'bg-indigo-600' : 'border border-slate-300 bg-white'}`}
                        >
                          {(c.include || c.already) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">{c.phone || 'нет номера'}</p>
                        </div>
                        {c.already ? (
                          <span className="text-[10px] font-semibold text-emerald-600">уже в системе</span>
                        ) : (
                          <button onClick={() => removeRow(c.id)} className="text-xs text-slate-400 hover:text-red-500">убрать</button>
                        )}
                      </div>
                      {c.include && !c.already && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Input
                            value={c.address}
                            onChange={e => updateField(c.id, 'address', e.target.value)}
                            placeholder="Адрес"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={c.email}
                            onChange={e => updateField(c.id, 'email', e.target.value)}
                            placeholder="Email"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={handleImport}
            disabled={saving || selectedCount === 0}
            className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Добавить {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}