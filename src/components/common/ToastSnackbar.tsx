import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastSnackbar: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-[#202124] dark:bg-[#E3E3E3] text-white dark:text-[#202124] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm max-w-md border border-[#3C4043] dark:border-[#DADCE0]">
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#81C995] dark:text-[#188038] flex-shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#F28B82] dark:text-[#D93025] flex-shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#FDD663] dark:text-[#F29900] flex-shrink-0" />}
        {toast.type === 'info' && <Info className="w-4 h-4 text-[#8AB4F8] dark:text-[#1A73E8] flex-shrink-0" />}
        <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
      </div>
    </div>
  );
};
