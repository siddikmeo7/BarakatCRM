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
      product_name,
      total_debt,
      paid_amount,
      remaining_debt,
      business_name,
      type = 'reminder' // 'reminder' или 'payment'
    } = await req.json();

    if (!phone || !customer_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Формируем текст сообщения в зависимости от типа
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
      message += `💳 Общий долг: ${total_debt?.toLocaleString('ru-RU')} сомони\n`;
      if (remaining_debt > 0) {
        message += `⏳ Осталось: ${remaining_debt.toLocaleString('ru-RU')} сомони\n`;
      }
      message += `\nПожалуйста, выполните платёж в ближайшее время.`;
    }

    // Формируем WhatsApp URL для открытия чата
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    // Логируем отправку (опционально)
    console.log(`WhatsApp message prepared for ${customer_name} (${phone})`);

    return Response.json({
      success: true,
      message: 'Message prepared successfully',
      wa_url: waUrl,
      phone_number: cleanPhone
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send message' 
    }, { status: 500 });
  }
});