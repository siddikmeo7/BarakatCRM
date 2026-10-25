/**
 * Единый расчёт доступа к BarakatCRM: пробный период, оплаченный период,
 * бесплатные исключения (пользователю или бизнесу) и закрытие доступа.
 * Используется backend-функциями проверки доступа и оплаты.
 */
export const TRIAL_DAYS = 30;
export const PLAN_PRICE_DEFAULT = 100;
export const PLAN_CURRENCY_DEFAULT = "TJS";
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

export function resolveAppUrl(req) {
  const header = req?.headers?.get?.("x-base44-app-url");
  if (header) return String(header).replace(/\/+$/, "");
  return "";
}

/** Действующее бесплатное исключение для бизнеса или пользователя. */
export function findActiveGrant(grants, { businessId, userEmail, now = Date.now() }) {
  const email = String(userEmail || "").toLowerCase();
  return (grants || []).find((grant) => {
    if (grant.is_active === false) return false;
    if (grant.expires_at && new Date(grant.expires_at).getTime() < now) return false;
    if (grant.scope === "business") return !!businessId && grant.business_id === businessId;
    if (grant.scope === "user") return !!email && String(grant.user_email || "").toLowerCase() === email;
    return false;
  }) || null;
}

/** Пробный период: дата окончания из записи или 30 дней от создания бизнеса. */
export function trialEndsAt(business, days = TRIAL_DAYS) {
  if (!business) return null;
  if (business.trial_ends_at) return new Date(business.trial_ends_at);
  if (business.created_date) return addDays(business.created_date, days);
  return null;
}

/**
 * Итоговое состояние доступа бизнеса.
 * Возвращает: allowed, status, label, paidUntil, autoRenew, provider, exempt, trialEndsAt.
 */
export function computeAccess({ business, subscription, grant, isPlatformAdmin = false, now = Date.now() }) {
  if (isPlatformAdmin) {
    return {
      allowed: true, status: "admin", label: "Администратор системы",
      paidUntil: null, autoRenew: false, provider: "manual", exempt: false, trialEndsAt: null,
    };
  }

  const provider = subscription?.provider || "base44";
  const autoRenew = !!subscription?.auto_renew;
  const paidUntil = subscription?.paid_until ? new Date(subscription.paid_until) : null;
  const trialEnd = trialEndsAt(business, subscription?.trial_days || TRIAL_DAYS);

  if (!business) {
    return {
      allowed: true, status: "no_business", label: "Бизнес не выбран",
      paidUntil, autoRenew, provider, exempt: false, trialEndsAt: trialEnd,
    };
  }

  // Бесплатный доступ по решению администратора — важнее статуса оплаты
  if (grant) {
    return {
      allowed: true, status: "exempt", label: "Бесплатный доступ",
      paidUntil, autoRenew, provider: "manual", exempt: true,
      exemptReason: grant.reason || "", exemptUntil: grant.expires_at || null,
      trialEndsAt: trialEnd,
    };
  }

  const status = business.subscription_status || "trial";

  if (status === "blocked") {
    return {
      allowed: false, status: "blocked", label: "Доступ закрыт",
      paidUntil, autoRenew, provider, exempt: false, trialEndsAt: trialEnd,
    };
  }

  if (status === "exempt") {
    return {
      allowed: true, status: "exempt", label: "Бесплатный доступ",
      paidUntil, autoRenew, provider: "manual", exempt: true,
      exemptReason: business.subscription_note || "", exemptUntil: null, trialEndsAt: trialEnd,
    };
  }

  if (status === "active") {
    const stillPaid = !paidUntil || paidUntil.getTime() > now;
    return {
      allowed: stillPaid,
      status: stillPaid ? "active" : "expired",
      label: stillPaid ? "Подписка активна" : "Оплаченный период закончился",
      paidUntil, autoRenew, provider, exempt: false, trialEndsAt: trialEnd,
    };
  }

  if (status === "expired") {
    return {
      allowed: false, status: "expired", label: "Подписка не оплачена",
      paidUntil, autoRenew, provider, exempt: false, trialEndsAt: trialEnd,
    };
  }

  // Пробный период
  const trialValid = !trialEnd || trialEnd.getTime() > now;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now) / DAY_MS)) : null;
  return {
    allowed: trialValid,
    status: trialValid ? "trial" : "expired",
    label: trialValid ? `Пробный период: ${daysLeft} дн.` : "Пробный период закончился",
    paidUntil, autoRenew, provider, exempt: false, trialEndsAt: trialEnd, daysLeft,
  };
}

export function periodKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}