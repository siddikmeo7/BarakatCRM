import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, customer_name, remaining_debt, business_name, type, product_name, total_debt, paid_amount, sale_id } = await req.json();

    if (!phone) return Response.json({ error: 'No phone number' }, { status: 400 });

    // Очищаем номер и добавляем код страны если нет
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    // Если номер начинается с 0, добавляем 992 (Таджикистан)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '992' + cleanPhone.slice(1);
    }
    // Если номер без международного кода (меньше 11 цифр), добавляем 992
    if (cleanPhone.length <= 9) {
      cleanPhone = '992' + cleanPhone;
    }

    const debtAmount = Number(remaining_debt) || 0;
    const bizName = business_name || 'Магазин';

    let message = '';
    if (type === 'new_debt') {
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `${bizName} хабар медиҳад:\n` +
        `Шумо қарздор шудед.\n` +
        `Қарзи умумии шумо: *${debtAmount.toLocaleString()} с.*\n\n` +
        `Барои саволҳо бо мо тамос гиред. Раҳмат! 🙏`;
    } else if (type === 'payment') {
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `${bizName} хабар медиҳад:\n` +
        `Пардохти шумо қабул шуд ✅\n` +
        `Боқимондаи қарз: *${debtAmount.toLocaleString()} с.*\n\n` +
        (debtAmount <= 0 ? `Қарзи шумо пурра адо шуд! Ташаккур! 🎉` : `Ташаккур барои пардохт! 🙏`);
    } else {
      // reminder
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `${bizName} ёдоварӣ мекунад:\n` +
        `Қарзи умумии шумо: *${debtAmount.toLocaleString()} с.*\n\n` +
        `Лутфан қарзи худро адо кунед. Раҳмат! 🙏`;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return Response.json({ success: true, wa_url: waUrl, message, phone_used: cleanPhone });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});