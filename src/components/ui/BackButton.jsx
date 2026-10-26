import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ className = '', variant }) {
  const navigate = useNavigate();
  if (variant === 'terminal') {
    return (
      <button
        onClick={() => navigate(-1)}
        className={`tk-btn ${className}`}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Назад
      </button>
    );
  }
  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Назад
    </button>
  );
}