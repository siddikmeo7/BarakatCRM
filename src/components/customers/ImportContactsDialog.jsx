import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactRound, Loader2, Phone, Plus, CheckCircle2, Info, Upload, FileText, Apple, Smartphone } from 'lucide-react';

const isIOS = typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Диалог импорта клиентов из телефонной книги устройства.
// На Android Chrome использует Contacts Picker API (navigator.contacts).
// На десктопе/других браузерах — загрузка файла контактов (vCard .vcf или CSV).
export default function ImportContactsDialog({ open, onClose, onImport, existingPhones = [], autoPick = false }) {
  const [contacts, setContacts] = useState([]);       // выбранные из телефонной книги / файла
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supported] = useState(
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window
  );
  const [error, setError] = useState('');
  const [parseInfo, setParseInfo] = useState('');
  const fileRef = useRef(null);
  const existingSet = new Set(existingPhones.map(p => normalizePhone(p)));

  // Автоматически запрашиваем доступ к контактам телефона при открытии (если поддерживается)
  useEffect(() => {
    if (open && autoPick && supported && contacts.length === 0) {
      pickContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPick]);

  const pickContacts = async () => {
    setError('');
    setLoading(true);
    try {
      const props = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true });
      if (!props || props.length === 0) {
        setLoading(false);
        return;
      }
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

  const handleFile = async (e) => {
    setError('');
    setParseInfo('');
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const isVcf = file.name.toLowerCase().endsWith('.vcf');
      const parsed = isVcf ? parseVCard(text) : parseCsv(text);
      const flat = [];
      parsed.forEach((c, idx) => {
        const name = c.name || `Контакт ${idx + 1}`;
        const tels = Array.isArray(c.tel) ? c.tel : (c.tel ? [c.tel] : []);
        if (tels.length === 0) {
          flat.push({ id: `f_${idx}_0`, name, phone: '', email: c.email || '', address: c.address || '', include: true, already: false });
        } else {
          tels.forEach((tel, j) => {
            const norm = normalizePhone(tel);
            flat.push({
              id: `f_${idx}_${j}`,
              name,
              phone: tel,
              email: j === 0 ? (c.email || '') : '',
              address: j === 0 ? (c.address || '') : '',
              include: true,
              already: existingSet.has(norm)
            });
          });
        }
      });
      setContacts(prev => [...prev, ...flat]);
      setParseInfo(`Импортировано ${flat.length} контактов из файла «${file.name}».`);
    } catch (err) {
      setError('Не удалось прочитать файл: ' + (err?.message || 'ошибка'));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
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
            Импорт клиентов из контактов
          </DialogTitle>
        </DialogHeader>

        {supported && (
          <Button
            onClick={pickContacts}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-11 text-base"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
            {loading ? 'Открытие контактов...' : 'Выбрать контакты из телефона'}
          </Button>
        )}

        {/* iPhone / не-Android: понятный поток экспорта контактов */}
        {!supported && (
          <div className="space-y-3">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                {isIOS ? <Apple className="w-4 h-4 text-indigo-600" /> : <Smartphone className="w-4 h-4 text-indigo-600" />}
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {isIOS ? 'Экспорт контактов с iPhone' : 'Экспорт контактов с телефона'}
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2.5">
                {isIOS
                  ? 'Браузер iPhone не даёт сайтам прямой доступ к контактам. Экспортируйте их в файл .vcf один раз — затем выберите файл ниже.'
                  : 'Прямой доступ к контактам доступен только в Chrome на Android. Экспортируйте контакты в файл .vcf и загрузите его ниже.'}
              </p>
              {isIOS && (
                <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
                  <li>Откройте приложение <b>«Контакты»</b> → нажмите <b>«Списки»</b> вверху слева.</li>
                  <li>Долгим нажатием выберите нужный список (или «Все iCloud»).</li>
                  <li>Нажмите <b>«Экспорт»</b> → <b>«Экспорт vCard»</b> и сохраните файл.</li>
                  <li>Вернитесь сюда и нажмите «Загрузить файл .vcf» ниже.</li>
                </ol>
              )}
            </div>
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-11 text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              Загрузить файл контактов (.vcf / .csv)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".vcf,.csv,text/vcard,text/csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* На Android — запасная загрузка файла */}
        {supported && (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Загрузить файл контактов (.vcf / .csv)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".vcf,.csv,text/vcard,text/csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {parseInfo && <p className="text-xs text-emerald-600 dark:text-emerald-400">{parseInfo}</p>}

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
                  className={`rounded-xl border p-2.5 ${c.already ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : c.include ? 'border-indigo-200 bg-white dark:bg-slate-900' : 'border-slate-200 bg-slate-50 dark:bg-slate-800 opacity-60'}`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleInclude(c.id)}
                      disabled={c.already}
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${c.already ? 'bg-emerald-500' : c.include ? 'bg-indigo-600' : 'border border-slate-300 bg-white dark:bg-slate-700'}`}
                    >
                      {(c.include || c.already) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.phone || 'нет номера'}</p>
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

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
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

// ===== Парсеры файлов контактов =====

function parseVCard(text) {
  const cards = [];
  const blocks = text.split(/BEGIN:VCARD/i).slice(1);
  for (const block of blocks) {
    const endIdx = block.search(/END:VCARD/i);
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const lines = body.split(/\r?\n/);
    let name = '';
    const tels = [];
    let email = '';
    let address = '';
    for (let raw of lines) {
      if (!raw) continue;
      // Раскручиваем folded lines (начинаются с пробела/таба)
      // (для простоты — игнорируем, встречается редко)
      const line = raw.trim();
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      const keyPart = line.slice(0, colonIdx).toUpperCase();
      const value = line.slice(colonIdx + 1);
      if (keyPart.startsWith('FN')) {
        name = value.trim();
      } else if (keyPart.startsWith('N') && !name) {
        // Фамилия;Имя;Отчество;Префикс;Суффикс
        const parts = value.split(';').map(p => p.trim()).filter(Boolean);
        if (parts.length) name = parts.join(' ');
      } else if (keyPart.startsWith('TEL')) {
        const num = value.replace(/[^\d+]/g, '');
        if (num) tels.push(num);
      } else if (keyPart.startsWith('EMAIL') && !email) {
        email = value.trim();
      } else if (keyPart.startsWith('ADR') && !address) {
        const parts = value.split(';').map(p => p.trim()).filter(Boolean);
        if (parts.length) address = parts.join(', ');
      }
    }
    if (name || tels.length || email) {
      cards.push({ name: name || 'Контакт', tel: tels, email, address });
    }
  }
  return cards;
}

function parseCsv(text) {
  const rows = csvToRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  // Ищем колонки по распространённым названиям
  const nameIdx = header.findIndex(h => /^name$|^full.?name$|^имя$|^фио$/i.test(h));
  const telIdx = header.findIndex(h => /^tel$|^phone$|^mobile$|^телефон$|^номер$/i.test(h));
  const emailIdx = header.findIndex(h => /^email$|^e-mail$|^почта$/i.test(h));
  const addrIdx = header.findIndex(h => /^address$|^адрес$|^city$|^город$/i.test(h));
  const cards = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const name = nameIdx >= 0 ? (r[nameIdx] || '').trim() : '';
    const tel = telIdx >= 0 ? (r[telIdx] || '').trim() : '';
    const email = emailIdx >= 0 ? (r[emailIdx] || '').trim() : '';
    const address = addrIdx >= 0 ? (r[addrIdx] || '').trim() : '';
    if (!name && !tel && !email) continue;
    const tels = tel ? tel.split(/[;,]/).map(t => t.replace(/[^\d+]/g, '').trim()).filter(Boolean) : [];
    cards.push({ name: name || 'Контакт', tel: tels, email, address });
  }
  return cards;
}

function csvToRows(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === ';' && field === '' && cur.length === 0) { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        cur.push(field); field = '';
        if (cur.some(c => c.trim() !== '')) rows.push(cur);
        cur = [];
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || cur.length > 0) { cur.push(field); if (cur.some(c => c.trim() !== '')) rows.push(cur); }
  return rows;
}

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}