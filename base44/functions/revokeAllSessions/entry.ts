import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Определяем тип устройства и браузер по User-Agent
function parseUserAgent(ua) {
  if (!ua) return { device: 'Неизвестное устройство', browser: 'Неизвестный браузер' };

  let device = 'Компьютер';
  if (/iPhone/i.test(ua)) device = '📱 iPhone';
  else if (/iPad/i.test(ua)) device = '📱 iPad';
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) device = '📱 Android телефон';
  else if (/Android/i.test(ua)) device = '📱 Android планшет';
  else if (/Macintosh/i.test(ua)) device = '💻 Mac';
  else if (/Windows/i.test(ua)) device = '🖥️ Windows';
  else if (/Linux/i.test(ua)) device = '🖥️ Linux';

  let browser = 'Неизвестный';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'register'; // 'register' | 'revoke_all' | 'list' | 'revoke_one'

    const ua = req.headers.get('user-agent') || '';
    const { device, browser } = parseUserAgent(ua);
    const now = new Date().toISOString();

    if (action === 'register') {
      // Регистрируем текущую сессию
      const sessionId = crypto.randomUUID();
      const newToken = crypto.randomUUID() + '_' + Date.now();

      const existingSessions = user.active_sessions || [];
      const newSession = {
        session_id: sessionId,
        device,
        browser,
        last_seen: now,
        created_at: now,
      };

      await base44.auth.updateMe({
        session_token: newToken,
        active_sessions: [...existingSessions, newSession],
      });

      return Response.json({ success: true, session_token: newToken, session_id: sessionId });
    }

    if (action === 'heartbeat') {
      // Обновляем last_seen для текущей сессии
      const sessionId = body.session_id;
      const sessions = (user.active_sessions || []).map(s =>
        s.session_id === sessionId ? { ...s, last_seen: now } : s
      );
      await base44.auth.updateMe({ active_sessions: sessions });
      return Response.json({ success: true });
    }

    if (action === 'list') {
      return Response.json({ sessions: user.active_sessions || [] });
    }

    if (action === 'revoke_all') {
      // Выход со всех устройств кроме текущего
      const currentSessionId = body.current_session_id;
      const newToken = crypto.randomUUID() + '_' + Date.now();
      const sessions = (user.active_sessions || []).filter(s => s.session_id === currentSessionId);

      await base44.auth.updateMe({
        session_token: newToken,
        active_sessions: sessions,
      });

      return Response.json({ success: true, session_token: newToken });
    }

    if (action === 'revoke_one') {
      // Удаляем одну сессию
      const targetSessionId = body.target_session_id;
      const currentSessionId = body.current_session_id;
      const sessions = (user.active_sessions || []).filter(s => s.session_id !== targetSessionId);

      let newToken = user.session_token;
      // Если удаляем не текущую сессию — просто убираем её из списка
      // Если удаляем текущую — меняем токен тоже
      if (targetSessionId === currentSessionId) {
        newToken = crypto.randomUUID() + '_' + Date.now();
      }

      await base44.auth.updateMe({
        session_token: newToken,
        active_sessions: sessions,
      });

      return Response.json({ success: true, session_token: newToken });
    }

    if (action === 'unregister') {
      // Выход с текущего устройства
      const sessionId = body.session_id;
      const sessions = (user.active_sessions || []).filter(s => s.session_id !== sessionId);
      await base44.auth.updateMe({ active_sessions: sessions });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});