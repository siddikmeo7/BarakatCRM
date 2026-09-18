// Общий помощник отправки уведомлений клиенту о покупке (WhatsApp / Email / Telegram)
// WhatsApp и Email открывают готовое сообщение (wa.me / mailto), Telegram открывает чат.

export function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

export function buildSaleMessage({
  customerName,
  businessName,
  items,          // [{name, boxes, total}]
  totalAmount,
  paidAmount,
  remainingDebt,
  dueDate,
  isDebt
}) {
  let msg = `Здравствуйте, ${customerName}!\n\n`;
  msg += `🧾 Покупка в «${businessName || 'нашем магазине'}»\n\n`;
  if (items && items.length) {
    msg += `🛍️ Товары:\n`;
    items.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}`;
      if (p.boxes) msg += ` — ${p.boxes} кор.`;
      msg += ` — ${Number(p.total || 0).toLocaleString('ru-RU')} с.\n`;
    });
  }
  msg += `\n💳 Итого: ${Number(totalAmount || 0).toLocaleString('ru-RU')} с.\n`;
  if (paidAmount > 0) msg += `✅ Оплачено: ${Number(paidAmount).toLocaleString('ru-RU')} с.\n`;
  if (isDebt && remainingDebt > 0) msg += `🔴 Остаток долга: ${Number(remainingDebt).toLocaleString('ru-RU')} с.\n`;
  if (dueDate) msg += `📅 Срок оплаты: ${dueDate}\n`;
  msg += `\nСпасибо за покупку!`;
  return msg;
}

function openWindow(url) {
  try { window.open(url, '_blank'); return true; } catch (_) { return false; }
}

export function sendWhatsApp(phone, message) {
  const p = normalizePhone(phone);
  if (!p) return false;
  return openWindow(`https://wa.me/${p}?text=${encodeURIComponent(message)}`);
}

export async function sendEmail(to, subject, body, businessName) {
  if (!to) return false;
  try {
    const { base44 } = await import('@/api/base44Client');
    const res = await base44.functions.invoke('sendCustomerEmail', { to, subject, text: body, businessName });
    return res?.data?.ok === true;
  } catch (e) {
    console.error('sendEmail error:', e);
    return false;
  }
}

export function sendTelegram(username, message) {
  // Telegram не поддерживает предзаполненное сообщение в личный чат по ссылке.
  // Открываем чат по @username (если есть), иначе номер не сработает.
  let u = String(username || '').trim().replace(/^@/, '');
  if (!u) return false;
  // Если значение — телефон (только цифры), t.me не сработает; пропускаем.
  if (/^\d+$/.test(u)) return false;
  return openWindow(`https://t.me/${u}`);
}

export function buildPaymentMessage({
  customerName,
  businessName,
  productName,
  paidAmount,
  remainingDebt,
  isFullPayment
}) {
  let msg = `Здравствуйте, ${customerName}!\n\n`;
  msg += `✅ Спасибо за оплату!\n\n`;
  msg += `💼 ${businessName || 'наш магазин'}\n`;
  if (productName) msg += `📦 ${productName}\n`;
  msg += `💰 Оплачено: ${Number(paidAmount || 0).toLocaleString('ru-RU')} с.\n`;
  if (remainingDebt > 0) {
    msg += `⏳ Остаток долга: ${Number(remainingDebt).toLocaleString('ru-RU')} с.\n`;
  } else {
    msg += `🎉 Долг полностью погашен!\n`;
  }
  msg += `\nСпасибо!`;
  return msg;
}

// Детальное сообщение при погашении долга: сколько заплатил, дата/время, срок,
// оплаченные товары, оставшиеся товары и остаток долга.
export function buildDetailedPaymentMessage({
  customerName,
  businessName,
  now,
  paidAmount,
  paidItems,        // [{name, boxes, amount}]
  remainingItems,   // [{name, boxes, remaining, dueDate}]
  remainingDebt,
  nearestDueDate
}) {
  let msg = `Здравствуйте, ${customerName}!\n\n`;
  msg += `✅ Поступила оплата по долгу\n`;
  msg += `🕐 ${fmtDateTime(now || new Date())}\n`;
  msg += `💼 ${businessName || 'наш магазин'}\n`;
  msg += `💰 Оплачено: ${Number(paidAmount || 0).toLocaleString('ru-RU')} с.\n`;

  if (paidItems && paidItems.length) {
    msg += `\n🛍️ Оплаченные товары:\n`;
    paidItems.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}`;
      if (p.boxes) msg += ` — ${p.boxes} кор.`;
      if (p.amount != null) msg += ` — ${Number(p.amount).toLocaleString('ru-RU')} с.`;
      msg += `\n`;
    });
  }

  if (remainingItems && remainingItems.length) {
    msg += `\n⏳ Оставшиеся товары (ещё должен):\n`;
    remainingItems.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}`;
      if (p.boxes) msg += ` — ${p.boxes} кор.`;
      if (p.remaining != null) msg += ` — ${Number(p.remaining).toLocaleString('ru-RU')} с.`;
      if (p.dueDate) msg += ` (до ${p.dueDate})`;
      msg += `\n`;
    });
  }

  if (remainingDebt > 0) {
    msg += `\n🔴 Остаток долга: ${Number(remainingDebt).toLocaleString('ru-RU')} с.\n`;
    if (nearestDueDate) msg += `📅 Срок оплаты оставшегося долга: ${nearestDueDate}\n`;
  } else {
    msg += `\n🎉 Долг полностью погашен!\n`;
  }
  msg += `\nСпасибо!`;
  return msg;
}

