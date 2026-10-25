import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

// Общая оболочка для публичных страниц (доступны без входа в систему)
export default function PublicPageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 lg:px-8 gap-4 flex-shrink-0">
        <Link to="/About" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">BarakatCRM</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          <Link to="/About" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            О системе
          </Link>
          <Link to="/Contact" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Контакты
          </Link>
          <Link to="/" className="ml-1 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
            Войти
          </Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 py-6 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>© {new Date().getFullYear()} BarakatCRM — система для оптовой продажи обуви</span>
          <div className="flex items-center gap-4">
            <Link to="/About" className="hover:text-indigo-600 dark:hover:text-indigo-400">О системе</Link>
            <Link to="/Contact" className="hover:text-indigo-600 dark:hover:text-indigo-400">Контакты</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}