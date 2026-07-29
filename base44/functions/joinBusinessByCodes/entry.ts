import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Не авторизован' });

    const body = await req.json().catch(() => ({}));
    const businessCode = (body?.businessCode || '').toString().trim().toUpperCase();
    const accessCode = (body?.accessCode || '').toString().trim().toUpperCase();

    if (!businessCode || !accessCode) {
      return Response.json({ success: false, error: 'Введите код бизнеса и код доступа' });
    }

    const userEmailLower = (user.email || '').toLowerCase().trim();

    // Load all businesses (service role — bypass RLS) and do case-insensitive match in code.
    // This is more reliable than a MongoDB exact-match filter which can intermittently
    // fail to return results due to indexing/caching edge cases.
    const allBiz = await base44.asServiceRole.entities.Business.list('-created_date', 1000);
    const biz = allBiz.find(b =>
      (b.business_code || '').toString().trim().toUpperCase() === businessCode
    );

    if (!biz) {
      return Response.json({
        success: false,
        error: `Бизнес с кодом «${businessCode}» не найден. Проверьте код бизнеса.`
      });
    }

    // Case-insensitive, trimmed comparison for access_code
    const storedCode = (biz.access_code || '').toString().trim().toUpperCase();
    if (!storedCode || storedCode !== accessCode) {
      return Response.json({
        success: false,
        error: 'Неверный код доступа. Проверьте код доступа.'
      });
    }

    if (biz.is_active === false) {
      return Response.json({ success: false, error: 'Этот бизнес неактивен. Обратитесь к владельцу.' });
    }

    // Find employee record for this user in this business (service role)
    const allEmps = await base44.asServiceRole.entities.Employee.filter({
      business_id: biz.id
    });

    const emp = allEmps.find(e =>
      (e.user_email || '').toLowerCase().trim() === userEmailLower
    );

    if (!emp) {
      return Response.json({
        success: false,
        error: `NOT_REGISTERED: Вы не зарегистрированы как сотрудник в бизнесе «${biz.name}». Попросите владельца добавить вас в список сотрудников.`
      });
    }

    if (emp.is_frozen) {
      return Response.json({ success: false, error: 'FROZEN: Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.' });
    }

    if (emp.is_active === false) {
      return Response.json({ success: false, error: 'DEACTIVATED: Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.' });
    }

    // Normalize the email in the Employee record if it has different casing
    if (emp.user_email !== user.email && emp.user_email?.toLowerCase() === user.email?.toLowerCase()) {
      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, { user_email: user.email });
      } catch (_) {}
    }

    // Update business_id on user for RLS (updates token immediately)
    if (user.data?.business_id !== biz.id) {
      try {
        await base44.auth.updateMe({ business_id: biz.id });
      } catch (_) {}
    }

    return Response.json({
      success: true,
      employee_id: emp.id,
      business_id: biz.id,
      business_name: biz.name,
      employee_name: emp.name,
      is_admin: emp.is_admin || false
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Внутренняя ошибка' });
  }
}