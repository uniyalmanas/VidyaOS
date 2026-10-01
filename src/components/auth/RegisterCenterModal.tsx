import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import {
  Building2,
  Sparkles,
  CheckCircle2,
  Smartphone,
  MapPin,
  ArrowRight,
  X,
  ShieldCheck,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Info
} from 'lucide-react';
import { IndianBoard } from '../../types';
import { ConsoleButton, VidyaLogo } from '../ui';
import { doc, setDoc, db } from '../../lib/firebase';

interface RegisterCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: 'starter' | 'growth' | 'pro';
}

export const RegisterCenterModal: React.FC<RegisterCenterModalProps> = ({
  isOpen,
  onClose,
  initialPlanId = 'growth'
}) => {
  const { createNewOrganization, setCurrentOrgId, switchRole, showToast } = useApp();
  const { setShowLoginModal, signupWithPhonePassword, loginWithGoogle, updateUserProfile } = useAuth();
  const { navigate } = useRouter();

  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>('phone');
  const [selectedPlanId, setSelectedPlanId] = useState<'starter' | 'growth' | 'pro'>(initialPlanId);

  React.useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  const [centerName, setCenterName] = useState<string>('');
  const [directorName, setDirectorName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [city, setCity] = useState<string>('Delhi');
  const [state, setState] = useState<string>('Delhi NCR');
  const [centerType, setCenterType] = useState<IndianBoard>('Board level');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Phone + Password Registration
  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCenter = centerName.trim();
    const cleanDirector = directorName.trim();
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const cleanPwd = password.trim();

    if (!cleanCenter) {
      setErrorMessage('Please enter your coaching center name.');
      return;
    }
    if (!cleanDirector) {
      setErrorMessage('Please enter the Director or Owner name.');
      return;
    }
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanPwd || cleanPwd.length < 4) {
      setErrorMessage('Please create a secure password (minimum 4 characters).');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Organization without requiring UPI ID upfront
      const newOrg = createNewOrganization({
        name: cleanCenter,
        ownerName: cleanDirector,
        phone: `+91 ${cleanDigits.slice(-10)}`,
        city: city.trim() || 'Delhi',
        state: state.trim() || 'Delhi NCR',
        upiId: `${cleanCenter.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`, // default placeholder until updated in Settings
        upiMerchantName: cleanCenter.toUpperCase(),
        tagline: centerType === 'Board level' ? 'Premier Board Level Institute' : centerType === 'Coaching' ? 'Premier Coaching Institute' : 'Premier Board Level & Coaching Institute',
        planId: selectedPlanId
      });

      // 2. Create Director user account & save credentials in Firestore
      const authRes = await signupWithPhonePassword(
        cleanDirector,
        cleanDigits,
        cleanPwd,
        'CENTER_ADMIN',
        newOrg.id
      );

      if (!authRes.success) {
        setErrorMessage(authRes.error || 'Failed to create center admin account.');
        setLoading(false);
        return;
      }

      // Provision 1 Front Desk Staff Account for this center
      try {
        const staffPhone = cleanDigits.slice(0, 9) + (cleanDigits.endsWith('9') ? '8' : '9');
        const staffDocId = `staff-${newOrg.id}`;
        await setDoc(doc(db, 'users', staffDocId), {
          id: staffDocId,
          orgId: newOrg.id,
          role: 'STAFF',
          name: 'Front Desk Reception',
          phone: `+91 ${staffPhone}`,
          email: `desk@${newOrg.slug || 'center'}.in`,
          password: 'staff123',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=FrontDesk`,
          createdAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'credentials', staffPhone), {
          phone: staffPhone,
          userId: staffDocId,
          password: 'staff123',
          role: 'STAFF',
          name: 'Front Desk Reception',
          email: `desk@${newOrg.slug || 'center'}.in`,
          orgId: newOrg.id,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Front desk staff provisioning warning:', err);
      }

      // 3. Set active organization & switch role
      localStorage.setItem('vidyaos_current_org_id', newOrg.id);
      setCurrentOrgId(newOrg.id);
      switchRole('CENTER_ADMIN');

      setLoading(false);
      setSuccess(true);
      showToast(`Coaching Center "${cleanCenter}" successfully registered!`, 'success');

      setTimeout(() => {
        setSuccess(false);
        onClose();
        setShowLoginModal(false);
        navigate(`/admin/${newOrg.id}`);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  // Handle Google / Gmail Registration
  const handleGoogleRegister = async () => {
    setErrorMessage(null);
    const cleanCenter = centerName.trim() || 'My Coaching Institute';

    setLoading(true);
    try {
      const res = await loginWithGoogle('CENTER_ADMIN');
      if (!res.success) {
        setErrorMessage(res.error || 'Google Sign-In was cancelled or failed.');
        setLoading(false);
        return;
      }

      const user = res.user;
      const ownerName = user?.name || directorName.trim() || 'Director';
      const ownerEmail = user?.email || 'admin@coaching.in';

      // Create Organization linked to Google user
      const newOrg = createNewOrganization({
        name: cleanCenter,
        ownerName,
        email: ownerEmail,
        phone: user?.phone || (phone ? `+91 ${phone.replace(/[^0-9]/g, '').slice(-10)}` : '+91 98765 43210'),
        city: city.trim() || 'Delhi',
        state: state.trim() || 'Delhi NCR',
        upiId: `${cleanCenter.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`,
        upiMerchantName: cleanCenter.toUpperCase(),
        tagline: centerType === 'Board level' ? 'Premier Board Level Institute' : centerType === 'Coaching' ? 'Premier Coaching Institute' : 'Premier Board Level & Coaching Institute',
        planId: selectedPlanId
      });

      // Directly bind the authenticated user to this newly registered organization!
      await updateUserProfile({ orgId: newOrg.id, role: 'CENTER_ADMIN' });
      if (user?.id) {
        try {
          await setDoc(doc(db, 'users', user.id), {
            orgId: newOrg.id,
            role: 'CENTER_ADMIN',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Firestore user org link update warning:', e);
        }
      }

      // Provision 1 Front Desk Staff Account for this Google-registered center
      try {
        const baseDigits = user?.phone ? user.phone.replace(/[^0-9]/g, '').slice(-10) : '9876500000';
        const staffPhone = baseDigits.slice(0, 9) + (baseDigits.endsWith('9') ? '8' : '9');
        const staffDocId = `staff-${newOrg.id}`;
        await setDoc(doc(db, 'users', staffDocId), {
          id: staffDocId,
          orgId: newOrg.id,
          role: 'STAFF',
          name: 'Front Desk Reception',
          phone: `+91 ${staffPhone}`,
          email: `desk@${newOrg.slug || 'center'}.in`,
          password: 'staff123',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=FrontDesk`,
          createdAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'credentials', staffPhone), {
          phone: staffPhone,
          userId: staffDocId,
          password: 'staff123',
          role: 'STAFF',
          name: 'Front Desk Reception',
          email: `desk@${newOrg.slug || 'center'}.in`,
          orgId: newOrg.id,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Google registration staff provisioning warning:', err);
      }

      localStorage.setItem('vidyaos_current_org_id', newOrg.id);
      setCurrentOrgId(newOrg.id);
      switchRole('CENTER_ADMIN');

      setLoading(false);
      setSuccess(true);
      showToast(`Coaching Center "${cleanCenter}" linked to Google account!`, 'success');

      setTimeout(() => {
        setSuccess(false);
        onClose();
        setShowLoginModal(false);
        navigate(`/admin/${newOrg.id}`);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-lg rounded-2xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between bg-white dark:bg-[#1E1F20]">
          <VidyaLogo size="md" badgeText="14-DAY TRIAL" subtitle="Register your coaching center in 60 seconds" />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#E6F4EA] dark:bg-emerald-950/60 text-[#188038] dark:text-[#81C995] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
              {centerName || 'Your Coaching Center'} is Live!
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Your isolated coaching console is provisioned. Loading Center Admin Dashboard...
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* 3-Tier Plan Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED]">Choose Your VidyaOS Plan</span>
                <span className="text-[10px] font-bold text-[#188038] dark:text-[#81C995] bg-[#E6F4EA] dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-[#CEEAD6] dark:border-emerald-800/40">
                  14-Day Free Trial
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'starter',
                    name: 'Starter Batch',
                    price: '₹599/mo',
                    students: '100 Students',
                    branches: '1 Branch'
                  },
                  {
                    id: 'growth',
                    name: 'Growth Academy',
                    price: '₹1,299/mo',
                    students: '300 Students',
                    branches: '2 Branches',
                    popular: true
                  },
                  {
                    id: 'pro',
                    name: 'Multi-Branch Pro',
                    price: '₹2,199/mo',
                    students: '1,000 Students',
                    branches: '5 Branches'
                  }
                ].map(p => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-2 border-[#FFA000] bg-amber-50/50 dark:bg-amber-950/30 shadow-sm'
                          : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] opacity-75 hover:opacity-100'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2 right-1.5 bg-[#FFA000] text-slate-950 text-[8px] font-extrabold px-1 rounded-sm shadow-xs">
                          POPULAR
                        </span>
                      )}
                      <div>
                        <div className="text-[11px] font-bold text-[#202124] dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-xs font-bold text-[#E65100] dark:text-[#FFCA28] mt-0.5">
                          {p.price}
                        </div>
                      </div>
                      <div className="text-[9px] text-[#5F6368] dark:text-[#9AA0A6] mt-1 leading-tight">
                        {p.students} • {p.branches}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auth Method Switcher Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); setErrorMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMethod === 'phone'
                    ? 'bg-white dark:bg-[#1E1F20] text-[#E65100] dark:text-[#FFD54F] shadow-sm'
                    : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone & Password</span>
              </button>

              <button
                type="button"
                onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMethod === 'google'
                    ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-sm'
                    : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Gmail / Google Sign-In</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {authMethod === 'phone' ? (
              <form onSubmit={handlePhoneRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                    Coaching & Education Center Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={centerName}
                    onChange={e => setCenterName(e.target.value)}
                    placeholder="e.g. Apex IIT Academy, Sharma Physics Classes"
                    className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      Director / Owner Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={directorName}
                      onChange={e => setDirectorName(e.target.value)}
                      placeholder="e.g. Er. Manoj Verma"
                      className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      WhatsApp Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#282A2C] text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full px-3 py-2 rounded-r-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-xs font-mono font-medium text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                    Create Admin Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter 4+ character password for admin login"
                      className="w-full pl-8 pr-10 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-xs text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                    <Lock className="w-3.5 h-3.5 text-[#5F6368] dark:text-[#9AA0A6] absolute left-2.5 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    Saved in Firestore database. You can log into the Center Admin panel anytime using this phone & password.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      City & State
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Kota, Rajasthan"
                      className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      Institute Focus / Program
                    </label>
                    <select
                      value={centerType}
                      onChange={e => setCenterType(e.target.value as IndianBoard)}
                      className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    >
                      <option value="Board level">Board level</option>
                      <option value="Coaching">Coaching</option>
                      <option value="Board level & Coaching">Board level & Coaching</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <ConsoleButton
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    className="w-full justify-center"
                    iconRight={<ArrowRight className="w-4 h-4" />}
                  >
                    Register Center & Open Admin Console
                  </ConsoleButton>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                    Coaching Center Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={centerName}
                    onChange={e => setCenterName(e.target.value)}
                    placeholder="e.g. Apex IIT Academy, Resonance Point"
                    className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      City & State
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Kota, Rajasthan"
                      className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-1">
                      Institute Focus / Program
                    </label>
                    <select
                      value={centerType}
                      onChange={e => setCenterType(e.target.value as IndianBoard)}
                      className="w-full px-3 py-2 text-xs border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40"
                    >
                      <option value="Board level">Board level</option>
                      <option value="Coaching">Coaching</option>
                      <option value="Board level & Coaching">Board level & Coaching</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-800/40 flex items-start space-x-2 text-[11px] text-blue-800 dark:text-blue-200">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Your Google account will be designated as the <strong>Center Admin / Owner</strong> for this coaching institute.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleRegister}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-white dark:bg-[#282A2C] hover:bg-slate-50 dark:hover:bg-[#3C4043] text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition border border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-center space-x-2.5 shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{loading ? 'Connecting with Google...' : 'Continue with Google & Create Center'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-[11px] text-[#5F6368] dark:text-[#9AA0A6] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
              <span>14-day free trial · 100% Tenant data isolation · Zero setup fee</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
