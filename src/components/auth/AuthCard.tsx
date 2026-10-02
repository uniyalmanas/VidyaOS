import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  KeyRound,
  UserCheck,
  Sparkles,
  Database,
  X
} from 'lucide-react';
import { ConsoleButton, VidyaLogo } from '../ui';

interface AuthCardProps {
  onSuccess?: () => void;
  onOpenRegister?: () => void;
  isModal?: boolean;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccess,
  onOpenRegister,
  isModal = false
}) => {
  const { navigate } = useRouter();
  const { switchRole, showToast, currentUser, currentOrg } = useApp();
  const {
    loginWithGoogle,
    loginWithPhonePassword,
    signupWithPhonePassword,
    loginWithPhoneOtp,
    sendPhoneOtp,
    loginAsDemoUser
  } = useAuth();

  // Mode: phone (default) | google | otp | signup
  const [activeTab, setActiveTab] = useState<'phone' | 'google' | 'otp' | 'signup'>('phone');

  // Phone + Password state
  const [phoneInput, setPhoneInput] = useState<string>('9897123456');
  const [phonePassword, setPhonePassword] = useState<string>('admin123');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'AUTO'>('AUTO');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // OTP state
  const [otpPhone, setOtpPhone] = useState<string>('9837199887');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [simulatedSmsToast, setSimulatedSmsToast] = useState<string | null>(null);

  // Signup state
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('CENTER_ADMIN');

  // UI status
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigateToRoleDashboard = (role: UserRole, targetOrgId?: string) => {
    switchRole(role);
    const org = targetOrgId || currentUser.orgId || currentOrg.id || 'org-apex';
    if (role === 'PLATFORM_OWNER') navigate('/owner');
    else if (role === 'CENTER_ADMIN' || role === 'STAFF') navigate(`/admin/${org}`);
    else if (role === 'TEACHER') navigate('/teacher');
    else if (role === 'PARENT') navigate('/parent');
    else if (role === 'STUDENT') navigate('/student');
    if (onSuccess) onSuccess();
  };

  // 1. Phone + Password Sign-In
  const handlePhonePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const targetRole = selectedRole === 'AUTO' ? undefined : selectedRole;
    const res = await loginWithPhonePassword(phoneInput, phonePassword, targetRole);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid mobile number or password.');
    } else {
      const finalRole = (targetRole as UserRole) || res.user?.role || 'CENTER_ADMIN';
      showToast(`Welcome back, ${res.user?.name || 'User'}!`, 'success');
      navigateToRoleDashboard(finalRole, res.user?.orgId);
    }
  };

  // 2. Google Sign-In
  const handleGoogleSignIn = async (roleOverride?: UserRole) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const targetRole = roleOverride || (selectedRole === 'AUTO' ? undefined : selectedRole);
    const res = await loginWithGoogle(targetRole);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Google Sign-In failed or popup was closed.');
    } else {
      const finalRole = res.user?.role || targetRole || 'CENTER_ADMIN';
      showToast(`Logged in via Google as ${finalRole.replace('_', ' ')}`, 'success');
      navigateToRoleDashboard(finalRole, res.user?.orgId);
    }
  };

  // 3. Send & Verify OTP
  const handleSendOtpAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await sendPhoneOtp(otpPhone);
    setLoading(false);

    if (res.success && res.otp) {
      setOtpSent(true);
      setOtpCode(res.otp);
      setSimulatedSmsToast(`Simulated SMS delivered: Your OTP is ${res.otp}. Valid for 10 minutes.`);
    } else {
      setErrorMessage(res.message || 'Failed to send OTP. Please check mobile number.');
    }
  };

  const handleVerifyOtpAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await loginWithPhoneOtp(otpPhone, otpCode);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Verification failed. Please enter the valid OTP.');
    } else {
      setSimulatedSmsToast(null);
      const role = res.user?.role || 'PARENT';
      showToast(`Verified via OTP! Welcome ${res.user?.name || ''}`, 'success');
      navigateToRoleDashboard(role, res.user?.orgId);
    }
  };

  // 4. Create Person Account
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await signupWithPhonePassword(regName, regPhone, regPassword, regRole);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to register account.');
    } else {
      setSuccessMessage('Account created and saved in Firestore! Redirecting...');
      setTimeout(() => {
        navigateToRoleDashboard(regRole);
      }, 700);
    }
  };

  // Quick 1-Click Demo Personas
  const demoPersonas = [
    {
      role: 'CENTER_ADMIN' as UserRole,
      label: 'Admin',
      phone: '9897123456',
      pwd: 'admin123',
      name: 'Er. Manoj Verma',
      icon: Building2,
      badgeColor: 'text-[#E65100] dark:text-[#FFD54F]'
    },
    {
      role: 'STAFF' as UserRole,
      label: 'Staff Desk',
      phone: '9876543299',
      pwd: 'staff123',
      name: 'Pooja Verma',
      icon: UserCheck,
      badgeColor: 'text-[#1A73E8]'
    },
    {
      role: 'TEACHER' as UserRole,
      label: 'Faculty',
      phone: '9760033445',
      pwd: 'teacher123',
      name: 'Prof. Anjali Sharma',
      icon: BookOpen,
      badgeColor: 'text-[#039BE5]'
    },
    {
      role: 'PARENT' as UserRole,
      label: 'Parent',
      phone: '9837199887',
      pwd: 'parent123',
      name: 'Rajesh Sharma',
      icon: Users,
      badgeColor: 'text-[#00C853]'
    },
    {
      role: 'STUDENT' as UserRole,
      label: 'Student',
      phone: '9837199880',
      pwd: 'student123',
      name: 'Rahul Sharma',
      icon: GraduationCap,
      badgeColor: 'text-[#AB47BC]'
    },
    {
      role: 'PLATFORM_OWNER' as UserRole,
      label: 'SaaS Owner',
      phone: '9999911223',
      pwd: 'owner123',
      name: 'Kunal Singhal',
      icon: ShieldCheck,
      badgeColor: 'text-[#FF5722]'
    }
  ];

  return (
    <div className="w-full space-y-4">
      {/* Simulated SMS Toast */}
      {simulatedSmsToast && (
        <div className="bg-[#188038] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{simulatedSmsToast}</span>
          </div>
          <button
            onClick={() => setSimulatedSmsToast(null)}
            className="text-white hover:text-emerald-200 ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0"></span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* One-Click Google Sign-In Hero Button */}
      <div>
        <button
          type="button"
          onClick={() => handleGoogleSignIn()}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white dark:bg-[#1C1C1E] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-full text-xs font-semibold transition border border-black/[0.1] dark:border-white/[0.12] flex items-center justify-center space-x-2.5 shadow-2xs cursor-pointer font-apple-text"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{loading ? 'Authenticating...' : 'Continue with Google Account'}</span>
        </button>
      </div>

      {/* Clean Divider */}
      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-black/[0.08] dark:border-white/[0.08] w-full"></div>
        <span className="bg-white dark:bg-[#1C1C1E] px-3 text-[10px] uppercase font-bold text-[#86868B] tracking-wider shrink-0 font-apple-text">
          or sign in with credentials
        </span>
      </div>

      {/* Segmented Mode Selector */}
      <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold font-apple-text">
        <button
          type="button"
          onClick={() => { setActiveTab('phone'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 rounded-full transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeTab === 'phone'
              ? 'bg-white dark:bg-[#1C1C1E] text-[#E65100] dark:text-[#FFCA28] font-bold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#FFA000]" />
          <span>Mobile & Password</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('otp'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 rounded-full transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeTab === 'otp'
              ? 'bg-white dark:bg-[#1C1C1E] text-[#0071E3] dark:text-[#2997FF] font-bold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>SMS OTP</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
          className={`flex-1 py-1.5 rounded-full transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeTab === 'signup'
              ? 'bg-white dark:bg-[#1C1C1E] text-[#34C759] dark:text-[#30D158] font-bold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>New Account</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: PHONE & PASSWORD                                 */}
      {/* ======================================================== */}
      {activeTab === 'phone' && (
        <form onSubmit={handlePhonePasswordSubmit} className="space-y-3.5">
          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
              Select Workspace Role
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
            >
              <option value="AUTO">✨ Auto-Detect Role from Account</option>
              <option value="CENTER_ADMIN">🏢 Coaching Center Director / Admin</option>
              <option value="STAFF">📋 Front Desk Reception & Counter Staff</option>
              <option value="TEACHER">👨‍🏫 Faculty / Subject Teacher</option>
              <option value="PARENT">👨‍👩‍👦 Parent / Guardian</option>
              <option value="STUDENT">🎓 Student / Batch Attendee</option>
              <option value="PLATFORM_OWNER">👑 SaaS Platform Owner (Super Admin)</option>
            </select>
          </div>

          {/* Mobile input */}
          <div>
            <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
              Mobile Number
            </label>
            <div className="flex rounded-lg border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden focus-within:ring-2 focus-within:ring-[#FFA000]/40">
              <span className="bg-[#F1F3F4] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] font-semibold text-xs px-3 py-2 flex items-center border-r border-[#DADCE0] dark:border-[#3C4043]">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="98971 23456"
                className="flex-1 px-3 py-2 text-xs font-mono font-bold text-[#202124] dark:text-white bg-white dark:bg-[#282A2C] focus:outline-none"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
              Account Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={phonePassword}
                onChange={e => setPhonePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-3 pr-10 py-2 text-xs font-medium rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <ConsoleButton
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full justify-center"
            icon={<Lock className="w-3.5 h-3.5" />}
          >
            Sign In to Dashboard
          </ConsoleButton>
        </form>
      )}

      {/* ======================================================== */}
      {/* MODE 2: SMS OTP                                          */}
      {/* ======================================================== */}
      {activeTab === 'otp' && (
        <div className="space-y-3.5">
          {!otpSent ? (
            <form onSubmit={handleSendOtpAction} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Enter Mobile Number for SMS OTP
                </label>
                <div className="flex rounded-lg border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden focus-within:ring-2 focus-within:ring-[#FFA000]/40">
                  <span className="bg-[#F1F3F4] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] font-semibold text-xs px-3 py-2 flex items-center border-r border-[#DADCE0] dark:border-[#3C4043]">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={otpPhone}
                    onChange={e => setOtpPhone(e.target.value)}
                    placeholder="98371 99887"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold text-[#202124] dark:text-white bg-white dark:bg-[#282A2C] focus:outline-none"
                  />
                </div>
              </div>

              <ConsoleButton
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full justify-center"
                icon={<Smartphone className="w-3.5 h-3.5" />}
              >
                Send 6-Digit Verification Code
              </ConsoleButton>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtpAction} className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">
                  Code sent to <strong>+91 {otpPhone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-[#1A73E8] dark:text-[#8AB4F8] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                />
              </div>

              <ConsoleButton
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full justify-center"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Verify & Enter Dashboard
              </ConsoleButton>
            </form>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 3: CREATE NEW ACCOUNT                               */}
      {/* ======================================================== */}
      {activeTab === 'signup' && (
        <form onSubmit={handleSignupSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Chandra"
              value={regName}
              onChange={e => setRegName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
              Mobile Number
            </label>
            <div className="flex rounded-lg border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden focus-within:ring-2 focus-within:ring-[#FFA000]/40">
              <span className="bg-[#F1F3F4] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] font-semibold text-xs px-3 py-2 flex items-center border-r border-[#DADCE0] dark:border-[#3C4043]">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="98765 43210"
                className="flex-1 px-3 py-2 text-xs font-mono font-bold text-[#202124] dark:text-white bg-white dark:bg-[#282A2C] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                Account Role
              </label>
              <select
                value={regRole}
                onChange={e => setRegRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              >
                <option value="CENTER_ADMIN">Center Director</option>
                <option value="STAFF">Front Desk Staff</option>
                <option value="TEACHER">Faculty</option>
                <option value="PARENT">Parent</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="4+ characters"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
              />
            </div>
          </div>

          <ConsoleButton
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full justify-center"
            icon={<UserCheck className="w-3.5 h-3.5" />}
          >
            Create Person Account
          </ConsoleButton>
        </form>
      )}

      {/* Quick 1-Click Demo Personas Strip */}
      <div className="pt-2 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2 font-apple-text">
        <div className="flex items-center justify-between text-[11px] text-[#86868B] font-semibold">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FFA000]" />
            1-Click Demo Testing:
          </span>
          <span className="text-[10px] text-[#86868B]">Click to load & sign in</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {demoPersonas.map(persona => (
            <button
              key={persona.label}
              type="button"
              onClick={() => {
                setPhoneInput(persona.phone);
                setPhonePassword(persona.pwd);
                setSelectedRole(persona.role);
                loginAsDemoUser(
                  persona.role === 'CENTER_ADMIN' ? 'user-apex-admin' :
                  persona.role === 'STAFF' ? 'user-apex-staff' :
                  persona.role === 'TEACHER' ? 'user-teacher-sharma' :
                  persona.role === 'PARENT' ? 'user-parent-rajesh' :
                  persona.role === 'STUDENT' ? 'user-stud-rahul' :
                  'user-platform-owner'
                );
                showToast(`Logged in as ${persona.label} (${persona.name})`, 'success');
                navigateToRoleDashboard(persona.role);
              }}
              className="px-1.5 py-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] hover:border-[#FFA000] dark:hover:border-[#FFA000] transition flex flex-col items-center justify-center text-center cursor-pointer group shadow-2xs"
              title={`1-Click login as ${persona.name}`}
            >
              <persona.icon className={`w-3.5 h-3.5 ${persona.badgeColor} group-hover:scale-110 transition`} />
              <span className="text-[10px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 line-clamp-1">
                {persona.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Register Callout */}
      {onOpenRegister && (
        <div className="pt-2 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
          Are you a Coaching Center Director?{' '}
          <button
            type="button"
            onClick={onOpenRegister}
            className="font-bold text-[#E65100] dark:text-[#FFD54F] hover:underline cursor-pointer"
          >
            Register Center Free (14-Day Trial) →
          </button>
        </div>
      )}
    </div>
  );
};
