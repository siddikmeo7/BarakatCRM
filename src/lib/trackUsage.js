import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'barakat_usage_seen';

// Отслеживание использования разделов: одна запись на раздел за сессию вкладки,
// чтобы журнал показывал реальную картину, а не каждое переключение страницы.
export async function trackUsage({ module, action = 'view' }) {
  try {
    const business = window.__barakatBusiness;
    if (!module || !business?.id) return;
    const seen = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    if (seen[module]) return;
    seen[module] = true;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(seen));

    const employee = window.__barakatEmployee;
    const me = employee ? null : await base44.auth.me().catch(() => null);
    await base44.entities.UsageEvent.create({
      business_id: business.id,
      business_name: business.name || '',
      user_email: employee?.user_email || me?.email || '',
      user_name: employee?.name || me?.full_name || '',
      module,
      action,
      occurred_at: new Date().toISOString(),
    });
  } catch (_) {
    // Отслеживание не должно мешать работе приложения
  }
}