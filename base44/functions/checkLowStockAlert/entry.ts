import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    const { event, data } = payload;

    // Only react to product updates
    if (!data || data.boxes_in_stock === undefined) {
      return Response.json({ skipped: true, reason: 'no boxes_in_stock field' });
    }

    const product = data;
    const businessId = product.business_id;
    if (!businessId) {
      return Response.json({ skipped: true, reason: 'no business_id' });
    }

    // Load business to get low_stock_limit, owner_email, name
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: businessId });
    if (!businesses.length) {
      return Response.json({ skipped: true, reason: 'business not found' });
    }
    const business = businesses[0];
    const limit = business.low_stock_limit ?? 2;

    // Check if stock is at or below limit
    if (product.boxes_in_stock > limit) {
      return Response.json({ skipped: true, reason: 'stock above limit' });
    }

    // Deduplicate: skip if we already notified for this product at this stock level recently
    // We use a simple check: only notify if this is exactly at the limit or just crossed it
    // (i.e. boxes_in_stock <= limit)

    const productName = `${product.brand || ''} ${product.model || ''}`.trim() || 'Товар';
    const stockCount = product.boxes_in_stock;

    // Build notification recipients: owner + admin employees
    const recipients = [];

    // Owner
    if (business.owner_email) {
      recipients.push({ email: business.owner_email, telegram: business.owner_telegram || null });
    }

    // Admin employees
    const employees = await base44.asServiceRole.entities.Employee.filter({ business_id: businessId, is_active: true });
    for (const emp of employees) {
      if (emp.is_admin && emp.user_email && emp.user_email !== business.owner_email) {
        recipients.push({ email: emp.user_email, telegram: emp.telegram || null });
      }
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const results = [];

    for (const recipient of recipients) {
      // Send email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient.email,
          subject: `⚠️ Мало товара на складе — ${productName}`,
          body: `
<h2>⚠️ Уведомление: Мало товара на складе</h2>
<p><strong>Бизнес:</strong> ${business.name}</p>
<p><strong>Товар:</strong> ${productName}</p>
<p><strong>Остаток:</strong> <strong style="color:red">${stockCount} кор.</strong></p>
<p><strong>Лимит:</strong> ${limit} кор.</p>
<p>Пожалуйста, пополните запас как можно скорее.</p>
<hr>
<small>Это автоматическое уведомление от BarakatCRM</small>
          `.trim()
        });
        results.push({ email: recipient.email, email_sent: true });
      } catch (e) {
        results.push({ email: recipient.email, email_sent: false, email_error: e.message });
      }

    }

    // Send Telegram to all configured telegram_recipients
    const tgRecipients = Array.isArray(business.telegram_recipients) && business.telegram_recipients.length > 0
      ? business.telegram_recipients
      : (business.telegram_chat_id ? [{ name: 'Владелец', chat_id: business.telegram_chat_id }] : []);

    if (botToken) {
      const msg = `⚠️ *Мало товара на складе!*\n\n🏢 Бизнес: ${business.name}\n📦 Товар: ${productName}\n🔴 Остаток: *${stockCount} кор.* (лимит: ${limit})\n\nПожалуйста, пополните запас!`;
      for (const tgr of tgRecipients) {
        if (!tgr.chat_id) continue;
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tgr.chat_id, text: msg, parse_mode: 'Markdown' })
          });
          const tgData = await tgRes.json();
          results.push({ telegram: tgr.chat_id, name: tgr.name, tg_sent: tgData.ok });
        } catch (e) {
          results.push({ telegram: tgr.chat_id, tg_sent: false, tg_error: e.message });
        }
      }
    }

    return Response.json({ success: true, product: productName, stock: stockCount, limit, notified: recipients.length, results });
  } catch (error) {
    console.error('checkLowStockAlert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});