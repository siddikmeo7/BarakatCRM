import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, Trash2, User, CheckCircle, Send, X } from 'lucide-react';

export default function WhatsAppNotificationsPanel({ business, onUpdate }) {
  const initRecipients = () => {
    if (Array.isArray(business?.whatsapp_recipients)) return business.whatsapp_recipients;
    return [];
  };

  const [recipients, setRecipients] = useState(initRecipients);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // For custom broadcast
  const [customText, setCustomText] = useState('');
  const [broadcastLinks, setBroadcastLinks] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleAdd = () => {
    const phone = newPhone.trim().replace(/[^0-9+]/g, '');
    if (!phone) return;
    setRecipients(prev => [...prev, { name: newName.trim() || `Получатель ${prev.length + 1}`, phone }]);
    setNewName('');
    setNewPhone('');
  };

  const handleRemove = (idx) => setRecipients(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await base44.entities.Business.update(business.id, { whatsapp_recipients: recipients });
      if (onUpdate) onUpdate({ ...business, whatsapp_recipients: recipients });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!customText.trim() || !business?.id) return;
    setBroadcasting(true);
    setBroadcastLinks(null);
    try {
      const res = await base44.functions.invoke('sendWhatsAppBroadcast', {
        business_id: business.id,
        message_type: 'custom',
        custom_text: customText,
      });
      setBroadcastLinks(res.data?.links || []);
    } catch (e) {
      alert('Ошибка: ' + e.message);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">WhatsApp уведомления</h4>
          <p className="text-xs text-slate-500">Автоматические уведомления о малом остатке, долгах и др.</p>
        </div>
      </div>

      {/* Recipients list */}
      {recipients.length > 0 && (
        <div className="space-y-1.5">
          {recipients.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-green-100 dark:border-slate-700 rounded-lg px-3 py-2">
              <User className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-24 truncate">{r.name}</span>
              <span className="text-xs text-slate-400 font-mono flex-1">{r.phone}</span>
              <a
                href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition flex-shrink-0"
              >
                Открыть
              </a>
              <button onClick={() => handleRemove(idx)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2 items-center">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Имя (необяз.)"
          className="bg-white text-xs h-8 w-28 flex-shrink-0"
        />
        <Input
          value={newPhone}
          onChange={e => setNewPhone(e.target.value)}
          placeholder="+992901234567"
          className="bg-white text-xs h-8 flex-1 font-mono"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={!newPhone.trim()} className="h-8 px-2 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8">
        {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Сохранено!</> : saving ? 'Сохранение...' : 'Сохранить получателей'}
      </Button>

      {recipients.length > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-xs text-emerald-600 font-medium">{recipients.length} получател{recipients.length === 1 ? 'ь' : 'ей'} настроено</p>
        </div>
      )}

      {/* Custom broadcast */}
      {recipients.length > 0 && (
        <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Отправить сообщение всем</p>
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder="Введите текст сообщения..."
            rows={3}
            className="w-full text-xs rounded-lg border border-green-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <Button size="sm" onClick={handleBroadcast} disabled={broadcasting || !customText.trim()} className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8">
            <Send className="w-3.5 h-3.5" />
            {broadcasting ? 'Подготовка...' : `Отправить ${recipients.length} получателям`}
          </Button>

          {/* WhatsApp links (user clicks each to open WA) */}
          {broadcastLinks && broadcastLinks.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Нажмите чтобы открыть WhatsApp:</p>
                <button onClick={() => setBroadcastLinks(null)} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {broadcastLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 hover:bg-green-50 transition"
                >
                  <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{link.name}</span>
                  <span className="text-xs text-slate-400 font-mono ml-auto">{link.phone}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Открыть →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-green-100 dark:border-slate-700 text-xs text-slate-500 space-y-0.5">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Когда приходят уведомления:</p>
        <p>• Товар достиг лимита «мало на складе»</p>
        <p>• Сводка по долгам (раз в день)</p>
        <p>• Оплата долга клиентом</p>
        <p>• Ручная рассылка любого сообщения</p>
      </div>
    </div>
  );
}