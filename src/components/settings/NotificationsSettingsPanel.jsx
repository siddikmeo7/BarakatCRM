import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/components/i18n/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, MessageCircle, Mail } from 'lucide-react';
import TelegramNotificationsPanel from './TelegramNotificationsPanel';
import WhatsAppNotificationsPanel from './WhatsAppNotificationsPanel';

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'tj', label: 'Тоҷикӣ' },
  { value: 'en', label: 'English' }
];

export default function NotificationsSettingsPanel({ business, onUpdate, lang, user, currentEmployee, canPerm, loadData, formData, setFormData }) {
  return (
    <div className="space-y-4">
      {/* WhatsApp */}
      <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t(lang, 'settings_notif_wa')}</h4>
          <p className="text-sm text-slate-500 mb-3">{t(lang, 'settings_notif_wa_desc')}</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="whatsapp"
              checked={user?.whatsapp_notifications !== false}
              onChange={async (e) => {
                await base44.auth.updateMe({ whatsapp_notifications: e.target.checked });
                if (loadData) loadData();
              }}
              className="w-4 h-4"
            />
            <label htmlFor="whatsapp" className="text-sm text-slate-700 dark:text-slate-300">
              {t(lang, 'settings_notif_wa_enable')}
            </label>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t(lang, 'settings_notif_email')}</h4>
          <p className="text-sm text-slate-500 mb-3">{t(lang, 'settings_notif_email_desc')}</p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="email"
              checked={user?.email_notifications !== false}
              onChange={async (e) => {
                await base44.auth.updateMe({ email_notifications: e.target.checked });
                if (loadData) loadData();
              }}
              className="w-4 h-4"
            />
            <label htmlFor="email" className="text-sm text-slate-700 dark:text-slate-300">
              {t(lang, 'settings_notif_email_enable')}
            </label>
          </div>
        </div>
      </div>

      {/* Telegram */}
      {(!currentEmployee || canPerm('manage_telegram')) && business && (
        <TelegramNotificationsPanel business={business} onUpdate={onUpdate} />
      )}

      {/* WhatsApp broadcast recipients */}
      {(!currentEmployee || canPerm('manage_telegram')) && business && (
        <WhatsAppNotificationsPanel business={business} onUpdate={onUpdate} />
      )}

      {/* Info block */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">{t(lang, 'settings_notif_when')}</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>• При продаже товара в долг клиенту</li>
              <li>• При частичной оплате долга</li>
              <li>• При полном погашении долга</li>
              <li>• При малом остатке товаров (Telegram + WhatsApp)</li>
              <li>• Ручная рассылка любого сообщения (WhatsApp)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Language selector */}
      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <h4 className="font-medium text-slate-900 dark:text-white mb-2">{t(lang, 'settings_notif_lang')}</h4>
        <Select
          value={user?.language || formData?.language}
          onValueChange={async (v) => {
            await base44.auth.updateMe({ language: v });
            if (setFormData && formData) setFormData({ ...formData, language: v });
            if (loadData) loadData();
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(l => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}