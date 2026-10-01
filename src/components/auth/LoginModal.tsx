import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { VidyaLogo } from '../ui';
import { AuthCard } from './AuthCard';
import { X, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  onOpenRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onOpenRegister }) => {
  const { showLoginModal, setShowLoginModal, isAuthenticated } = useAuth();

  if (!showLoginModal && isAuthenticated) return null;
  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-3xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
          <VidyaLogo size="md" badgeText="SIGN IN" subtitle="Coaching & Education Center OS" />
          <button
            onClick={() => setShowLoginModal(false)}
            className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with AuthCard */}
        <div className="p-6">
          <AuthCard
            isModal={true}
            onSuccess={() => setShowLoginModal(false)}
            onOpenRegister={() => {
              setShowLoginModal(false);
              if (onOpenRegister) onOpenRegister();
            }}
          />
        </div>

        {/* Security Footer */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-[#282A2C] border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-center space-x-1.5 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
          <span>Role-Based Access Control · Firestore Encrypted</span>
        </div>
      </div>
    </div>
  );
};
