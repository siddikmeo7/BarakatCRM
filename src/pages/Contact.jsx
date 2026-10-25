import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PublicPageShell from '@/components/public/PublicPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError('Укажите имя и сообщение.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendContactMessage', {
        name: form.name.trim(),
        contact: form.contact.trim(),
        message: form.message.trim(),
      });
      if (res.data?.ok) {
        setSent(true);
      } else {
        setError(res.data?.error || 'Не удалось отправить сообщение. Попробуйте ещё раз.');
      }
    } catch (_) {
      setError('Не удалось отправить сообщение. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicPageShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10 lg:py-14">
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Контакты</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Есть вопрос по системе, подключению бизнеса или подписке? Напишите нам — ответим на
          указанный контакт.
        </p>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Сообщение отправлено</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Спасибо! Мы свяжемся с вами по указанному контакту.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 space-y-4">
            <div>
              <Label htmlFor="contact-name">Ваше имя</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={update('name')}
                placeholder="Как к вам обращаться"
                maxLength={100}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="contact-channel">Телефон, WhatsApp, Telegram или email</Label>
              <Input
                id="contact-channel"
                value={form.contact}
                onChange={update('contact')}
                placeholder="Чтобы мы могли ответить"
                maxLength={150}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="contact-message">Сообщение</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={update('message')}
                placeholder="Опишите ваш вопрос или задачу"
                rows={5}
                maxLength={1000}
                className="mt-1.5"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Отправляем...' : 'Отправить сообщение'}
            </Button>
          </form>
        )}

        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Если у вас уже есть доступ к системе, вопрос можно задать и внутри — через раздел
          «AI-помощник» или обратившись к администратору вашего бизнеса.
        </p>
      </div>
    </PublicPageShell>
  );
}