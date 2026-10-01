import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { UserRole } from '../../types';
import { ShieldAlert, Lock, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, currentUser, setShowLoginModal } = useAuth();
  const { navigate } = useRouter();

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1E1F20] p-8 rounded-3xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-[#FFA000] rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#202124] dark:text-[#E8EAED]">Authentication Required</h2>
          <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
            Please log in with your verified credentials or select an account to access this module.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full py-2.5 bg-[#FFA000] hover:bg-[#FF8F00] text-slate-950 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Open VidyaOS Login</span>
          </button>
        </div>
      </div>
    );
  }

  // If allowedRoles is specified, check RBAC permission
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1E1F20] p-8 rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#202124] dark:text-[#E8EAED]">Access Restricted</h2>
          <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
            Your current logged-in role (<strong className="text-[#202124] dark:text-white">{currentUser.role}</strong>) does not have authorization to view this area.
          </p>
          <div className="bg-[#F8F9FA] dark:bg-[#282A2C] p-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-left text-xs text-[#5F6368] dark:text-[#9AA0A6] space-y-1">
            <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">Required Role:</span>
            <div className="font-mono text-[#E65100] dark:text-[#FFCA28] font-bold">{allowedRoles.join(' OR ')}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const myPortal = currentUser.role === 'CENTER_ADMIN' ? '/admin'
                  : currentUser.role === 'TEACHER' ? '/teacher'
                  : currentUser.role === 'PARENT' ? '/parent'
                  : currentUser.role === 'STUDENT' ? '/student'
                  : currentUser.role === 'PLATFORM_OWNER' ? '/owner'
                  : '/';
                navigate(myPortal);
              }}
              className="flex-1 py-2 bg-[#FFA000] text-slate-950 rounded-xl text-xs font-bold hover:bg-[#FF8F00] transition cursor-pointer"
            >
              Return to My Portal
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex-1 py-2 bg-[#202124] dark:bg-[#303134] text-white rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
