import { base44 } from '@/api/base44Client';

// Бесплатный период по умолчанию (дней) — если тариф ещё не настроен
export const TRIAL_DAYS = 30;
export const PLAN_PRODUCT_ID = 'crm_monthly_subscription';
const DAY_MS = 24 * 60 * 60 * 1000;

// Когда заканчивается бесплатный месяц: дата задана вручную либо считается от даты создания бизнеса
export function getTrialEndsAt(business, fallbackDays = TRIAL_DAYS) {
  if (!business) return null;
  if (business.trial_ends_at) return new Date(business.trial_ends_at);
  if (business.created_date) return new Date(new Date(business.created_date).getTime() + fallbackDays * DAY_MS);
  return null;
}

export function daysLeftUntil(date) {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

// Состояние доступа бизнеса: admin | trial | active | exempt | expired | blocked
export function getSubscriptionState(business, { isPlatformAdmin = false, trialDays = TRIAL_DAYS } = {}) {
  if (isPlatformAdmin) {
    return { status: 'admin', label: 'Администратор системы', blocked: false, daysLeft: null, trialEndsAt: null };
  }
  if (!business) {
    return { status: 'trial', label: 'Пробный период', blocked: false, daysLeft: null, trialEndsAt: null };
  }

  const status = business.subscription_status || 'trial';
  const trialEndsAt = getTrialEndsAt(business, trialDays);
  const daysLeft = daysLeftUntil(trialEndsAt);

  if (status === 'exempt') {
    return { status, label: 'Бесплатный доступ', blocked: false, daysLeft: null, trialEndsAt };
  }
  if (status === 'blocked') {
    return { status, label: 'Доступ закрыт', blocked: true, daysLeft: null, trialEndsAt };
  }
  if (status === 'active') {
    return { status, label: 'Подписка активна', blocked: false, daysLeft: null, trialEndsAt };
  }
  if (status === 'expired' || (daysLeft !== null && daysLeft <= 0)) {
    return { status: 'expired', label: 'Пробный период закончился', blocked: true, daysLeft: 0, trialEndsAt };
  }
  return { status: 'trial', label: `Пробный период: ${daysLeft} дн.`, blocked: false, daysLeft, trialEndsAt };
}

// Активный тариф (цена, валюта, длительность пробного периода)
export async function loadPlan() {
  const res = await base44.entities.SubscriptionPlan.list();
  const list = Array.isArray(res) ? res : (res?.items ?? []);
  return list.find(p => p.is_active !== false) || list[0] || null;
}

export function formatPrice(plan) {
  if (!plan?.price) return '';
  return `${plan.price} ${plan.currency || ''}`.trim();
}

// Старт оплаты: сумму считает сервер, здесь только переход на страницу оплаты Base44 Payments
export async function startSubscriptionCheckout() {
  const res = await base44.functions.invoke('create-checkout', { productId: PLAN_PRODUCT_ID, quantity: 1 });
  const url = res?.data?.redirectUrl;
  if (!url) throw new Error(res?.data?.error || 'Не удалось начать оплату');
  window.location.href = url;
}

// Состояние доступа считает сервер: пробный период, оплаченный период,
// бесплатные исключения для пользователя или бизнеса.
export async function fetchAccessState(businessId) {
  const res = await base44.functions.invoke('checkSubscriptionAccess', businessId ? { business_id: businessId } : {});
  return res?.data || null;
}

export function providerLabel(access) {
  if (access?.exempt) return 'Бесплатный доступ';
  if (access?.provider === 'base44') return 'Base44 Payments';
  return '—';
}