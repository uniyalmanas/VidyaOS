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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-white dark:bg-[#1C1C1E]">
          <VidyaLogo size="md" badgeText="SIGN IN" subtitle="Coaching & Education Center OS" />
          <button
            onClick={() => setShowLoginModal(false)}
            className="p-1 rounded-xl text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition cursor-pointer"
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
        <div className="px-6 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center space-x-2 text-[11px] text-[#86868B] font-apple-text">
          <ShieldCheck className="w-3.5 h-3.5 text-[#34C759] dark:text-[#30D158]" />
          <span>Role-Based Multi-Tenant Isolation · Firebase Encrypted</span>
        </div>
      </div>
    </div>
  );
};
