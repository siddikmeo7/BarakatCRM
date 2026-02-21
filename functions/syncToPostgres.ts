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
  const sql = postgres(connectionString, { ssl: 'require', max: 5 });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    await ensureTables(sql);

    // --- FULL SYNC MODE ---
    if (body.full_sync) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const results = {};
      for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
        const records = await base44.asServiceRole.entities[entityName].list();
        for (const record of records) {
          await sql`
            INSERT INTO ${sql(tableName)} (id, data, updated_at)
            VALUES (${record.id}, ${JSON.stringify(record)}, NOW())
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(record)}, updated_at = NOW()
          `;
        }
        results[entityName] = records.length;
      }

      await sql.end();
      return Response.json({ success: true, synced: results });
    }

    // --- ENTITY EVENT MODE (called by automations) ---
    const { event, data } = body;
    if (!event) {
      return Response.json({ error: 'No event provided' }, { status: 400 });
    }

    const tableName = ENTITY_TABLE_MAP[event.entity_name];
    if (!tableName) {
      return Response.json({ error: `Unknown entity: ${event.entity_name}` }, { status: 400 });
    }

    if (event.type === 'delete') {
      await sql`DELETE FROM ${sql(tableName)} WHERE id = ${event.entity_id}`;
    } else {
      let recordData = data;
      if (!recordData) {
        const rows = await base44.asServiceRole.entities[event.entity_name].filter({ id: event.entity_id });
        recordData = rows[0] || null;
      }
      if (recordData) {
        await sql`
          INSERT INTO ${sql(tableName)} (id, data, updated_at)
          VALUES (${event.entity_id}, ${JSON.stringify(recordData)}, NOW())
          ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(recordData)}, updated_at = NOW()
        `;
      }
    }

    await sql.end();
    return Response.json({ success: true, entity: event.entity_name, type: event.type, id: event.entity_id });

  } catch (error) {
    console.error('syncToPostgres error:', error.message);
    try { await sql.end(); } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});