import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { alifConfig, alifVerifyCallback } from '../../shared/alif.ts';
import { addDays, periodKey, resolveAppUrl } from '../../shared/subscriptionAccess.ts';

/**
 * Единая точка проверки состояния оплаты и связи оплаты с банком.
 * action = status — состояние подписки бизнеса (для панели оплаты)
 * action = callback_check — самопроверка подписи уведомления (диагностика настройки)
 */
export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';
    const businessId = body.business_id || user.data?.business_id || null;

    if (action === 'callback_check') {
      const cfg = alifConfig();
      if (!cfg) {
        return Response.json({ configured: false, message: 'Alif Bank ещё не подключён' });
      }
      const orderId = body.order_id || 'TEST';
      const status = body.status || 'ok';
      const transactionId = body.transaction_id || '0';
      const valid = await alifVerifyCallback(cfg, {
        orderId,
        status,
        transactionId,
        amount: body.amount ?? 0,
        token: body.token || '',
      });
      return Response.json({
        configured: true,
        signatureValid: valid,
        callbackUrl: resolveAppUrl(req) ? `${resolveAppUrl(req)}/functions/alifWebhook` : '',
      });
    }

    if (!businessId) {
      return Response.json({ error: 'business_id required' }, { status: 400 });
    }

    const [bizRows, subRows, alifRows, payments] = await Promise.all([
      svc.entities.Business.filter({ id: businessId }),
      svc.entities.BusinessSubscription.filter({ business_id: businessId }),
      svc.entities.AlifSubscription.filter({ business_id: businessId }),
      svc.entities.AlifPayment.filter({ business_id: businessId }, { sort: '-created_date', limit: 20 }),
    ]);

    const business = bizRows?.[0] || null;
    if (!business) {
      return Response.json({ error: 'Business not found' }, { status: 404 });
    }

    const subscription = subRows?.[0] || null;
    const alifRow = alifRows?.[0] || null;
    const list = Array.isArray(payments) ? payments : payments?.items || [];

    return Response.json({
      configured: !!alifConfig(),
      businessId,
      status: subscription?.status || business.subscription_status || 'trial',
      provider: subscription?.provider || 'base44',
      autoRenew: !!subscription?.auto_renew,
      paidUntil: subscription?.paid_until || null,
      lastPaymentAt: subscription?.last_payment_at || null,
      alifStatus: alifRow?.status || 'none',
      alifSubscriptionId: alifRow?.subscription_id || '',
      nextChargeAt: alifRow?.next_charge_at || null,
      alifError: alifRow?.last_error || '',
      renewalDate: subscription?.paid_until ? addDays(subscription.paid_until, 1).toISOString() : null,
      currentPeriod: periodKey(),
      payments: list.map((p) => ({
        date: p.paid_at || p.created_date,
        amount: p.amount,
        status: p.status,
        type: p.payment_type,
        account: p.account_masked || '',
      })),
    });
  } catch (error) {
    console.error('alifPaymentStatus error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}