/**
 * Клиент эквайринга Alif Bank (официальная документация: docs.acquiring.alif.tj).
 *
 * Подпись запроса — двухэтапный HMAC SHA256 (как в официальных примерах банка):
 *   1) hashedPassword = HMAC_SHA256(terminal_password, terminal_id)
 *   2) token          = HMAC_SHA256(dataToSign, hashedPassword)
 *
 * dataToSign:
 *   - платёж:       terminal_id + order_id + amount + callback_url
 *   - токенизация:  terminal_id + phone + gate
 *
 * Подпись уведомления (callback): HMAC_SHA256(terminal_password, order_id + status + transaction_id)
 */
import { secrets } from "base44:runtime";

export const ALIF_TEST_BASE = "https://test-web.alif.tj";
export const ALIF_PROD_BASE = "https://web.alif.tj";

function readSecret(name) {
  try {
    const value = secrets.get(name);
    return value ? String(value).trim() : "";
  } catch (_) {
    return "";
  }
}

/** Учётные данные терминала из секретов приложения. null — Алиф ещё не подключён. */
export function alifConfig() {
  const terminalId = readSecret("ALIF_TERMINAL_ID");
  const password = readSecret("ALIF_TERMINAL_PASSWORD");
  if (!terminalId || !password) return null;
  const base = readSecret("ALIF_API_BASE") || ALIF_PROD_BASE;
  return { terminalId, password, apiBase: base.replace(/\/+$/, "") };
}

export function isAlifConfigured() {
  return !!alifConfig();
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function formatAmount(value) {
  return Number(value).toFixed(2);
}

/** Подпись тела запроса к Alif. */
export async function alifSign(cfg, dataToSign) {
  const hashedPassword = await hmacSha256Hex(cfg.password, cfg.terminalId);
  return await hmacSha256Hex(hashedPassword, dataToSign);
}

/** Подпись уведомления, пришедшего от Alif. */
export async function alifExpectedCallbackToken(cfg, orderId, status, transactionId) {
  return await hmacSha256Hex(cfg.password, `${orderId}${status}${transactionId}`);
}

/**
 * Проверка уведомления Alif. В документации для подписки указан алгоритм
 * HMAC_SHA256(пароль, orderId + status + transactionId); в примерах банка
 * встречается и вариант terminal_id + transaction_id + amount. Проверяем оба —
 * без знания пароля терминала подделать уведомление нельзя.
 */
export async function alifVerifyCallback(cfg, payload) {
  const given = String(payload?.token || "").toLowerCase();
  if (!given) return false;
  const candidates = [
    await alifExpectedCallbackToken(cfg, payload.orderId, payload.status, String(payload.transactionId)),
    await hmacSha256Hex(cfg.password, `${cfg.terminalId}${payload.transactionId}${formatAmount(payload.amount ?? 0)}`),
  ];
  return candidates.some((candidate) => candidate.toLowerCase() === given);
}

async function alifPost(cfg, path, body, extraHeaders = {}) {
  const response = await fetch(`${cfg.apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    data = { code: response.status, message: text.slice(0, 300) };
  }
  return { status: response.status, ok: response.ok, data };
}

/** Разовая оплата за месяц: POST /v2/ */
export async function alifInitPayment(cfg, p) {
  const amount = formatAmount(p.amount);
  const gate = p.gate || "korti_milli";
  const token = await alifSign(cfg, `${cfg.terminalId}${p.orderId}${amount}${p.callbackUrl}`);
  return alifPost(
    cfg,
    "/v2/",
    {
      order_id: p.orderId,
      token,
      key: cfg.terminalId,
      callback_url: p.callbackUrl,
      return_url: p.returnUrl,
      amount,
      info: p.info || "Подписка BarakatCRM",
      ...(p.email ? { email: p.email } : {}),
      ...(p.phone ? { phone: p.phone } : {}),
      gate,
    },
    { gate },
  );
}

/** Привязка карты (токенизация) для будущих автосписаний: POST /v2/ с заголовком tokenization_<gate>. */
export async function alifInitTokenization(cfg, p) {
  const gate = p.gate || "korti_milli";
  const token = await alifSign(cfg, `${cfg.terminalId}${p.phone}${gate}`);
  return alifPost(
    cfg,
    "/v2/",
    {
      order_id: p.orderId,
      token,
      key: cfg.terminalId,
      callback_url: p.callbackUrl,
      return_url: p.returnUrl,
      phone: p.phone,
      clientID: p.clientId,
      gate,
    },
    { gate: `tokenization_${gate}` },
  );
}

/**
 * Создание регулярного списания: POST /subscription/create
 * Требуется ранее привязанное платёжное средство (token_request_id в статусе approved).
 */
export async function alifCreateSubscription(cfg, p) {
  const amount = formatAmount(p.amount);
  const token = await alifSign(cfg, `${cfg.terminalId}${p.tokenRequestId}${amount}${p.callbackUrl}`);
  return alifPost(cfg, "/subscription/create", {
    key: cfg.terminalId,
    token,
    token_request_id: p.tokenRequestId,
    amount,
    period: "monthly",
    callback_url: p.callbackUrl,
    return_url: p.returnUrl,
  });
}

/** Состояние подписки: POST /subscription/status */
export async function alifSubscriptionStatus(cfg, subscriptionId) {
  const token = await alifSign(cfg, `${cfg.terminalId}${subscriptionId}`);
  return alifPost(cfg, "/subscription/status", {
    key: cfg.terminalId,
    token,
    subscription_id: subscriptionId,
  });
}

/** Отмена подписки: POST /subscription/cancel */
export async function alifCancelSubscription(cfg, subscriptionId) {
  const token = await alifSign(cfg, `${cfg.terminalId}${subscriptionId}`);
  return alifPost(cfg, "/subscription/cancel", {
    key: cfg.terminalId,
    token,
    subscription_id: subscriptionId,
  });
}

/** Проверка статуса разового платежа: POST /checktxn */
export async function alifCheckTransaction(cfg, orderId) {
  const token = await alifSign(cfg, `${cfg.terminalId}${orderId}`);
  return alifPost(cfg, "/checktxn", {
    key: cfg.terminalId,
    token,
    order_id: orderId,
  });
}