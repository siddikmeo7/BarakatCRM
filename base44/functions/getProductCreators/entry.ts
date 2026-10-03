import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Возвращает список создателей товаров текущего бизнеса:
// [{ id, email, name }] — связывает Product.created_by_id (user id) с Employee по email.
// User RLS не позволяем обычным сотрудникам листать пользователей, поэтому User читаем через service role.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const businessId = user.data?.business_id;
    if (!businessId) return Response.json({ creators: [] });

    const products = await base44.entities.Product.filter(
      { business_id: businessId },
      { fields: ['created_by_id'], limit: 1000 }
    );
    const items = products.items || products;
    const creatorIds = [...new Set(items.map(p => p.created_by_id).filter(Boolean))];

    if (creatorIds.length === 0) return Response.json({ creators: [] });

    // User читаем через service role — RLS разрешает листать других пользователей только админам
    const users = await base44.asServiceRole.entities.User.filter({ id: { $in: creatorIds } });
    const userList = users.items || users;
    const idToEmail = {};
    userList.forEach(u => { if (u.id && u.email) idToEmail[u.id] = u.email; });

    const emails = [...new Set(Object.values(idToEmail))];
    const emailToName = {};
    if (emails.length > 0) {
      const employees = await base44.entities.Employee.filter(
        { user_email: { $in: emails } },
        { fields: ['name', 'user_email'] }
      );
      (employees.items || employees).forEach(e => {
        if (e.user_email && !emailToName[e.user_email]) emailToName[e.user_email] = e.name;
      });
    }

    const creators = creatorIds
      .map(id => {
        const email = idToEmail[id] || '';
        return { id, email, name: emailToName[email] || email || 'Неизвестно' };
      })
      .filter(c => c.email);

    return Response.json({ creators });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}