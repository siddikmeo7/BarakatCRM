import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useEmployeeAccess } from '@/components/permissions/useEmployeeAccess';
import {
  Flame, Calendar, Clock, Shield, Building2, User as UserIcon, CheckCircle, XCircle,
  Activity, Smartphone, Mail, Phone, MapPin, Crown, TrendingUp, MessageCircle, Save, Loader2, CheckCircle2
} from 'lucide-react';
import { computeStreak, getActivityCalendar, getTotalLoginDays } from '@/lib/loginTracker';
import AvatarPicker from '@/components/settings/AvatarPicker';
import EmployeeAvatar from '@/components/employees/EmployeeAvatar';
import ProfilePhotoZoom from '@/components/settings/ProfilePhotoZoom';
import ProfileStylePicker from '@/components/settings/ProfileStylePicker';

const PERMISSION_LABELS = [
  { key: 'view_dashboard', label: 'Дашборд', icon: '📊' },
  { key: 'view_analytics', label: 'Аналитика', icon: '📈' },
  { key: 'view_profit', label: 'Прибыль', icon: '💰' },
  { key: 'view_revenue', label: 'Выручка', icon: '💵' },
  { key: 'view_stock_value', label: 'Стоимость склада', icon: '🏗️' },
  { key: 'view_purchase_price', label: 'Цены закупки', icon: '🛒' },
  { key: 'view_employee_analytics', label: 'Аналитика сотрудников', icon: '👥' },
  { key: 'view_products', label: 'Товары', icon: '📦' },
  { key: 'add_products', label: 'Добавление товаров', icon: '➕' },
  { key: 'edit_products', label: 'Редактирование товаров', icon: '✏️' },
  { key: 'delete_products', label: 'Удаление товаров', icon: '🗑️' },
  { key: 'move_products', label: 'Перемещение товаров', icon: '↔️' },
  { key: 'view_products_cost', label: 'Стоимость товаров', icon: '💲' },
  { key: 'edit_product_purchase_price', label: 'Ред. цену закупки', icon: '✏️' },
  { key: 'edit_product_sale_price', label: 'Ред. цену продажи', icon: '✏️' },
  { key: 'view_sales', label: 'Продажи', icon: '🛒' },
  { key: 'view_own_sales_only', label: 'Только свои продажи', icon: '👤' },
  { key: 'add_sales', label: 'Добавление продаж', icon: '➕' },
  { key: 'edit_sales', label: 'Ред. продаж', icon: '✏️' },
  { key: 'cancel_sales', label: 'Отмена продаж', icon: '❌' },
  { key: 'cancel_any_sale', label: 'Отмена любых продаж', icon: '🚫' },
  { key: 'manage_discounts', label: 'Скидки', icon: '🏷️' },
  { key: 'edit_sale_price', label: 'Изм. цену', icon: '✏️' },
  { key: 'view_sale_profit', label: 'Прибыль продаж', icon: '💰' },
  { key: 'view_sale_purchase_price', label: 'Закупка продаж', icon: '🛒' },
  { key: 'view_sale_customer', label: 'Клиент продажи', icon: '👥' },
  { key: 'view_warehouses', label: 'Склады', icon: '🏢' },
  { key: 'manage_warehouses', label: 'Управление складами', icon: '⚙️' },
  { key: 'view_warehouse_value', label: 'Стоимость склада', icon: '💲' },
  { key: 'view_warehouse_revenue', label: 'Выручка склада', icon: '📈' },
  { key: 'view_warehouse_cost', label: 'Стоимость всех складов', icon: '🏗️' },
  { key: 'view_customers', label: 'Клиенты', icon: '👥' },
  { key: 'manage_customers', label: 'Управление клиентами', icon: '⚙️' },
  { key: 'delete_customers', label: 'Удаление клиентов', icon: '🗑️' },
  { key: 'view_customer_debt', label: 'Долг клиента', icon: '💳' },
  { key: 'view_customer_contacts', label: 'Контакты клиента', icon: '📞' },
  { key: 'view_debts', label: 'Долги', icon: '💳' },
  { key: 'manage_debts', label: 'Управление долгами', icon: '⚙️' },
  { key: 'add_debt_manual', label: 'Добавить долг вручную', icon: '➕' },
  { key: 'send_debt_reminders', label: 'Напоминания о долгах', icon: '🔔' },
  { key: 'view_returns', label: 'Возвраты', icon: '↩️' },
  { key: 'manage_returns', label: 'Оформление возвратов', icon: '⚙️' },
  { key: 'view_reports', label: 'Отчёты', icon: '📋' },
  { key: 'view_reports_detailed', label: 'Детальные отчёты', icon: '📊' },
  { key: 'view_activity_log', label: 'Журнал действий', icon: '📜' },
  { key: 'export_reports', label: 'Экспорт отчётов', icon: '📤' },
  { key: 'export_excel', label: 'Экспорт Excel', icon: '📗' },
  { key: 'delete_activity_log', label: 'Удаление истории', icon: '🗑️' },
  { key: 'view_ai_assistant', label: 'ИИ-ассистент', icon: '🤖' },
  { key: 'manage_telegram', label: 'Настройки Telegram', icon: '📲' },
  { key: 'send_notifications', label: 'Отправка уведомлений', icon: '📢' },
  { key: 'view_settings_language', label: 'Язык интерфейса', icon: '🌐' },
  { key: 'view_settings_defaults', label: 'Просмотр настроек', icon: '👁️' },
  { key: 'manage_settings_defaults', label: 'Изменение настроек', icon: '⚙️' },
  { key: 'view_settings_custom', label: 'Кастомные поля', icon: '🎨' },
  { key: 'manage_settings_custom', label: 'Упр. кастомными полями', icon: '⚙️' },
  { key: 'view_settings_security', label: 'Безопасность', icon: '🔒' },
  { key: 'view_settings_codes', label: 'Коды доступа', icon: '🔑' },
  { key: 'manage_settings', label: 'Полные настройки', icon: '⚙️' },
  { key: 'manage_employees', label: 'Управление сотрудниками', icon: '👔' },
  { key: 'manage_roles', label: 'Управление ролями', icon: '🎭' },
  { key: 'backup_data', label: 'Резервные копии', icon: '💾' },
  { key: 'delete_all_data', label: 'Удалить все данные', icon: '⚠️' },
];

