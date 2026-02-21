import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import pg from 'npm:pg@8.11.3';

const { Pool } = pg;

const pool = new Pool({
  connectionString: Deno.env.get('POSTGRES_CONNECTION_STRING'),
  ssl: { rejectUnauthorized: false }
});

// Create tables if they don't exist
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// Upsert or delete a record
async function syncRecord(client, tableName, eventType, id, data) {
  if (eventType === 'delete') {
    await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
  } else {
    await client.query(
      `INSERT INTO ${tableName} (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [id, JSON.stringify(data)]
    );
  }
}

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

Deno.serve(async (req) => {
  const client = await pool.connect();
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    await ensureTables(client);

    // --- FULL SYNC MODE (called manually or on schedule) ---
    if (body.full_sync) {
      // Admin check
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const results = {};
      for (const [entityName, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
        const records = await base44.asServiceRole.entities[entityName].list();
        let count = 0;
        for (const record of records) {
          await syncRecord(client, tableName, 'upsert', record.id, record);
          count++;
        }
        results[entityName] = count;
      }

      return Response.json({ success: true, synced: results });
    }

    // --- ENTITY EVENT MODE (called by automations) ---
    const { event, data, old_data } = body;
    if (!event) {
      return Response.json({ error: 'No event provided' }, { status: 400 });
    }

    const tableName = ENTITY_TABLE_MAP[event.entity_name];
    if (!tableName) {
      return Response.json({ error: `Unknown entity: ${event.entity_name}` }, { status: 400 });
    }

    let recordData = data;
    if (!recordData && event.entity_id) {
      // payload_too_large fallback: fetch the record
      recordData = await base44.asServiceRole.entities[event.entity_name].filter({ id: event.entity_id });
      recordData = recordData[0] || null;
    }

    await syncRecord(client, tableName, event.type, event.entity_id, recordData);

    return Response.json({ success: true, entity: event.entity_name, type: event.type, id: event.entity_id });

  } catch (error) {
    console.error('syncToPostgres error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
});