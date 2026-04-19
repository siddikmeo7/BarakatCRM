import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      telegram_chat_id,
      business_name,
      low_stock_items, // array of { brand, model, boxes_in_stock }
      type = 'low_stock' // 'low_stock' | 'debt_reminder_owner'
    } = await req.json();

    if (!telegram_chat_id) {
      return Response.json({ error: 'Missing telegram_chat_id' }, { status: 400 });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return Response.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    let message = '';

    if (type === 'low_stock') {
      message = `⚠️ <b>${business_name || 'Ваш бизнес'}</b> — Мало товаров на складе!\n\n`;
      message += `📦 Следующие товары заканчиваются:\n\n`;
      (low_stock_items || []).forEach(item => {
        message += `• <b>${item.brand} ${item.model}</b> — ${item.boxes_in_stock} кор.\n`;
      });
      message += `\n🛒 Пора пополнить запасы!`;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({
        error: result.description || 'Failed to send Telegram message',
        details: result
      }, { status: 500 });
    }

    return Response.json({ success: true, message_id: result.result?.message_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});