export default function ProfileDetailDialog({ open, onClose, user, currentEmployee, business }) {
  const { can, isOwner } = useEmployeeAccess();
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [calendar, setCalendar] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(currentEmployee?.avatar_url || user?.data?.avatar_url || null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [profileFrame, setProfileFrame] = useState(currentEmployee?.profile_frame || user?.data?.profile_frame || 'none');
  const [profileSticker, setProfileSticker] = useState(currentEmployee?.profile_sticker || user?.data?.profile_sticker || 'none');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    phone: '',
    phone2: '',
    whatsapp: '',
    telegram: '',
    age: '',
    address: '',
  });

  useEffect(() => {
    if (open && user?.email) {
      setStreak(computeStreak(user.email));
      setTotalDays(getTotalLoginDays(user.email));
      setCalendar(getActivityCalendar(user.email, 30));
    }
    if (open) {
      if (currentEmployee) {
        setPersonalInfo({
          full_name: currentEmployee.full_name || currentEmployee.name || '',
          phone: currentEmployee.phone || '',
          phone2: currentEmployee.phone2 || '',
          whatsapp: currentEmployee.whatsapp || '',
          telegram: currentEmployee.telegram || '',
          age: currentEmployee.age || '',
          address: currentEmployee.address || '',
        });
      } else if (user) {
        setPersonalInfo({
          full_name: user.full_name || user.data?.full_name || '',
          phone: user.data?.phone || '',
          phone2: user.data?.phone2 || '',
          whatsapp: user.data?.whatsapp || '',
          telegram: user.data?.telegram || '',
          age: user.data?.age || '',
          address: user.data?.address || '',
        });
      }
    }
  }, [open, user?.email, currentEmployee]);

  const permissions = useMemo(() => {
    if (isOwner || currentEmployee?.is_admin) {
      return PERMISSION_LABELS.map(p => ({ ...p, granted: true }));
    }
    return PERMISSION_LABELS.map(p => ({ ...p, granted: can(p.key) }));
  }, [isOwner, currentEmployee, can]);

  const grantedCount = permissions.filter(p => p.granted).length;
  const lastLogin = currentEmployee?.last_login_at || user?.data?.last_login_at || user?.created_date;
  const deviceInfo = currentEmployee?.device_info || navigator.userAgent || '';

  const handleSavePersonalInfo = async () => {
    setSaving(true);
    try {
      if (isOwner || !currentEmployee) {
        // Owner — save via updateMe
        await base44.auth.updateMe({
          full_name: personalInfo.full_name,
          phone: personalInfo.phone,
          phone2: personalInfo.phone2,
          whatsapp: personalInfo.whatsapp,
          telegram: personalInfo.telegram,
          age: personalInfo.age ? Number(personalInfo.age) : null,
          address: personalInfo.address,
        });
      } else {
        // Employee — save to Employee entity
        await base44.entities.Employee.update(currentEmployee.id, {
          full_name: personalInfo.full_name,
          phone: personalInfo.phone,
          phone2: personalInfo.phone2,
          whatsapp: personalInfo.whatsapp,
          telegram: personalInfo.telegram,
          age: personalInfo.age ? Number(personalInfo.age) : null,
          address: personalInfo.address,
        });
        if (window.__barakatEmployee) {
          window.__barakatEmployee = { ...window.__barakatEmployee, ...personalInfo };
        }
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1500);
    } catch (err) {
      alert('Ошибка: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto custom-scroll bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
            <UserIcon className="w-5 h-5 text-indigo-500" />
            Мой профиль
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* === AVATAR === */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div onDoubleClick={() => setZoomOpen(true)} title="Двойной клик — увеличить" className="cursor-zoom-in">
                <EmployeeAvatar
                  avatarUrl={avatarUrl}
                  name={currentEmployee?.name || user?.full_name || user?.email || '?'}
                  isAdmin={currentEmployee?.is_admin}
                  profileSticker={profileSticker}
                  profileFrame={profileFrame}
                  size="lg"
                />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Фото профиля</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Загрузите своё фото или выберите из готовых</p>
              </div>
            </div>
            <AvatarPicker
              key={avatarUrl || 'none'}
              currentAvatar={avatarUrl}
              onSave={async (url) => {
                if (currentEmployee) {
                  await base44.entities.Employee.update(currentEmployee.id, { avatar_url: url });
                  if (window.__barakatEmployee) window.__barakatEmployee = { ...window.__barakatEmployee, avatar_url: url };
                } else {
                  await base44.auth.updateMe({ avatar_url: url });
                }
                setAvatarUrl(url);
              }}
            />
            <p className="text-[11px] text-slate-400 mt-3">Двойной клик по аватару — увеличить фото.</p>
          </div>

          {/* === РАМКА И СТИКЕР ПРОФИЛЯ === */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Рамка и стикер профиля</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Выберите рамку (4 варианта) и стикер — они отображаются во всех разделах, где виден ваш профиль.</p>
            <ProfileStylePicker
              currentEmployee={currentEmployee}
              user={user}
              onSaved={(field, value) => {
                if (field === 'profile_frame') setProfileFrame(value);
                if (field === 'profile_sticker') setProfileSticker(value);
              }}
            />
          </div>

          <ProfilePhotoZoom open={zoomOpen} onClose={() => setZoomOpen(false)} avatarUrl={avatarUrl} name={currentEmployee?.name || user?.full_name || user?.email || '?'} isAdmin={currentEmployee?.is_admin} profileSticker={profileSticker} profileFrame={profileFrame} />

          {/* === STREAK HERO === */}
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Flame className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-4xl font-black">{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} 🔥</p>
                <p className="text-sm text-white/80">подряд заходите в систему</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold">{totalDays}</p>
                <p className="text-xs text-white/70">всего дней</p>
              </div>
            </div>
          </div>

          {/* === PERSONAL INFO (editable for employees) === */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Личная информация</h3>
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={saving}>Отмена</Button>
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSavePersonalInfo} disabled={saving}>
                    {saving ? <><Loader2 className="w-3 h-3 animate-spin" />Сохранение...</> : saved ? <><CheckCircle2 className="w-3 h-3" />Сохранено!</> : <><Save className="w-3 h-3" />Сохранить</>}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>✏️ Редактировать</Button>
              )}
            </div>

            {editing ? (
              /* EDITABLE FORM */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><UserIcon className="w-3 h-3" />Полное имя</Label>
                  <Input value={personalInfo.full_name} onChange={e => setPersonalInfo(p => ({ ...p, full_name: e.target.value }))} placeholder="Иванов Иван Иванович" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Возраст</Label>
                  <Input type="number" value={personalInfo.age} onChange={e => setPersonalInfo(p => ({ ...p, age: e.target.value }))} placeholder="25" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Телефон 1</Label>
                  <Input value={personalInfo.phone} onChange={e => setPersonalInfo(p => ({ ...p, phone: e.target.value }))} placeholder="+992 XXX XX XX XX" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Телефон 2</Label>
                  <Input value={personalInfo.phone2} onChange={e => setPersonalInfo(p => ({ ...p, phone2: e.target.value }))} placeholder="+992 XXX XX XX XX" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" />WhatsApp</Label>
                  <Input value={personalInfo.whatsapp} onChange={e => setPersonalInfo(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+992 XXX XX XX XX" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" />Telegram</Label>
                  <Input value={personalInfo.telegram} onChange={e => setPersonalInfo(p => ({ ...p, telegram: e.target.value }))} placeholder="@username" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Адрес проживания</Label>
                  <Input value={personalInfo.address} onChange={e => setPersonalInfo(p => ({ ...p, address: e.target.value }))} placeholder="Город, улица, дом" className="h-9 text-sm bg-white dark:bg-slate-900" />
                </div>
              </div>
            ) : (
              /* READ-ONLY display */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={UserIcon} label="Имя" value={currentEmployee?.full_name || currentEmployee?.name || user?.full_name || user?.data?.full_name || '—'} />
                <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
                <InfoRow icon={Phone} label="Телефон 1" value={currentEmployee?.phone || user?.data?.phone || '—'} />
                <InfoRow icon={Phone} label="Телефон 2" value={currentEmployee?.phone2 || user?.data?.phone2 || '—'} />
                <InfoRow icon={MessageCircle} label="WhatsApp" value={currentEmployee?.whatsapp || user?.data?.whatsapp || '—'} />
                <InfoRow icon={MessageCircle} label="Telegram" value={currentEmployee?.telegram || user?.data?.telegram || '—'} />
                {(currentEmployee?.age || user?.data?.age) && <InfoRow icon={Calendar} label="Возраст" value={String(currentEmployee?.age || user?.data?.age)} />}
                {(currentEmployee?.address || user?.data?.address) && <InfoRow icon={MapPin} label="Адрес" value={currentEmployee?.address || user?.data?.address} />}
                <InfoRow icon={Crown} label="Роль" value={!currentEmployee ? '👑 Владелец' : currentEmployee.is_admin ? '🛡️ Администратор' : '👤 Сотрудник'} />
                <InfoRow icon={Calendar} label="В системе с" value={user?.created_date ? format(new Date(user.created_date), 'dd MMM yyyy') : '—'} />
                <InfoRow icon={Clock} label="Последний вход" value={lastLogin ? format(new Date(lastLogin), 'dd MMM yyyy, HH:mm') : '—'} />
              </div>
            )}
            {editing && (
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setEditing(false)} disabled={saving}>Отмена</Button>
                <Button className="flex-1 h-10 gap-2" onClick={handleSavePersonalInfo} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Сохранение...</> : saved ? <><CheckCircle2 className="w-4 h-4" />Сохранено!</> : <><Save className="w-4 h-4" />Сохранить</>}
                </Button>
              </div>
            )}

            {deviceInfo && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Устройство</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 break-all">{deviceInfo}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === BUSINESS INFO === */}
          {business && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Информация о бизнесе</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Building2} label="Название" value={business.name || '—'} />
                <InfoRow icon={Phone} label="Телефон" value={business.phone || '—'} />
                {business.phone2 && <InfoRow icon={Phone} label="Телефон 2" value={business.phone2} />}
                <InfoRow icon={MapPin} label="Адрес" value={business.address || '—'} />
                <InfoRow icon={Activity} label="Статус" value={business.is_active ? '✅ Активен' : '❌ Неактивен'} />
              </div>
            </div>
          )}

          {/* === PERMISSIONS === */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Разрешения</h3>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
                {grantedCount} / {permissions.length}
              </span>
            </div>
            {(isOwner || currentEmployee?.is_admin) && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {isOwner ? '✅ Полный доступ владельца — все разрешения активны' : '✅ Полный доступ администратора — все разрешения активны'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {permissions.map(p => (
                <div key={p.key} className={`flex items-center gap-2 p-2 rounded-lg ${p.granted ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700/40'}`}>
                  {p.granted
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                  <span className={`text-xs truncate ${p.granted ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {p.icon} {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* === ACTIVITY CALENDAR === */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Активность за 30 дней</h3>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-400 pb-1">{d}</div>
              ))}
              {calendar.map((day, i) => {
                const dayOfWeek = new Date(day.date).getDay();
                const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const isFirst = i === 0;
                return (
                  <React.Fragment key={day.date}>
                    {isFirst && offset > 0 && Array.from({ length: offset }).map((_, idx) => (
                      <div key={`empty-${idx}`} />
                    ))}
                    <div
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                        day.loggedIn
                          ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700/40 text-slate-400'
                      }`}
                      title={`${day.date} — ${day.loggedIn ? 'Был вход' : 'Нет входа'}`}
                    >
                      <span className="text-xs font-bold">{day.day}</span>
                      {day.loggedIn && <CheckCircle className="w-3 h-3 mt-0.5" />}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-green-500" />
                <span>Был вход</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/40" />
                <span>Нет входа</span>
              </div>
              <div className="ml-auto font-semibold text-slate-600 dark:text-slate-300">
                {calendar.filter(d => d.loggedIn).length} из {calendar.length} дней
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{value}</p>
      </div>
    </div>
  );
}