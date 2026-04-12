import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json().catch(() => ({}));
    const { business_id } = payload;

    if (!business_id) {
      return Response.json({ error: 'business_id required' }, { status: 400 });
    }

    // Get business
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
    if (!businesses.length) return Response.json({ error: 'business not found' }, { status: 404 });
    const business = businesses[0];

    // Get customers with debt
    const customers = await base44.asServiceRole.entities.Customer.filter({ business_id });
    const debtors = customers.filter(c => (c.total_debt || 0) > 0);

    if (!debtors.length) {
      return Response.json({ success: true, sent: 0, message: 'No debtors found' });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const results = [];

    for (const customer of debtors) {
      const debt = customer.total_debt || 0;

      // Send email if email available
      if (customer.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customer.email,
            subject: `📌 Напоминание о задолженности — ${business.name}`,
            body: `
<h2>📌 Напоминание о задолженности</h2>
<p>Здравствуйте, <strong>${customer.name}</strong>!</p>
<p><strong>Бизнес:</strong> ${business.name}</p>
<p><strong>Ваша задолженность:</strong> <strong style="color:red">${debt.toLocaleString('ru-RU')} сомони</strong></p>
<p>Пожалуйста, произведите оплату в ближайшее время.</p>
<p>Спасибо за сотрудничество!</p>
<hr>
<small>Это автоматическое напоминание от BarakatCRM</small>
            `.trim()
          });
          results.push({ customer: customer.name, email: customer.email, email_sent: true });
        } catch (e) {
          results.push({ customer: customer.name, email: customer.email, email_sent: false, error: e.message });
        }
      }

      // Send Telegram if telegram username/id available
      const telegramId = customer.telegram;
      if (telegramId && botToken) {
        try {
          const msg = `👋 Здравствуйте, ${customer.name}!\n\n📌 *Напоминание о задолженности*\n\n💼 Бизнес: ${business.name}\n💳 Задолженность: *${debt.toLocaleString('ru-RU')} сомони*\n\nПожалуйста, выполните платёж в ближайшее время.\n\nСпасибо за сотрудничество!`;
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramId, text: msg, parse_mode: 'Markdown' })
          });
          const tgData = await tgRes.json();
          results.push({ customer: customer.name, telegram: telegramId, tg_sent: tgData.ok });
        } catch (e) {
          results.push({ customer: customer.name, telegram: telegramId, tg_sent: false, error: e.message });
        }
      }
    }

    return Response.json({
      success: true,
      debtors: debtors.length,
      sent: results.filter(r => r.email_sent || r.tg_sent).length,
      results
    });
  } catch (error) {
    console.error('sendDebtReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});