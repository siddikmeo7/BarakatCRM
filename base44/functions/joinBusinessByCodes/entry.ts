import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Не авторизован' });

    const body = await req.json().catch(() => ({}));
    const businessCode = (body?.businessCode || '').toString().trim();
    const accessCode = (body?.accessCode || '').toString().trim();

    if (!businessCode || !accessCode) {
      return Response.json({ success: false, error: 'Введите код бизнеса и код доступа' });
    }

    const userEmailLower = (user.email || '').toLowerCase().trim();

    // Service role — bypass RLS to find business by code
    // Try exact match first (uppercase, since generateBusinessCodes produces uppercase)
    let bizList = await base44.asServiceRole.entities.Business.filter({
      business_code: businessCode.toUpperCase()
    });

    // If not found, try case-insensitive search across all businesses
    if (bizList.length === 0) {
      const allBiz = await base44.asServiceRole.entities.Business.list('-created_date', 500);
      bizList = allBiz.filter(b =>
        (b.business_code || '').toString().trim().toLowerCase() === businessCode.toLowerCase()
      );
    }

    if (bizList.length === 0) {
      return Response.json({
        success: false,
        error: `Бизнес с кодом «${businessCode}» не найден. Проверьте код бизнеса.`
      });
    }
    const biz = bizList[0];

    // Case-insensitive, trimmed comparison for access_code
    const storedCode = (biz.access_code || '').toString().trim().toLowerCase();
    if (!storedCode || storedCode !== accessCode.toLowerCase()) {
      return Response.json({
        success: false,
        error: 'Неверный код доступа. Проверьте код доступа.'
      });
    }

    if (biz.is_active === false) {
      return Response.json({ success: false, error: 'Этот бизнес неактивен. Обратитесь к владельцу.' });
    }

    // Find employee record for this user in this business (service role)
    // Case-insensitive email matching — MongoDB filter is case-sensitive, so we
    // load all employees for this business and match in code
    const allEmps = await base44.asServiceRole.entities.Employee.filter({
      business_id: biz.id
    });

    const emp = allEmps.find(e =>
      (e.user_email || '').toLowerCase().trim() === userEmailLower
    );

    if (!emp) {
      return Response.json({
        success: false,
        error: `Вы не зарегистрированы как сотрудник в бизнесе «${biz.name}». Попросите владельца добавить вас в список сотрудников.`
      });
    }

    if (emp.is_frozen) {
      return Response.json({ success: false, error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.' });
    }

    if (emp.is_active === false) {
      return Response.json({ success: false, error: 'Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.' });
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