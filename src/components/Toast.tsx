import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
  isError?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isError }) => {
  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border text-sm transition-all duration-300 animate-slide-up ${
        isError
          ? 'bg-[#1a1219] border-red-500/40 border-l-4 border-l-red-500 text-red-200'
          : 'bg-[#131c2e] border-[#253449] border-l-4 border-l-[#10b981] text-[#f1f5f9]'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
};
