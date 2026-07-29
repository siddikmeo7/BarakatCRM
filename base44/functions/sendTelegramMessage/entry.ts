import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { verifyBusinessAccess } from '../../shared/businessAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      business_id,
      telegram_id,
      customer_name,
      product_name,
      paid_amount,
      remaining_debt,
      business_name,
      type = 'payment' // 'payment' или 'reminder'
    } = await req.json();

    if (!business_id) {
      return Response.json({ error: 'Missing business_id' }, { status: 400 });
    }

    if (!telegram_id) {
      return Response.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    // Verify the caller owns or is employed by this business
    const access = await verifyBusinessAccess(base44, business_id);
    if (!access.authorized) {
      return Response.json({ error: access.error }, { status: access.status });
    }

    // Verify the telegram_id belongs to a customer (or admin employee) of this business
    const customers = await base44.asServiceRole.entities.Customer.filter({ business_id });
    const matchingCustomer = customers.find(
      (c: any) => c.telegram && c.telegram.toString().trim() === telegram_id.toString().trim()
    );

    if (!matchingCustomer) {
      // Also check if it's an admin employee's telegram
      const employees = await base44.asServiceRole.entities.Employee.filter({ business_id, is_active: true });
      const matchingEmp = employees.find(
        (e: any) => e.telegram && e.telegram.toString().trim() === telegram_id.toString().trim()
      );
      if (!matchingEmp || !matchingEmp.is_admin) {
        return Response.json({ error: 'Telegram ID does not belong to a customer or admin of this business' }, { status: 403 });
      }
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return Response.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    // Формируем текст сообщения
    let message = '';
    if (type === 'payment') {
      message = `👋 Здравствуйте, ${customer_name}!\n\n`;
      message += `✅ Спасибо за оплату!\n\n`;
      message += `💼 Бизнес: ${business_name || 'Наша компания'}\n`;
      if (product_name) message += `📦 Товар: ${product_name}\n`;
      message += `💰 Оплачено: ${paid_amount?.toLocaleString('ru-RU')} сомони\n`;
      if (remaining_debt > 0) {
        message += `⏳ Остаток: ${remaining_debt.toLocaleString('ru-RU')} сомони\n`;
      } else {
        message += `🎉 Долг полностью погашен!\n`;
      }
      message += `\nСпасибо за доверие!`;
    } else {
      // type === 'reminder'
      message = `👋 Здравствуйте, ${customer_name}!\n\n`;
      message += `📌 Напоминание о задолженности\n\n`;
      message += `💼 Бизнес: ${business_name || 'Наша компания'}\n`;
      if (product_name) message += `📦 Товар: ${product_name}\n`;
      message += `💳 Задолженность: ${remaining_debt?.toLocaleString('ru-RU')} сомони\n`;
      message += `\nПожалуйста, выполните платёж в ближайшее время.`;
    }

    // Отправляем сообщение через Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_id,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', result);
      return Response.json({ 
        error: result.description || 'Failed to send Telegram message',
        details: result
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Message sent to Telegram successfully',
      telegram_message_id: result.result.message_id
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send message' 
    }, { status: 500 });
  }
});