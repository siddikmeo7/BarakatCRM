import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import postgres from 'npm:postgres@3.4.4';

const connectionString = Deno.env.get('POSTGRES_CONNECTION_STRING');

const ENTITY_TABLE_MAP = {
  Business: 'businesses',
  Product: 'products',
  Sale: 'sales',
  Customer: 'customers',
  Warehouse: 'warehouses',
  Employee: 'employees',
  DebtPayment: 'debt_payments',
  Return: 'returns',
  Role: 'roles',
  ActivityLog: 'activity_logs',
};

async function ensureTables(sql) {
  for (const tableName of Object.values(ENTITY_TABLE_MAP)) {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
}

Deno.serve(async (req) => {
  let sql;
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Test connection
    if (body.test_connection) {
      sql = postgres(connectionString, { ssl: { rejectUnauthorized: false }, max: 1, connect_timeout: 10 });
      const result = await sql`SELECT current_database() as db, NOW() as time`;
      await sql.end();
      return Response.json({ success: true, db: result[0].db, time: result[0].time });
    }

    sql = postgres(connectionString, { ssl: { rejectUnauthorized: false }, max: 5 });
    await ensureTables(sql);

    // --- FULL SYNC MODE ---
    if (body.full_sync) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        await sql.end();
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const results = {};
      for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
        const records = await base44.asServiceRole.entities[entityName].list();
        for (const record of records) {
          const dataJson = JSON.stringify(record);
          await sql.unsafe(
            `INSERT INTO ${tableName} (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
            [record.id, dataJson]
          );
        }
        results[entityName] = records.length;
      }

      await sql.end();
      return Response.json({ success: true, synced: results });
    }

    // --- ENTITY EVENT MODE (called by automations) ---
    const { event, data } = body;
    if (!event) {
      await sql.end();
      return Response.json({ error: 'No event provided' }, { status: 400 });
    }

    // Authenticate the caller — prevents unauthenticated data deletion/tampering
    let eventUser;
    try {
      eventUser = await base44.auth.me();
    } catch {
      eventUser = null;
    }
    if (!eventUser) {
      await sql.end();
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tableName = ENTITY_TABLE_MAP[event.entity_name];
    if (!tableName) {
      await sql.end();
      return Response.json({ error: `Unknown entity: ${event.entity_name}` }, { status: 400 });
    }

    if (event.type === 'delete') {
      await sql.unsafe(`DELETE FROM ${tableName} WHERE id = $1`, [event.entity_id]);
    } else {
      let recordData = data;
      if (!recordData) {
        const rows = await base44.asServiceRole.entities[event.entity_name].filter({ id: event.entity_id });
        recordData = rows[0] || null;
      }
      if (recordData) {
        const dataJson = JSON.stringify(recordData);
        await sql.unsafe(
          `INSERT INTO ${tableName} (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
          [event.entity_id, dataJson]
        );
      }
    }

    await sql.end();
    return Response.json({ success: true, entity: event.entity_name, type: event.type, id: event.entity_id });

  } catch (error) {
    console.error('syncToPostgres error:', error.message, JSON.stringify(error));
    if (sql) { try { await sql.end(); } catch (_) {} }
    return Response.json({ error: error.message || String(error), detail: JSON.stringify(error) }, { status: 500 });
  }
});