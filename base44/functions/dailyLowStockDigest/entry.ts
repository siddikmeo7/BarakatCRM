import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active businesses
    const businesses = await base44.asServiceRole.entities.Business.filter({});

    const results = [];

    for (const business of businesses) {
      const limit = business.low_stock_limit ?? 2;
      const businessId = business.id;

      // Get all products for this business
      const products = await base44.asServiceRole.entities.Product.filter({ business_id: businessId });

      // Filter low stock products
      const lowStockProducts = products.filter(p => (p.boxes_in_stock ?? 0) <= limit);

      if (lowStockProducts.length === 0) {
        results.push({ business: business.name, skipped: true, reason: 'no low stock products' });
        continue;
      }

      // Build recipients: owner + admin employees
      const recipients = [];
      if (business.owner_email) {
        recipients.push(business.owner_email);
      }

      const employees = await base44.asServiceRole.entities.Employee.filter({ business_id: businessId, is_active: true });
      for (const emp of employees) {
        if (emp.is_admin && emp.user_email && emp.user_email !== business.owner_email) {
          recipients.push(emp.user_email);
        }
      }

      if (recipients.length === 0) {
        results.push({ business: business.name, skipped: true, reason: 'no recipients' });
        continue;
      }

      // Build email body
      const tableRows = lowStockProducts
        .sort((a, b) => (a.boxes_in_stock ?? 0) - (b.boxes_in_stock ?? 0))
        .map(p => {
          const name = `${p.brand || ''} ${p.model || ''}`.trim();
          const boxes = p.boxes_in_stock ?? 0;
          const color = boxes === 0 ? '#dc2626' : '#ea580c';
          return `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${name}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${p.product_type || '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${color};">${boxes} кор.</td>
            </tr>
          `;
        }).join('');

      const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#ef4444,#f97316);color:white;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">⚠️ Сводка: Мало товаров на складе</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Бизнес: <strong>${business.name}</strong></p>
            <p style="margin:2px 0 0;font-size:12px;opacity:0.75;">${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px;">
            <p style="color:#475569;margin:0 0 16px;">Следующие товары достигли или ниже лимита <strong>${limit} кор.</strong>. Необходимо пополнить запас:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Товар</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Тип</th>
                  <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Остаток</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Лимит «мало на складе»: ${limit} коробок. Это ежедневное автоматическое уведомление от BarakatCRM.</p>
          </div>
        </div>
      `.trim();

      // Send to all recipients
      for (const email of recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `⚠️ ${lowStockProducts.length} товаров заканчиваются — ${business.name}`,
            body: emailBody,
          });
        } catch (e) {
          console.error(`Email to ${email} failed:`, e.message);
        }
      }

      results.push({
        business: business.name,
        low_stock_count: lowStockProducts.length,
        recipients: recipients.length,
        sent: true,
      });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('dailyLowStockDigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});