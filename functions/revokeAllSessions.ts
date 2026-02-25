import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Генерируем уникальный токен сессии
    const sessionToken = crypto.randomUUID() + '_' + Date.now();

    // Сохраняем токен на пользователе
    await base44.auth.updateMe({ session_token: sessionToken });

    return Response.json({ success: true, session_token: sessionToken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});