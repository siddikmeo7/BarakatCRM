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

export function sendEmail(to, subject, body) {
  if (!to) return false;
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject || 'Ваша покупка')}&body=${encodeURIComponent(body)}`;
  return openWindow(url);
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

export function notifyCustomerChannels({ customer, channels, message, emailSubject }) {
  const results = { whatsapp: false, telegram: false, email: false };
  if (!customer || !channels || !channels.length) return results;

  const waPhone = customer.use_phone_for_all ? customer.phone : (customer.whatsapp || customer.phone);
  const tgUser = customer.use_phone_for_all ? customer.phone : (customer.telegram || customer.phone);

  if (channels.includes('whatsapp') && waPhone) results.whatsapp = sendWhatsApp(waPhone, message);
  if (channels.includes('telegram') && tgUser) results.telegram = sendTelegram(tgUser, message);
  if (channels.includes('email') && customer.email) results.email = sendEmail(customer.email, emailSubject || 'Ваша покупка', message);
  return results;
}

export const NOTIFY_CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', color: 'green' },
  { key: 'telegram', label: 'Telegram', color: 'blue' },
  { key: 'email', label: 'Email', color: 'rose' }
];