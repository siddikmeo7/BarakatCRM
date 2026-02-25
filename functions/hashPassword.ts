import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { password } = await req.json();
    
    if (!password) {
      return Response.json({ error: 'Password required' }, { status: 400 });
    }

    // Используем Web Crypto API для хеширования
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return Response.json({ hash: hashHex });
  } catch (error) {
    console.error('Error hashing password:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});