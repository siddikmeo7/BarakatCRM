import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { alifConfig, alifVerifyCallback } from '../../shared/alif.ts';
import { addDays, periodKey } from '../../shared/subscriptionAccess.ts';

/**
 * Уведомления от Alif Bank: привязка карты (токенизация) и списания по подписке.
 * Подпись проверяется по алгоритму банка; повторные доставки игнорируются.
 */
export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const cfg = alifConfig();
    if (!cfg) {
      console.error('Alif webhook: терминал не настроен, уведомление невозможно проверить');
      return Response.json({ error: 'Alif is not configured' }, { status: 503 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    console.log('Alif webhook payload:', JSON.stringify(body).slice(0, 900));

    // 1) Привязка платёжного средства (токенизация)
    const payload = body?.Payload || body?.payload;
    if (payload && (payload.event === 'tokenize' || payload.token)) {
      const orderId = payload.orderId;
      const rows = await svc.entities.AlifSubscription.filter({ token_request_id: orderId });
      const row = rows?.[0] || null;
      if (!row) {
        console.error('Alif webhook: заявка токенизации не найдена', orderId);
        return Response.json({ ok: true });
      }
      const approved =
        String(payload.status || '').toLowerCase() === 'approved' ||
        body?.Code === 1 ||
        body?.Code === '1';
      if (!approved) {
        await svc.entities.AlifSubscription.update(row.id, {
          status: 'failed',
          last_error: payload.status || body?.Message || 'Привязка карты не подтверждена',
        });
        return Response.json({ ok: true });
      }
      await svc.entities.AlifSubscription.update(row.id, {
        status: 'tokenized',
        payment_token: payload.token,
        account_masked: payload.account || '',
        last_error: '',
      });
      return Response.json({ ok: true });
    }

    // 2) Списание (первое или очередное)
    const orderId = body?.orderId || body?.order_id;
    const rawStatus = body?.status;
    const status = String(rawStatus || '').toLowerCase();
    const transactionId = String(body?.transactionId || body?.transaction_id || '');
    if (!orderId || !status) {
      console.error('Alif webhook: неизвестный формат уведомления');
      return Response.json({ error: 'Unrecognized payload' }, { status: 400 });
    }

    const valid = await alifVerifyCallback(cfg, {
      orderId,
      status: rawStatus,
      transactionId,
      amount: body?.amount,
      token: body?.token,
    });
    if (!valid) {
      console.error('Alif webhook: подпись не совпала для заявки', orderId);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payment = null;
    const direct = await svc.entities.AlifPayment.filter({ order_id: orderId });
    payment = direct?.[0] || null;

    let alifRow = null;
    if (!payment) {
      // Списание по подписке: банк формирует собственный номер заявки
      const subList = await svc.entities.AlifSubscription.list('-created_date', 200);
      const subs = Array.isArray(subList) ? subList : subList?.items || [];
      alifRow = subs.find((s) => s.subscription_id && orderId.includes(s.subscription_id)) || null;
      if (!alifRow) {
        const candidates = subs.filter((s) => s.status === 'accepted' || s.status === 'approved');
        alifRow = candidates.find((s) => Number(s.amount) === Number(body?.amount)) || candidates[0] || null;
        console.warn('Alif webhook: подписка сопоставлена по сумме, бизнес:', alifRow?.business_id || null);
      }
      if (alifRow) {
        payment = await svc.entities.AlifPayment.create({
          business_id: alifRow.business_id,
          order_id: orderId,
          alif_order_id: orderId,
          transaction_id: transactionId,
          subscription_id: alifRow.subscription_id || '',
          amount: Number(body?.amount) || alifRow.amount || 0,
          currency: alifRow.currency || 'TJS',
          status: 'pending',
          payment_type: 'subscription',
          period_key: periodKey(),
          period_days: 30,
        });
      }
    }

    if (!payment) {
      console.error('Alif webhook: платёж не найден по заявке', orderId);
      return Response.json({ ok: true });
    }

    // Идемпотентность: одно и то же уведомление может прийти несколько раз
    if (payment.status === 'ok' && transactionId && payment.transaction_id === transactionId) {
      return Response.json({ ok: true });
    }

    const isSuccess = ['ok', 'success', 'approved', 'paid'].includes(status);

    if (isSuccess) {
      const now = new Date();
      const days = Number(payment.period_days) || 30;

      await svc.entities.AlifPayment.update(payment.id, {
        status: 'ok',
        transaction_id: transactionId,
        alif_order_id: orderId,
        account_masked: body?.account || '',
        transaction_type: body?.transaction_type || '',
        paid_at: now.toISOString(),
      });

      const bizRows = await svc.entities.Business.filter({ id: payment.business_id });
      const business = bizRows?.[0] || null;

      if (business) {
        const subRows = await svc.entities.BusinessSubscription.filter({ business_id: business.id });
        const existing = subRows?.[0] || null;
        const coverage =
          existing?.paid_until && new Date(existing.paid_until).getTime() > now.getTime()
            ? new Date(existing.paid_until)
            : now;
        const paidUntil = addDays(coverage, days);
        const fields = {
          provider: 'alif',
          status: 'active',
          auto_renew: true,
          paid_until: paidUntil.toISOString(),
          last_payment_at: now.toISOString(),
          plan_price: Number(payment.amount) || 0,
          currency: payment.currency || 'TJS',
          note: 'Оплата через Alif Bank',
        };
        if (existing) await svc.entities.BusinessSubscription.update(existing.id, fields);
        else await svc.entities.BusinessSubscription.create({ business_id: business.id, ...fields });

        await svc.entities.Business.update(business.id, {
          subscription_status: 'active',
          subscription_started_at: business.subscription_started_at || now.toISOString(),
          subscription_note: 'Оплата через Alif Bank',
        });
      }

      if (alifRow) {
        await svc.entities.AlifSubscription.update(alifRow.id, {
          status: 'approved',
          auto_renew: true,
          last_charge_at: now.toISOString(),
          next_charge_at: addDays(now, days).toISOString(),
          account_masked: body?.account || alifRow.account_masked || '',
          last_error: '',
        });
      }

      return Response.json({ ok: true });
    }

    // Неуспешное списание или отмена
    await svc.entities.AlifPayment.update(payment.id, {
      status: status === 'canceled' || status === 'cancelled' ? 'canceled' : 'failed',
      transaction_id: transactionId,
      note: body?.info || 'Списание не прошло',
    });

    if (alifRow) {
      await svc.entities.AlifSubscription.update(alifRow.id, {
        last_error: body?.info || 'Списание не прошло',
      });
      // Доступ сохраняется до конца оплаченного периода — закрытие происходит по дате
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Alif webhook error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}