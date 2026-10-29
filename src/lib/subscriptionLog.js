import { base44 } from '@/api/base44Client';

// Журнал событий подписки: активация, продление, отмена, ручные решения администратора.
// События только дополняют историю — данные бизнеса при отмене подписки не удаляются.
export async function logSubscriptionEvent({
  business,
  eventType,
  statusBefore,
  statusAfter,
  amount = null,
  currency = '',
  source = 'manual',
  note = '',
  reference = '',
}) {
  if (!business?.id || !eventType) return null;
  try {
    const me = await base44.auth.me().catch(() => null);
    return await base44.entities.SubscriptionEvent.create({
      business_id: business.id,
      business_name: business.name || '',
      event_type: eventType,
      status_before: statusBefore || '',
      status_after: statusAfter || '',
      amount: typeof amount === 'number' ? amount : null,
      currency: currency || '',
      source,
      actor_email: me?.email || '',
      actor_name: me?.full_name || '',
      note,
      reference: reference || `${eventType}_${Date.now()}`,
      occurred_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Subscription event failed', err);
    return null;
  }
}