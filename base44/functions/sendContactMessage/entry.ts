import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Обращения с публичной страницы «Контакты».
// Получатели задаются на сервере (администраторы приложения) — посетитель
// не может указать, кому уйдёт письмо.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const name = (body?.name || '').toString().trim().slice(0, 100);
    const contact = (body?.contact || '').toString().trim().slice(0, 150);
    const message = (body?.message || '').toString().trim().slice(0, 1000);

    if (!name || !message) {
      return Response.json({ error: 'Укажите имя и сообщение' }, { status: 400 });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const recipients = (admins || []).filter(u => u?.email).slice(0, 5).map(u => u.email);
    if (recipients.length === 0) {
      return Response.json({ error: 'Получатель не настроен' }, { status: 500 });
    }

    const text = [
      'Новое сообщение со страницы «Контакты».',
      '',
      `Имя: ${name}`,
      `Контакт: ${contact || 'не указан'}`,
      '',
      message,
    ].join('\n');

    const results = await Promise.allSettled(
      recipients.map(to => base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject: `Сообщение с сайта BarakatCRM — ${name}`,
        body: text,
      }))
    );
    const delivered = results.filter(r => r.status === 'fulfilled').length;
    if (delivered === 0) {
      console.error('sendContactMessage: письмо не отправлено', results.map(r => r.reason?.message));
      return Response.json({ error: 'Не удалось отправить сообщение' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('sendContactMessage error:', error);
    return Response.json({ error: error.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}