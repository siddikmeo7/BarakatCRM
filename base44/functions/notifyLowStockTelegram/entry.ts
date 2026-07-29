import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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
      telegram_chat_id,
      business_name,
      low_stock_items, // array of { brand, model, boxes_in_stock }
      type = 'low_stock' // 'low_stock' | 'debt_reminder_owner'
    } = await req.json();

    if (!business_id) {
      return Response.json({ error: 'Missing business_id' }, { status: 400 });
    }

    if (!telegram_chat_id) {
      return Response.json({ error: 'Missing telegram_chat_id' }, { status: 400 });
    }

    // Verify the caller owns or is employed by this business
    const access = await verifyBusinessAccess(base44, business_id);
    if (!access.authorized) {
      return Response.json({ error: access.error }, { status: access.status });
    }

    // Verify the telegram_chat_id belongs to a configured recipient of this business
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
    if (!businesses.length) {
      return Response.json({ error: 'Business not found' }, { status: 404 });
    }
    const business = businesses[0];

    const configuredChatIds = Array.isArray(business.telegram_recipients)
      ? business.telegram_recipients.map(r => r.chat_id?.toString().trim()).filter(Boolean)
      : [];
    if (business.telegram_chat_id) {
      configuredChatIds.push(business.telegram_chat_id.toString().trim());
    }

    if (!configuredChatIds.includes(telegram_chat_id.toString().trim())) {
      return Response.json({ error: 'Telegram chat_id is not a configured recipient for this business' }, { status: 403 });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return Response.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const bName = business_name || business.name;
    let message = '';

    if (type === 'low_stock') {
      message = `⚠️ <b>${bName}</b> — Мало товаров на складе!\n\n`;
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