import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  computeAccess,
  findActiveGrant,
  PLAN_PRICE_DEFAULT,
  PLAN_CURRENCY_DEFAULT,
} from '../../shared/subscriptionAccess.ts';
import { isAlifConfigured } from '../../shared/alif.ts';

/**
 * Серверная проверка доступа к приложению.
 * Учитывает: пробный период, оплаченный период, бесплатные исключения
 * (на пользователя или на бизнес) и администратора системы.
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

    const body = await req.json().catch(() => ({}));
    const wantedId = body.business_id || user.data?.business_id || null;

    let business = null;
    if (wantedId) {
      const rows = await base44.asServiceRole.entities.Business.filter({ id: wantedId });
      business = rows?.[0] || null;
    }
    if (!business) {
      const rows = await base44.asServiceRole.entities.Business.filter({ owner_email: user.email });
      business = rows?.[0] || null;
    }

    const isPlatformAdmin = user.role === 'admin';
    const alifConfigured = isAlifConfigured();

    if (!business) {
      return Response.json({
        allowed: true,
        status: 'no_business',
        label: 'Бизнес не выбран',
        hasBusiness: false,
        isOwner: false,
        price: PLAN_PRICE_DEFAULT,
        currency: PLAN_CURRENCY_DEFAULT,
        alifConfigured,
      });
    }

    const isOwner =
      isPlatformAdmin ||
      String(business.owner_email || '').toLowerCase() === String(user.email || '').toLowerCase();

    const [subRows, grantRows, alifRows, planRows] = await Promise.all([
      base44.asServiceRole.entities.BusinessSubscription.filter({ business_id: business.id }),
      base44.asServiceRole.entities.AccessGrant.filter({
        $or: [{ business_id: business.id }, { user_email: user.email }],
      }),
      isOwner
        ? base44.asServiceRole.entities.AlifSubscription.filter({ business_id: business.id })
        : Promise.resolve([]),
      base44.asServiceRole.entities.SubscriptionPlan.filter({ is_active: true }),
    ]);

    const subscription = subRows?.[0] || null;
    const plan = planRows?.[0] || null;
    const grant = findActiveGrant(grantRows, { businessId: business.id, userEmail: user.email });
    const access = computeAccess({ business, subscription, grant, isPlatformAdmin });
    const alifRow = alifRows?.[0] || null;

    return Response.json({
      ...access,
      hasBusiness: true,
      businessId: business.id,
      businessName: business.name,
      isOwner,
      price: plan?.price ? Number(plan.price) : PLAN_PRICE_DEFAULT,
      currency: plan?.currency || PLAN_CURRENCY_DEFAULT,
      planName: plan?.name || 'BarakatCRM — подписка',
      note: subscription?.note || business.subscription_note || '',
      lastPaymentAt: subscription?.last_payment_at || null,
      hasAlifSubscription: !!alifRow?.subscription_id,
      alifStatus: alifRow?.status || 'none',
      alifAccount: alifRow?.account_masked || '',
      alifError: alifRow?.last_error || '',
      alifConfigured,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}