import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Единственный способ привязать пользователя к бизнесу.
// Поле business_id в профиле пользователя заблокировано для изменений из приложения,
// поэтому привязку ставит сервер — и только после проверки, что пользователь
// действительно владелец этого бизнеса или его активный сотрудник.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestedId = typeof body?.business_id === 'string' ? body.business_id.trim() : '';
    const emailLower = (user.email || '').toLowerCase().trim();

    const withEmail = (list, field) =>
      (list || []).find(r => (r[field] || '').toLowerCase().trim() === emailLower) || null;

    let business = null;

    if (requestedId) {
      const bizList = await base44.asServiceRole.entities.Business.filter({ id: requestedId });
      const biz = bizList[0];
      if (!biz) return Response.json({ error: 'Бизнес не найден' }, { status: 404 });

      const isOwner = (biz.owner_email || '').toLowerCase().trim() === emailLower;
      if (!isOwner) {
        const emps = await base44.asServiceRole.entities.Employee.filter({
          business_id: requestedId,
          is_active: true,
        });
        const mine = withEmail(emps, 'user_email');
        if (!mine || mine.is_frozen) {
          return Response.json({ error: 'Нет доступа к этому бизнесу' }, { status: 403 });
        }
      }
      business = biz;
    } else {
      // Без указания бизнеса: сначала собственный бизнес, затем активная запись сотрудника
      const owned = await base44.asServiceRole.entities.Business.filter({ owner_email: user.email });
      business = withEmail(owned, 'owner_email');
      if (!business) {
        const emps = await base44.asServiceRole.entities.Employee.filter({ is_active: true });
        const mine = withEmail(emps, 'user_email');
        if (mine && !mine.is_frozen && mine.business_id) {
          const list = await base44.asServiceRole.entities.Business.filter({ id: mine.business_id });
          business = list[0] || null;
        }
      }
      if (!business) return Response.json({ error: 'Бизнес не найден' }, { status: 404 });
    }

    if (user.data?.business_id !== business.id) {
      await base44.asServiceRole.entities.User.update(user.id, { business_id: business.id });
    }

    return Response.json({
      business_id: business.id,
      business_name: business.name,
      changed: user.data?.business_id !== business.id,
    });
  } catch (error) {
    console.error('activateBusiness error:', error);
    return Response.json({ error: error.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}