import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      phone,
      customer_name,
      product_name,       // string (старый формат)
      products,           // array [{name, boxes, total, paid, remaining}] (новый формат)
      total_debt,
      paid_amount,
      remaining_debt,
      business_name,
      payment_due_date,   // опционально — дата срока оплаты
      type = 'reminder'   // 'reminder', 'payment', 'new_debt'
    } = await req.json();

    if (!phone || !customer_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let message = '';

    if (type === 'payment') {
      message = `👋 Здравствуйте, ${customer_name}!\n\n`;
      message += `✅ Спасибо за оплату!\n\n`;
      message += `💼 ${business_name || 'Наша компания'}\n`;
      if (product_name) message += `📦 Товар: ${product_name}\n`;
      message += `💰 Оплачено: ${Number(paid_amount).toLocaleString('ru-RU')} сомони\n`;
      if (remaining_debt > 0) {
        message += `⏳ Остаток долга: ${Number(remaining_debt).toLocaleString('ru-RU')} сомони\n`;
      } else {
        message += `🎉 Долг полностью погашен!\n`;
      }
      message += `\nСпасибо за доверие!`;

    } else if (type === 'new_debt') {
      message = `👋 Здравствуйте, ${customer_name}!\n\n`;
      message += `📋 Новая покупка в долг\n`;
      message += `💼 ${business_name || 'Наша компания'}\n\n`;

      // Если передан массив товаров — показываем каждый
      if (products && Array.isArray(products) && products.length > 0) {
        message += `🛍️ Товары:\n`;
        products.forEach((p, i) => {
          message += `\n${i + 1}. ${p.name}`;
          if (p.boxes) message += ` (${p.boxes} кор.)`;
          message += `\n   💵 Сумма: ${Number(p.total).toLocaleString('ru-RU')} с.`;
          if (p.paid > 0) message += `\n   ✅ Оплачено: ${Number(p.paid).toLocaleString('ru-RU')} с.`;
          if (p.remaining > 0) message += `\n   🔴 Остаток: ${Number(p.remaining).toLocaleString('ru-RU')} с.`;
        });
        message += `\n`;
      } else if (product_name) {
        message += `📦 ${product_name}\n`;
      }

      message += `\n💳 Итого к оплате: ${Number(remaining_debt).toLocaleString('ru-RU')} сомони`;
      if (paid_amount > 0) message += `\n✅ Внесено сразу: ${Number(paid_amount).toLocaleString('ru-RU')} сомони`;

      if (payment_due_date) {
        message += `\n📅 Срок оплаты: ${payment_due_date}`;
      }
      message += `\n\nПожалуйста, оплатите в срок. Спасибо!`;

    } else {
      // reminder
      message = `👋 Здравствуйте, ${customer_name}!\n\n`;
      message += `📌 Напоминание о задолженности\n`;
      message += `💼 ${business_name || 'Наша компания'}\n`;
      if (product_name) message += `📦 ${product_name}\n`;
      message += `💳 Долг: ${Number(total_debt || remaining_debt).toLocaleString('ru-RU')} сомони\n`;
      if (payment_due_date) {
        message += `📅 Срок оплаты: ${payment_due_date}\n`;
      }
      message += `\nПожалуйста, выполните платёж в ближайшее время.`;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return Response.json({ success: true, wa_url: waUrl, phone_number: cleanPhone });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
});