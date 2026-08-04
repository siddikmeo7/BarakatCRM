import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { to, subject, text, businessName } = body || {};
    if (!to) return Response.json({ error: 'Не указан адрес получателя (to)' }, { status: 400 });
    if (!subject || !text) return Response.json({ error: 'Не указана тема или текст письма' }, { status: 400 });

    const apiKey = secrets.get('RESEND_API_KEY');
    if (!apiKey) return Response.json({ error: 'RESEND_API_KEY не настроен' }, { status: 500 });

    // Тестовый адрес Resend отправляет только на email владельца аккаунта Resend.
    // Для отправки реальным клиентам подключите свой проверенный домен в Resend
    // и замените этот адрес.
    const fromEmail = 'onboarding@resend.dev';
    const fromName = businessName || user.full_name || 'BarakatCRM';
    const from = `${fromName} <${fromEmail}>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, text })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return Response.json({ error: data?.message || 'Ошибка Resend API', details: data }, { status: resp.status });
    }
    return Response.json({ ok: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}