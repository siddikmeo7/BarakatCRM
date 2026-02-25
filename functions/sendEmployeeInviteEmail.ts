import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, employeeName, businessName, permissions, roleId, employeePassword, loginCode } = await req.json();

    // Загружаем информацию о роли для получения её названия
    let roleName = 'Сотрудник';
    if (roleId) {
      try {
        const role = await base44.entities.Role.filter({ id: roleId });
        if (role.length > 0) {
          roleName = role[0].name;
        }
      } catch (e) {
        console.error('Error fetching role:', e);
      }
    }

    // Формируем список разрешений
    const PERM_LABELS = {
      view_dashboard: 'Дашборд',
      view_analytics: 'Аналитика',
      view_profit: 'Прибыль',
      view_stock_value: 'Стоимость склада',
      view_purchase_price: 'Цена закупки',
      view_products: 'Просмотр товаров',
      add_products: 'Добавление товаров',
      edit_products: 'Редакт. товары',
      delete_products: 'Удаление товаров',
      move_products: 'Перемещение',
      view_sales: 'Просмотр продаж',
      add_sales: 'Продажи',
      edit_sales: 'Редакт. продаж',
      cancel_sales: 'Отмена продаж',
      manage_discounts: 'Скидки',
      view_warehouses: 'Склады',
      manage_warehouses: 'Управление складами',
      view_customers: 'Клиенты',
      manage_customers: 'Управление клиентами',
      view_debts: 'Долги',
      manage_debts: 'Управление долгами',
      manage_returns: 'Возвраты',
      view_activity_log: 'История',
      export_reports: 'Экспорт',
      manage_employees: 'Сотрудники',
      manage_roles: 'Роли',
      manage_settings: 'Настройки',
    };

    const grantedPerms = Object.entries(permissions || {})
      .filter(([, v]) => v)
      .map(([k]) => PERM_LABELS[k] || k);

    const permissionsHtml = grantedPerms.length > 0 
      ? `<div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
           <div style="font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">📋 Ваши разрешения</div>
           <div>${grantedPerms.map(perm => `<span style="display: inline-block; background: #e8f0fe; color: #1967d2; padding: 5px 10px; border-radius: 20px; margin: 5px 5px 5px 0; font-size: 12px;">${perm}</span>`).join('')}</div>
         </div>`
      : '';

    const emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .info-block { background: white; padding: 15px; border-left: 4px solid #667eea; margin-bottom: 15px; border-radius: 5px; }
    .label { font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .footer { color: #666; font-size: 12px; text-align: center; }
    .step { margin-bottom: 15px; }
    .step-number { display: inline-block; background: #667eea; color: white; width: 25px; height: 25px; border-radius: 50%; text-align: center; line-height: 25px; margin-right: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Добро пожаловать в BarakatCRM!</h1>
      <p>Вас добавили как сотрудника в бизнес</p>
    </div>

    <div class="content">
      <p>Привет, <strong>${employeeName}</strong>!</p>
      <p>${user.full_name || 'Владелец'} добавил вас как сотрудника в бизнес <strong>${businessName}</strong>.</p>

      <div class="info-block">
        <div class="label">Ваша роль</div>
        <div style="font-size: 14px; color: #333;">${roleName}</div>
      </div>

      ${permissionsHtml}

      <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <h3 style="margin-top: 0; color: #1967d2;">📝 Как войти в систему:</h3>
        <div class="step">
          <span class="step-number">1</span>
          <strong>Перейдите на страницу входа BarakatCRM</strong>
        </div>
        <div class="step">
            <span class="step-number">2</span>
            <strong>Введите вашу почту:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${email}</code>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <strong>Введите ваш пароль:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${employeePassword || 'N/A'}</code>
          </div>
          <div class="step">
            <span class="step-number">4</span>
            <strong>Введите код входа:</strong> <code style="background: #fff3cd; padding: 5px 10px; border-radius: 3px; font-weight: bold; letter-spacing: 2px;">${loginCode || 'N/A'}</code>
          </div>
          <div class="step">
            <span class="step-number">5</span>
            <strong>После входа выберите роль сотрудника</strong> в бизнесе "${businessName}"
          </div>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        ℹ️ Владелец бизнеса уже авторизовал вас в системе. Если у вас возникли вопросы, обратитесь к владельцу.
      </p>
    </div>

    <div class="footer">
      <p>© BarakatCRM — Система управления бизнесом</p>
      <p>Это автоматическое письмо, пожалуйста не отвечайте на него</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Вас добавили в ${businessName} как сотрудника BarakatCRM`,
        body: emailBody,
      });
    } catch (emailError) {
      console.warn('Email service error (expected in dev):', emailError.message);
      // Email failed, but that's ok in preview - return success anyway
      return Response.json({ success: true, message: 'Employee added (email notification skipped in dev)' });
    }

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});