// Форматирование даты/времени без зависимостей
function fmtDateTime(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Полное сообщение-напоминание о долге со всеми данными
export function buildDebtReminderMessage({
  customerName,
  businessName,
  items,          // [{name, boxes, total, dueDate}]
  totalAmount,
  paidAmount,
  remainingDebt,
  debtLimit,
  nearestDueDate,
  now
}) {
  let msg = `Здравствуйте, ${customerName}!\n\n`;
  msg += `📌 Напоминание о задолженности\n`;
  msg += `🕐 ${fmtDateTime(now || new Date())}\n`;
  msg += `💼 ${businessName || 'наш магазин'}\n`;
  if (items && items.length) {
    msg += `\n🛍️ Приобретённые товары:\n`;
    items.forEach((p, i) => {
      msg += `${i + 1}. ${p.name}`;
      if (p.boxes) msg += ` — ${p.boxes} кор.`;
      msg += ` — ${Number(p.total || 0).toLocaleString('ru-RU')} с.\n`;
    });
  }
  msg += `\n💳 Общая сумма: ${Number(totalAmount || 0).toLocaleString('ru-RU')} с.\n`;
  msg += `✅ Оплачено: ${Number(paidAmount || 0).toLocaleString('ru-RU')} с.\n`;
  msg += `🔴 Остаток долга: ${Number(remainingDebt || 0).toLocaleString('ru-RU')} с.\n`;
  if (debtLimit != null && Number(debtLimit) > 0) {
    msg += `📊 Лимит долга: ${Number(debtLimit).toLocaleString('ru-RU')} с.\n`;
  }
  if (nearestDueDate) {
    msg += `📅 Срок оплаты: ${nearestDueDate}\n`;
  }
  msg += `\nПожалуйста, погасите долг в ближайшее время. Спасибо!`;
  return msg;
}

// Собирает все данные по клиенту (продажи + оплаты + товары) и формирует полное сообщение
export function buildCustomerDebtReminder({ customer, sales, products, payments, businessName }) {
  const customerSales = (sales || []).filter(s => s.customer_id === customer.id && !s.is_cancelled);
  const items = customerSales.map(s => {
    const prod = (products || []).find(p => p.id === s.product_id);
    const name = s.product_id === 'manual'
      ? 'Товары не указаны (долг без товара)'
      : (prod ? `${prod.brand} ${prod.model}` : 'Товар удалён');
    return { name, boxes: s.boxes_sold || 0, total: s.total_amount || 0, dueDate: s.payment_due_date };
  });
  const totalAmount = customerSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const paidAmount = customerSales.reduce((sum, s) => {
    const paid = (payments || []).filter(p => p.sale_id === s.id).reduce((a, p) => a + (p.amount || 0), 0);
    return sum + paid;
  }, 0);
  const remainingDebt = Math.max(0, totalAmount - paidAmount);
  // Ближайшая (самая ранняя непросроченная или вообще ближайшая) дата оплаты
  const dueDates = customerSales
    .map(s => s.payment_due_date)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
  const nearestDueDate = dueDates[0] ? fmtDate(dueDates[0]) : '';
  return buildDebtReminderMessage({
    customerName: customer.name,
    businessName,
    items,
    totalAmount,
    paidAmount,
    remainingDebt,
    debtLimit: customer.debt_limit,
    nearestDueDate
  });
}

export async function notifyCustomerChannels({ customer, channels, message, emailSubject, businessName }) {
  const results = { whatsapp: false, telegram: false, email: false };
  if (!customer || !channels || !channels.length) return results;

  const waPhone = customer.use_phone_for_all ? customer.phone : (customer.whatsapp || customer.phone);
  const tgUser = customer.use_phone_for_all ? customer.phone : (customer.telegram || customer.phone);

  if (channels.includes('whatsapp') && waPhone) results.whatsapp = sendWhatsApp(waPhone, message);
  if (channels.includes('telegram') && tgUser) results.telegram = sendTelegram(tgUser, message);
  if (channels.includes('email') && customer.email) {
    results.email = await sendEmail(customer.email, emailSubject || 'Ваша покупка', message, businessName);
  }
  return results;
}

export const NOTIFY_CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', color: 'green' },
  { key: 'telegram', label: 'Telegram', color: 'blue' },
  { key: 'email', label: 'Email', color: 'rose' }
];