import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  alifConfig,
  alifInitTokenization,
  alifCreateSubscription,
  alifSubscriptionStatus,
  alifCancelSubscription,
  alifInitPayment,
  alifCheckTransaction,
} from '../../shared/alif.ts';
import {
  addDays,
  periodKey,
  resolveAppUrl,
  PLAN_PRICE_DEFAULT,
  PLAN_CURRENCY_DEFAULT,
} from '../../shared/subscriptionAccess.ts';

const GATE = 'korti_milli';

function newOrderId(businessId, tag) {
  return `BRK-${tag}-${String(businessId).slice(-6)}-${Date.now()}`;
}

/**
 * Оформление ежемесячной подписки через Alif Bank.
 * action = start  — автопродление (привязка карты + подписка) или разовая оплата за месяц
 * action = cancel — отключить автопродление (доступ остаётся до конца оплаченного периода)
 * action = check  — проверить состояние оплаты в Alif
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
    const action = body.action || 'start';
    const businessId = body.business_id || user.data?.business_id || null;
    if (!businessId) {
      return Response.json({ error: 'business_id required' }, { status: 400 });
    }

    const bizRows = await svc.entities.Business.filter({ id: businessId });
    const business = bizRows?.[0] || null;
    if (!business) {
      return Response.json({ error: 'Business not found' }, { status: 404 });
    }

    const isOwner =
      user.role === 'admin' ||
      String(business.owner_email || '').toLowerCase() === String(user.email || '').toLowerCase();
    if (!isOwner) {
      return Response.json({ error: 'Оплату может подключить только владелец бизнеса' }, { status: 403 });
    }

    const [subRows, alifRows, planRows] = await Promise.all([
      svc.entities.BusinessSubscription.filter({ business_id: businessId }),
      svc.entities.AlifSubscription.filter({ business_id: businessId }),
      svc.entities.SubscriptionPlan.filter({ is_active: true }),
    ]);
    const subscription = subRows?.[0] || null;
    const alifRow = alifRows?.[0] || null;
    const plan = planRows?.[0] || null;
    const amount = plan?.price ? Number(plan.price) : PLAN_PRICE_DEFAULT;
    const currency = plan?.currency || PLAN_CURRENCY_DEFAULT;

    const cfg = alifConfig();
    const appUrl = resolveAppUrl(req);

    if (!cfg) {
      return Response.json({
        configured: false,
        message:
          'Alif Bank ещё не подключён к приложению. Нужны ID терминала и пароль от банка — их выдают вместе с договором эквайринга.',
      });
    }

    const callbackUrl = appUrl ? `${appUrl}/functions/alifWebhook` : '';
    const returnUrl = appUrl ? `${appUrl}/Profile` : '';

    if (action === 'start') {
      if (!callbackUrl) {
        return Response.json({ error: 'Не удалось определить адрес приложения для уведомлений банка' }, { status: 400 });
      }

      const phone = String(body.phone || business.phone || '').replace(/[^\d+]/g, '');

      // Разовая оплата за месяц
      if (body.mode === 'once') {
        const orderId = newOrderId(businessId, 'PAY');
        const res = await alifInitPayment(cfg, {
          orderId,
          amount,
          callbackUrl,
          returnUrl,
          info: `Подписка ${plan?.name || 'BarakatCRM'}`,
          email: user.email,
          phone: phone || undefined,
          gate: GATE,
        });
        console.log('Alif payment init:', res.status, JSON.stringify(res.data).slice(0, 500));
        if (!res.ok || !res.data?.url) {
          return Response.json({
            configured: true,
            step: 'error',
            message: res.data?.message || 'Alif Bank отклонил запрос оплаты',
            code: res.data?.code ?? res.status,
          });
        }
        await svc.entities.AlifPayment.create({
          business_id: businessId,
          order_id: orderId,
          amount,
          currency,
          status: 'pending',
          payment_type: 'one_time',
          period_key: periodKey(),
          period_days: 30,
          note: 'Оплата за месяц',
        });
        return Response.json({ configured: true, step: 'pay', redirectUrl: res.data.url, orderId, amount, currency });
      }

      // Автопродление: сначала привязка платёжного средства, затем подписка с ежемесячным списанием
      if (!alifRow?.payment_token) {
        if (!phone || phone.length < 12) {
          return Response.json({
            configured: true,
            step: 'phone_required',
            message: 'Для привязки карты нужен номер телефона (в формате +992XXXXXXXXX)',
          });
        }
        const orderId = newOrderId(businessId, 'TOK');
        const res = await alifInitTokenization(cfg, {
          orderId,
          phone,
          callbackUrl,
          returnUrl,
          clientId: user.id,
          gate: GATE,
        });
        console.log('Alif tokenization init:', res.status, JSON.stringify(res.data).slice(0, 500));
        if (!res.ok || !res.data?.url) {
          const message = res.data?.message || 'Alif Bank отклонил привязку карты';
          if (alifRow) {
            await svc.entities.AlifSubscription.update(alifRow.id, { last_error: message });
          }
          return Response.json({ configured: true, step: 'error', message, code: res.data?.code ?? res.status });
        }
        const fields = {
          business_id: businessId,
          status: 'tokenization_pending',
          token_request_id: orderId,
          amount,
          currency,
          period: 'monthly',
          auto_renew: true,
          last_error: '',
        };
        if (alifRow) await svc.entities.AlifSubscription.update(alifRow.id, fields);
        else await svc.entities.AlifSubscription.create(fields);
        return Response.json({ configured: true, step: 'tokenize', redirectUrl: res.data.url, orderId });
      }

      if (!alifRow.subscription_id) {
        const res = await alifCreateSubscription(cfg, {
          tokenRequestId: alifRow.token_request_id,
          amount,
          callbackUrl,
          returnUrl,
        });
        console.log('Alif subscription create:', res.status, JSON.stringify(res.data).slice(0, 800));
        const payload = res.data?.payload || {};
        const subscriptionId = payload.subscription_id || payload.subscriptionId || payload.id || '';
        if (!res.ok || !subscriptionId) {
          const message = res.data?.message || 'Alif Bank не создал подписку';
          await svc.entities.AlifSubscription.update(alifRow.id, { last_error: message });
          return Response.json({ configured: true, step: 'error', message, code: res.data?.code ?? res.status });
        }
        await svc.entities.AlifSubscription.update(alifRow.id, {
          subscription_id: subscriptionId,
          status: 'accepted',
          amount,
          currency,
          auto_renew: true,
          last_error: '',
          account_masked: payload.account || alifRow.account_masked || '',
        });
        return Response.json({ configured: true, step: 'subscription_created', status: 'accepted', subscriptionId });
      }

      return Response.json({
        configured: true,
        step: 'active',
        status: alifRow.status,
        subscriptionId: alifRow.subscription_id,
        autoRenew: alifRow.auto_renew !== false,
        nextChargeAt: alifRow.next_charge_at || null,
        account: alifRow.account_masked || '',
      });
    }

    if (action === 'cancel') {
      if (!alifRow?.subscription_id) {
        return Response.json({ error: 'Подписка в Alif не найдена' }, { status: 400 });
      }
      const res = await alifCancelSubscription(cfg, alifRow.subscription_id);
      console.log('Alif subscription cancel:', res.status, JSON.stringify(res.data).slice(0, 400));
      if (!res.ok) {
        return Response.json({ error: res.data?.message || 'Alif Bank не подтвердил отмену' }, { status: 502 });
      }
      await svc.entities.AlifSubscription.update(alifRow.id, { auto_renew: false, status: 'canceled' });
      if (subscription) {
        await svc.entities.BusinessSubscription.update(subscription.id, {
          auto_renew: false,
          note: 'Автопродление отключено',
        });
      }
      return Response.json({ ok: true, autoRenew: false });
    }

    if (action === 'check') {
      if (alifRow?.subscription_id) {
        const res = await alifSubscriptionStatus(cfg, alifRow.subscription_id);
        console.log('Alif subscription status:', res.status, JSON.stringify(res.data).slice(0, 500));
        const payload = res.data?.payload || {};
        const status = payload.status || payload.subscription_status || '';
        if (status && status !== alifRow.status) {
          await svc.entities.AlifSubscription.update(alifRow.id, { status });
        }
        return Response.json({
          configured: true,
          status: status || alifRow.status,
          message: res.data?.message || '',
          nextChargeAt: payload.next_charge_at || alifRow.next_charge_at || null,
        });
      }

      const pending = await svc.entities.AlifPayment.filter({ business_id: businessId, status: 'pending' });
      const target = pending?.[0] || null;
      if (!target) {
        return Response.json({ configured: true, status: 'none', message: 'Ожидающих платежей нет' });
      }
      const res = await alifCheckTransaction(cfg, target.order_id);
      console.log('Alif transaction check:', res.status, JSON.stringify(res.data).slice(0, 500));
      const payload = res.data?.payload || res.data || {};
      return Response.json({
        configured: true,
        status: payload.status || payload.transaction_status || 'pending',
        message: res.data?.message || '',
        note: 'Успешную оплату подтверждает уведомление банка — доступ откроется автоматически',
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('alifSubscription error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}