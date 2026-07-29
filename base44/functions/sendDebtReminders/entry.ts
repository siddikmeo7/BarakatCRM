import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifyBusinessAccess } from '../../shared/businessAuth.ts';

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

async function sendTelegram(chatId, text) {
  if (!chatId || !botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json().catch(() => ({}));
    const { business_id } = payload;

    // Verify caller is owner or employee of this business
    const access = await verifyBusinessAccess(base44, business_id);
    if (!access.authorized) {
      return Response.json({ error: access.error }, { status: access.status });
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

    const results = [];

    // --- Send summary to owner & admins via Telegram ---
    const adminRecipients = [];
    if (business.owner_email) {
      adminRecipients.push({ email: business.owner_email, telegram: business.owner_telegram || null });
    }
    const employees = await base44.asServiceRole.entities.Employee.filter({ business_id, is_active: true });
    for (const emp of employees) {
      if (emp.is_admin && emp.user_email && emp.user_email !== business.owner_email) {
        adminRecipients.push({ email: emp.user_email, telegram: emp.telegram || null });
      }
    }

    const topDebtors = [...debtors].sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0)).slice(0, 15);
    const totalDebt = debtors.reduce((s, c) => s + (c.total_debt || 0), 0);
    const tgSummaryLines = topDebtors.map(c => `• *${c.name}* — ${Math.round(c.total_debt || 0).toLocaleString('ru-RU')} с.`);
    const tgSummary = `📋 *Сводка по долгам — ${business.name}*\n\n💳 Должников: *${debtors.length}*\n💰 Общий долг: *${Math.round(totalDebt).toLocaleString('ru-RU')} с.*\n\n${tgSummaryLines.join('\n')}${debtors.length > 15 ? `\n_...и ещё ${debtors.length - 15}_` : ''}`;

    for (const admin of adminRecipients) {
      if (admin.telegram) {
        await sendTelegram(admin.telegram, tgSummary);
      }
    }
    // --- End summary ---

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