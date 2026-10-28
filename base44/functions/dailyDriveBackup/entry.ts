import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

// Полный набор данных бизнеса для резервной копии
const COLLECTIONS = [
  'Warehouse', 'Product', 'Sale', 'Return', 'Customer', 'DebtPayment',
  'Expense', 'Employee', 'Role', 'SalaryPayment', 'SalarySchedule',
  'ConsignmentProduct', 'ConsignmentSale', 'ConsignmentPayout', 'ProfitExpectation',
];

const asArray = (res) => (Array.isArray(res) ? res : (res?.items || []));

// Читаем ВСЕ записи коллекции: страницами по 1000, до конца
async function fetchAll(base44, entityName, businessId) {
  const rows = [];
  let cursor = null;
  for (let i = 0; i < 80; i++) {
    const opts = { limit: 1000, sort: '-created_date' };
    if (cursor) opts.cursor = cursor;
    const page = await base44.asServiceRole.entities[entityName].filter({ business_id: businessId }, opts);
    if (Array.isArray(page)) return rows.concat(page);
    rows.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return rows;
}

async function uploadToDrive(accessToken, fileName, content) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: fileName, mimeType: 'application/json' })], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Google Drive upload failed: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (!accessToken) return Response.json({ error: 'Google Drive не подключён' }, { status: 400 });

    const businesses = asArray(await base44.asServiceRole.entities.Business.list('-created_date', 500));
    if (!businesses.length) return Response.json({ success: true, businesses: 0, message: 'Бизнесов нет' });

    const today = new Date().toISOString().slice(0, 10);
    const results = [];

    for (const biz of businesses) {
      const data = { exported_at: new Date().toISOString(), business: biz };
      const counts = {};
      for (const name of COLLECTIONS) {
        const rows = await fetchAll(base44, name, biz.id);
        data[name] = rows;
        counts[name] = rows.length;
      }
      const safeName = String(biz.name || biz.id).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60);
      const fileName = `BarakatCRM_Backup_${safeName}_${today}.json`;
      const uploaded = await uploadToDrive(accessToken, fileName, JSON.stringify(data, null, 2));
      results.push({ business: biz.name, file_name: fileName, file_id: uploaded.id, records: counts });
      console.log(`Backup OK: ${fileName}`, JSON.stringify(counts));
    }

    return Response.json({ success: true, date: today, businesses: results.length, results });
  } catch (error) {
    console.error('dailyDriveBackup error:', error?.message || String(error));
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});