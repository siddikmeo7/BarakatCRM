// Генерирует уникальные коды для бизнеса
function generateUniqueCode(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const businessCode = generateUniqueCode(12);
    const accessCode = generateUniqueCode(8);

    return Response.json({ businessCode, accessCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});