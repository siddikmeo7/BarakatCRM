import React from 'react';
import BackButton from '@/components/ui/BackButton';
import { Database, KeyRound, HardDrive, Server, Wallet, Bell, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';

// Пошаговый план переноса BarakatCRM со платформы Base44 на собственный сервер.
// Показывается владельцу бизнеса: что переносится, что нужно заменить и в каком порядке.
const STEPS = [
  {
    icon: Database,
    title: '1. Выгрузить данные',
    text: 'Все бизнес-данные (товары, склады, продажи, клиенты, долги, расходы, сотрудники, зарплаты, история) выгружаются в стандартные таблицы и Excel. В приложении уже работают экспорт в Excel и постоянная синхронизация в PostgreSQL — значит, копия данных у вас есть всегда.',
  },
  {
    icon: Server,
    title: '2. Поднять сервер и базу',
    text: 'Арендовать сервер (VPS) или взять свой, установить PostgreSQL и разместить там выгруженные таблицы. База и её структура у вас уже описаны — их можно перенести без переписывания данных.',
  },
  {
    icon: HardDrive,
    title: '3. Перенести интерфейс',
    text: 'Код приложения (React) переносится на ваш сервер как обычный сайт: страницы, таблицы, отчёты, дизайн остаются теми же. Сборка запускается на вашем сервере, без платформы.',
  },
  {
    icon: KeyRound,
    title: '4. Заменить вход и права',
    text: 'Платформенный вход (коды доступа, роли, права сотрудников) нужно заменить своим: база пользователей и проверка прав переезжают на ваш сервер. Логику ролей и прав переносим как есть.',
  },
  {
    icon: Wallet,
    title: '5. Подключить платежи и уведомления',
    text: 'Оплата подписки подключается напрямую к Alif Bank (без посредников), уведомления — к вашему Telegram-боту и почтовому сервису. Ключи доступа будут вашими и хранятся только у вас.',
  },
  {
    icon: Globe,
    title: '6. Переключить домен',
    text: 'Когда всё работает на вашем сервере, домен переводится на новый хостинг. Пользователи заходят по тому же адресу, ничего не замечая.',
  },
];

const ALREADY_READY = [
  'Данные хранятся в обычных таблицах — их можно выгрузить и перенести',
  'Работает синхронизация в PostgreSQL: копия данных в стандартной базе',
  'Есть экспорт в Excel по товарам, продажам и отчётам',
  'Оплата подписки строится на прямом API Alif Bank, а не на посреднике',
  'Уведомления (Telegram, WhatsApp, почта) работают через ваши ключи',
];

const TO_REPLACE = [
  { what: 'Хостинг и сборка сайта', how: 'Ваш сервер (VPS или собственный)' },
  { what: 'База данных', how: 'PostgreSQL на вашем сервере' },
  { what: 'Файлы и фото товаров', how: 'Ваше хранилище файлов (S3-совместимое)' },
  { what: 'Вход пользователей и коды', how: 'Свой вход на сервере' },
  { what: 'Backend-функции и автоматизации', how: 'Ваш сервис + планировщик задач' },
];

export default function MigrationPlan() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      <BackButton />
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Свой сервер и независимость от платформы</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Что именно нужно, чтобы BarakatCRM работал полностью на ваших серверах и под вашим контролем
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Важно понимать</p>
          <p className="mt-1">
            Перенос — это отдельный проект (обычно 2–6 недель работы разработчика), а не одна кнопка.
            Пока приложение работает на платформе, оно зависит от неё. Данные при этом остаются вашими:
            их можно выгрузить в любой момент, копия в PostgreSQL и Excel обновляется постоянно.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
        <p className="font-semibold text-slate-900 dark:text-white mb-3">Что уже готово к переезду</p>
        <ul className="space-y-2">
          {ALREADY_READY.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-none mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
        <p className="font-semibold text-slate-900 dark:text-white mb-3">Что придётся заменить</p>
        <div className="space-y-2">
          {TO_REPLACE.map((row) => (
            <div key={row.what} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 sm:w-1/2">{row.what}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{row.how}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => (
          <div key={step.title} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-none">
              <step.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">{step.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex gap-3">
        <Bell className="w-5 h-5 text-slate-400 flex-none mt-0.5" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Когда решите начать перенос — скажите, и я подготовлю точный список таблиц, файлов и функций
          к выгрузке, чтобы работу можно было передать любому разработчику.
        </p>
      </div>
    </div>
  );
}