import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, customer_name, remaining_debt, business_name, type } = await req.json();

    if (!phone) return Response.json({ error: 'No phone number' }, { status: 400 });

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    let message = '';
    if (type === 'new_debt') {
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `Магазин ${business_name || 'ShoeWholesale'} хабар беради:\n` +
        `Шумо қарздор шудед. Қарзи умумии шумо: *${remaining_debt.toLocaleString()} с.*\n\n` +
        `Саволҳо дошта бошед, бо мо тамос гиред. Раҳмат! 🙏`;
    } else if (type === 'payment') {
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `Магазин ${business_name || 'ShoeWholesale'} хабар беради:\n` +
        `Пардохти шумо қабул шуд ✅\n` +
        `Боқимонда қарз: *${remaining_debt.toLocaleString()} с.*\n\n` +
        (remaining_debt <= 0 ? `Қарзи шумо пурра адо шуд! Ташаккур! 🎉` : `Ташаккур барои пардохт! 🙏`);
    } else if (type === 'reminder') {
      message = `Ассалому алайкум, ${customer_name}! 👋\n\n` +
        `Магазин ${business_name || 'ShoeWholesale'} ёдоварӣ мекунад:\n` +
        `Қарзи умумии шумо: *${remaining_debt.toLocaleString()} с.*\n\n` +
        `Лутфан қарзатонро адо кунед. Раҳмат! 🙏`;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return Response.json({ success: true, wa_url: waUrl, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});