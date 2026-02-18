import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Get business
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    if (!businesses.length) return Response.json({ error: 'No business found' }, { status: 404 });
    const biz = businesses[0];

    const [sales, products, customers, warehouses, returns_, employees] = await Promise.all([
      base44.entities.Sale.filter({ business_id: biz.id }),
      base44.entities.Product.filter({ business_id: biz.id }),
      base44.entities.Customer.filter({ business_id: biz.id }),
      base44.entities.Warehouse.filter({ business_id: biz.id }),
      base44.entities.Return.filter({ business_id: biz.id }),
      base44.entities.Employee.filter({ business_id: biz.id }),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      business: biz,
      sales,
      products,
      customers,
      warehouses,
      returns: returns_,
      employees,
    };

    const fileName = `ShoeWholesale_backup_${biz.name}_${new Date().toISOString().slice(0, 10)}.json`;
    const fileContent = JSON.stringify(backup, null, 2);

    // Upload to Google Drive
    const metadata = JSON.stringify({ name: fileName, mimeType: 'application/json' });
    const body = new FormData();
    body.append('metadata', new Blob([metadata], { type: 'application/json' }));
    body.append('file', new Blob([fileContent], { type: 'application/json' }));

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return Response.json({ error: 'Google Drive upload failed', details: err }, { status: 500 });
    }

    const result = await uploadRes.json();
    return Response.json({ success: true, file_id: result.id, file_name: fileName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});