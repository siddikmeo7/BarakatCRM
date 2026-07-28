import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Не авторизован' });

    const body = await req.json();
    const businessCode = (body?.businessCode || '').trim();
    const accessCode = (body?.accessCode || '').trim();

    if (!businessCode || !accessCode) {
      return Response.json({ success: false, error: 'Введите код бизнеса и код доступа' });
    }

    // Service role — bypass RLS to find business by code
    const bizList = await base44.asServiceRole.entities.Business.filter({ business_code: businessCode });
    if (bizList.length === 0) {
      return Response.json({ success: false, error: 'Бизнес с таким кодом не найден. Проверьте код бизнеса.' });
    }
    const biz = bizList[0];

    // Case-insensitive, trimmed comparison
    const storedCode = (biz.access_code || '').toString().trim();
    if (storedCode.toLowerCase() !== accessCode.toLowerCase()) {
      return Response.json({ success: false, error: 'Неверный код доступа. Проверьте код доступа.' });
    }

    if (biz.is_active === false) {
      return Response.json({ success: false, error: 'Этот бизнес неактивен. Обратитесь к владельцу.' });
    }

    // Find employee record for this user in this business (service role)
    const existingEmps = await base44.asServiceRole.entities.Employee.filter({
      user_email: user.email,
      business_id: biz.id
    });

    if (existingEmps.length === 0) {
      return Response.json({
        success: false,
        error: 'Вы не зарегистрированы как сотрудник в этом бизнесе. Попросите владельца бизнеса добавить вас в список сотрудников, после чего вы сможете войти.'
      });
    }

    const emp = existingEmps[0];

    if (emp.is_frozen) {
      return Response.json({
        success: false,
        error: 'Ваш аккаунт сотрудника заморожен. Обратитесь к владельцу бизнеса.'
      });
    }

    if (emp.is_active === false) {
      return Response.json({
        success: false,
        error: 'Ваш аккаунт сотрудника деактивирован. Обратитесь к владельцу бизнеса.'
      });
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