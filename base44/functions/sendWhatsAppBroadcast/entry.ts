import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      business_id,
      message_type, // 'low_stock' | 'debt_summary' | 'custom'
      custom_text,
      // For low_stock
      low_stock_items, // [{brand, model, boxes_in_stock}]
      business_name,
      // For debt_summary
      debtors, // [{name, total_debt}]
      total_debt,
    } = await req.json();

    if (!business_id) return Response.json({ error: 'business_id required' }, { status: 400 });

    const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
    if (!businesses.length) return Response.json({ error: 'Business not found' }, { status: 404 });
    const business = businesses[0];

    const waRecipients = Array.isArray(business.whatsapp_recipients) ? business.whatsapp_recipients.filter(r => r.phone) : [];
    if (!waRecipients.length) return Response.json({ success: true, sent: 0, message: 'No WhatsApp recipients configured' });

    let message = '';

    if (message_type === 'low_stock') {
      const bName = business_name || business.name;
      message = `⚠️ *Мало товаров на складе!*\n\n🏢 ${bName}\n\n`;
      (low_stock_items || []).forEach(item => {
        const icon = (item.boxes_in_stock ?? 0) === 0 ? '🔴' : '🟠';
        message += `${icon} *${item.brand} ${item.model}* — ${item.boxes_in_stock} кор.\n`;
      });
      message += `\n🛒 Пора пополнить запасы!`;

    } else if (message_type === 'debt_summary') {
      const bName = business_name || business.name;
      message = `📋 *Сводка по долгам — ${bName}*\n\n`;
      message += `💳 Должников: *${(debtors || []).length}*\n`;
      message += `💰 Общий долг: *${Math.round(total_debt || 0).toLocaleString('ru-RU')} с.*\n\n`;
      const top = (debtors || []).slice(0, 10);
      top.forEach(d => {
        message += `• *${d.name}* — ${Math.round(d.total_debt || 0).toLocaleString('ru-RU')} с.\n`;
      });
      if ((debtors || []).length > 10) message += `_...и ещё ${debtors.length - 10}_\n`;

    } else if (message_type === 'custom') {
      message = custom_text || '';
    }

    if (!message.trim()) return Response.json({ error: 'Empty message' }, { status: 400 });

    // Build wa.me links for each recipient
    const links = waRecipients.map(r => {
      const cleanPhone = r.phone.replace(/[^0-9]/g, '');
      return {
        name: r.name,
        phone: cleanPhone,
        url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      };
    });

    return Response.json({ success: true, sent: links.length, links, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});