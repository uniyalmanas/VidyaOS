import React, { useState, useEffect } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { UserRole } from './types';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastSnackbar } from './components/common/ToastSnackbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ParentPortal } from './components/parent/ParentPortal';
import { TeacherPortal } from './components/teacher/TeacherPortal';
import { StudentPortal } from './components/student/StudentPortal';
import { PlatformDashboard } from './components/saas-owner/PlatformDashboard';
import { ArchitectureModal } from './components/architecture/ArchitectureModal';
import { ReceiptModal } from './components/common/ReceiptModal';
import { UpiPaymentModal } from './components/common/UpiPaymentModal';
import { WhatsAppShareModal } from './components/common/WhatsAppShareModal';
import { HelpSupportModal } from './components/common/HelpSupportModal';
import { LoginModal } from './components/auth/LoginModal';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterCenterModal } from './components/auth/RegisterCenterModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './components/landing/LandingPage';
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('VidyaOS ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA] dark:bg-[#131314] text-[#202124] dark:text-[#E8EAED]">
          <div className="bg-white dark:bg-[#1E1F20] p-8 rounded-3xl border border-[#DADCE0] dark:border-[#3C4043] shadow-2xl max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace View Interrupted</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                A rendering issue occurred while displaying this dashboard module. Your data remains completely safe in Firestore.
              </p>
            </div>
            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40 text-left">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block mb-1">Diagnostic Detail:</span>
              <p className="font-mono text-xs text-rose-700 dark:text-rose-300 break-words">
                {this.state.error?.message || 'Unknown runtime error'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/admin';
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#FFCA28] via-[#FFA000] to-[#F57C00] text-slate-950 rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer"
              >
                Go to Admin Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-[#282A2C] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#3C4043] transition cursor-pointer border border-[#DADCE0] dark:border-[#3C4043]"
              >
                Reload Window
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainView: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vidyaos_sidebar_open');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [switcherMinimized, setSwitcherMinimized] = useState<boolean>(true);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [registerPlanId, setRegisterPlanId] = useState<'starter' | 'growth' | 'pro'>('growth');

  const handleOpenRegister = (planId?: 'starter' | 'growth' | 'pro') => {
    if (planId) {
      setRegisterPlanId(planId);
    }
    setShowRegisterModal(true);
  };

  const { currentPath, navigate } = useRouter();
  const {
    currentUser,
    switchRole,
    setShowArchitectureModal,
    activeTab,
    setActiveTab,
    showToast,
    currentOrg,
    setCurrentOrgId,
    organizations
  } = useApp();
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { resolvedTheme, toggleTheme, theme } = useTheme();

  // Persist sidebar state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vidyaos_sidebar_open', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  // Normalize path (handle trailing slashes and lowercase)
  const normalizedPath = currentPath.toLowerCase().replace(/\/$/, '') || '/';

  // Smooth scroll to pricing when navigating to /pricing
  useEffect(() => {
    if (normalizedPath === '/pricing') {
      const el = document.getElementById('pricing');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [normalizedPath]);

  // Automatically ensure sidebar is open when navigating into admin routes on desktop
  useEffect(() => {
    if (normalizedPath.startsWith('/admin') && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, [normalizedPath]);

  // Synchronize URL path with user role & sub-tabs when navigating directly
  useEffect(() => {
    // 1. Universal portal aliases (/dashboard, /app, /portal, /console)
    const portalAliases = ['/dashboard', '/app', '/portal', '/console'];
    if (portalAliases.includes(normalizedPath)) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      const myPortal = (currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF') ? `/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`
        : currentUser.role === 'TEACHER' ? '/teacher'
        : currentUser.role === 'PARENT' ? '/parent'
        : currentUser.role === 'STUDENT' ? '/student'
        : currentUser.role === 'PLATFORM_OWNER' ? '/owner'
        : '/login';
      navigate(myPortal, { replace: true });
      return;
    }

    // 2. Center Admin & Staff routes (/admin, /admin/:tenantId, /admin/:tenantId/:tab)
    if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }

      if (currentUser.role !== 'CENTER_ADMIN' && currentUser.role !== 'STAFF' && currentUser.role !== 'PLATFORM_OWNER') {
        const myPortal = currentUser.role === 'TEACHER' ? '/teacher'
          : currentUser.role === 'PARENT' ? '/parent'
          : currentUser.role === 'STUDENT' ? '/student'
          : '/';
        showToast(`Access Restricted: Your account (${currentUser.role}) does not have permission to access the Center Admin console.`, 'warning');
        navigate(myPortal, { replace: true });
        return;
      }

      const validAdminTabs = [
        'overview', 'students', 'batches', 'attendance', 'fees',
        'timetable', 'exams', 'assignments', 'materials', 'teachers',
        'parents', 'discussions', 'messages', 'announcements',
        'analytics', 'reports', 'settings', 'subscription'
      ];

      // Case A: Just "/admin" with no tenantId in path -> redirect to active center's dynamic URL
      if (normalizedPath === '/admin') {
        const defaultTenantId = currentUser.orgId || currentOrg.id || 'org-apex';
        navigate(`/admin/${defaultTenantId}`, { replace: true });
        return;
      }

      const adminRest = normalizedPath.replace(/^\/admin\//, '');
      const segments = adminRest.split('/').filter(Boolean);
      const firstSegment = segments[0] || '';
      const secondSegment = segments[1] || '';

      // Case B: Legacy "/admin/:tab" (e.g. /admin/students, /admin/fees) -> redirect to /admin/:tenantId/:tab
      if (validAdminTabs.includes(firstSegment)) {
        const targetOrgId = currentUser.orgId || currentOrg.id || 'org-apex';
        const cleanTab = firstSegment === 'messages' ? 'discussions' : firstSegment;
        navigate(`/admin/${targetOrgId}/${cleanTab}`, { replace: true });
        return;
      }

      // Case C: Dynamic tenant route "/admin/:tenantId" or "/admin/:tenantId/:tab"
      const tenantParam = firstSegment;
      const subTab = secondSegment;

      const matchedOrg = organizations.find(o =>
        o.id.toLowerCase() === tenantParam.toLowerCase() ||
        o.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === tenantParam.toLowerCase()
      );

      if (matchedOrg) {
        // Multi-Tenant Isolation Security Check:
        // Center admin or staff cannot sniff or access another coaching center's dashboard!
        if (
          currentUser.role !== 'PLATFORM_OWNER' &&
          currentUser.orgId &&
          currentUser.orgId !== matchedOrg.id
        ) {
          showToast(`Access Denied: You do not have permissions for ${matchedOrg.name}.`, 'error');
          navigate(`/admin/${currentUser.orgId}`, { replace: true });
          return;
        }

        if (currentOrg.id !== matchedOrg.id) {
          setCurrentOrgId(matchedOrg.id);
        }
      } else if (tenantParam.startsWith('org-')) {
        if (currentOrg.id !== tenantParam) {
          setCurrentOrgId(tenantParam);
        }
      }

      // Staff restricted sub-tabs protection
      const staffRestrictedTabs = ['teachers', 'analytics', 'reports', 'settings', 'subscription'];
      if (currentUser.role === 'STAFF' && subTab && staffRestrictedTabs.includes(subTab)) {
        showToast('Access Restricted: Front desk staff cannot access this section.', 'warning');
        navigate(`/admin/${tenantParam}`, { replace: true });
        return;
      }

      if (subTab && validAdminTabs.includes(subTab)) {
        const tabToSet = subTab === 'messages' ? 'discussions' : subTab;
        if (activeTab !== tabToSet) {
          setActiveTab(tabToSet);
        }
      } else {
        if (activeTab !== 'overview') {
          setActiveTab('overview');
        }
      }
      return;
    }

    // 3. Parent routes (/parent, /parent/:tab)
    if (normalizedPath === '/parent' || normalizedPath.startsWith('/parent/')) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      if (currentUser.role !== 'PARENT' && currentUser.role !== 'PLATFORM_OWNER') {
        showToast('Access Restricted: Only registered parents can access the Parent Portal.', 'warning');
        navigate(currentUser.role === 'TEACHER' ? '/teacher' : currentUser.role === 'STUDENT' ? '/student' : `/admin/${currentUser.orgId}`, { replace: true });
        return;
      }
      return;
    }

    // 4. Teacher routes (/teacher, /teacher/:tab)
    if (normalizedPath === '/teacher' || normalizedPath.startsWith('/teacher/')) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      if (currentUser.role !== 'TEACHER' && currentUser.role !== 'PLATFORM_OWNER') {
        showToast('Access Restricted: Only faculty can access the Faculty Portal.', 'warning');
        navigate(currentUser.role === 'PARENT' ? '/parent' : currentUser.role === 'STUDENT' ? '/student' : `/admin/${currentUser.orgId}`, { replace: true });
        return;
      }
      return;
    }

    // 5. Student routes (/student, /student/:tab)
    if (normalizedPath === '/student' || normalizedPath.startsWith('/student/')) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return;
      }
      if (currentUser.role !== 'STUDENT' && currentUser.role !== 'PLATFORM_OWNER') {
        showToast('Access Restricted: Only students can access the Student Portal.', 'warning');
        navigate(currentUser.role === 'PARENT' ? '/parent' : currentUser.role === 'TEACHER' ? '/teacher' : `/admin/${currentUser.orgId}`, { replace: true });
        return;
      }
      return;
    }

    // 6. Platform Owner routes (/owner, /owner/:tab)
    if (normalizedPath === '/owner' || normalizedPath.startsWith('/owner/')) {
      if (!isAuthenticated) {
        showToast('Please sign in with Platform Owner credentials to access the SaaS Master Console.', 'info');
        navigate('/login', { replace: true });
        return;
      }

      if (currentUser.role !== 'PLATFORM_OWNER') {
        showToast('Access Denied: SaaS Master Console requires Platform Owner privileges.', 'error');
        const myPortal = (currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF')
          ? `/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`
          : currentUser.role === 'TEACHER' ? '/teacher'
          : currentUser.role === 'PARENT' ? '/parent'
          : currentUser.role === 'STUDENT' ? '/student'
          : '/login';
        navigate(myPortal, { replace: true });
        return;
      }
      return;
    }

    // 7. Landing & Auth routes
    const isLandingPath = normalizedPath === '/' || normalizedPath === '/landing' || normalizedPath === '/pricing' || normalizedPath === '/features' || normalizedPath === '/home';
    const isAuthPath = normalizedPath === '/login' || normalizedPath === '/signin' || normalizedPath === '/auth';

    if (isLandingPath || isAuthPath) {
      return;
    }

    // 8. Unknown / 404 fallback route
    if (isAuthenticated) {
      const myPortal = (currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF') ? `/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`
        : currentUser.role === 'TEACHER' ? '/teacher'
        : currentUser.role === 'PARENT' ? '/parent'
        : currentUser.role === 'STUDENT' ? '/student'
        : currentUser.role === 'PLATFORM_OWNER' ? '/owner'
        : '/';
      navigate(myPortal, { replace: true });
      showToast(`Route "${currentPath}" not found. Redirected to your workspace.`, 'info');
    } else {
      navigate('/', { replace: true });
    }
  }, [normalizedPath, currentUser.role, isAuthenticated, currentOrg.id]);

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'PLATFORM_OWNER' && currentUser.role !== 'PLATFORM_OWNER') {
      return;
    }
    switchRole(role);
    if (role === 'CENTER_ADMIN' || role === 'STAFF') navigate(`/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`);
    else if (role === 'PARENT') navigate('/parent');
    else if (role === 'TEACHER') navigate('/teacher');
    else if (role === 'STUDENT') navigate('/student');
    else if (role === 'PLATFORM_OWNER') navigate('/owner');
  };

  const isAuthRoute = normalizedPath === '/login' || normalizedPath === '/signin' || normalizedPath === '/auth';

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#131314]">
        <LoginPage onOpenRegister={handleOpenRegister} />
        <RegisterCenterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          initialPlanId={registerPlanId}
        />
      </div>
    );
  }

  const isLanding = normalizedPath === '/' || normalizedPath === '/landing' || normalizedPath === '/pricing' || normalizedPath === '/features' || normalizedPath === '/home';

  if (isLanding) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#131314]">
        <LandingPage
          onSelectRole={handleRoleSelect}
          onEnterApp={() => {
            if (currentUser.role === 'CENTER_ADMIN') navigate(`/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`);
            else if (currentUser.role === 'PARENT') navigate('/parent');
            else if (currentUser.role === 'TEACHER') navigate('/teacher');
            else if (currentUser.role === 'STUDENT') navigate('/student');
            else if (currentUser.role === 'PLATFORM_OWNER') navigate('/owner');
            else navigate(`/admin/${currentOrg.id || currentUser.orgId || 'org-apex'}`);
          }}
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenArchitecture={() => setShowArchitectureModal(true)}
          onOpenRegister={handleOpenRegister}
        />
        <LoginModal onOpenRegister={handleOpenRegister} />
        <ArchitectureModal />
        <RegisterCenterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          initialPlanId={registerPlanId}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-200 overflow-hidden font-apple-text selection:bg-[#0071E3]/20 selection:text-[#0071E3]">
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenLanding={() => navigate('/')}
        onOpenRegister={handleOpenRegister}
      />

      {/* Main role-based protected view */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Responsive Dashboard Sidebar (Rendered on all /admin routes for Center Admin, Staff, and Platform Owners) */}
        {(currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF' || (currentUser.role === 'PLATFORM_OWNER' && normalizedPath.startsWith('/admin'))) && (
          <Sidebar
            currentTab={activeTab || 'overview'}
            onSelectTab={(tabId) => {
              setActiveTab(tabId);
              if (tabId === 'overview') {
                navigate(`/admin/${currentOrg.id}`);
              } else {
                navigate(`/admin/${currentOrg.id}/${tabId}`);
              }
            }}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}

        <main className="flex-1 overflow-y-auto pb-28 md:pb-16 custom-scrollbar bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,113,227,0.04),rgba(245,245,247,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(41,151,255,0.06),rgba(0,0,0,0))]">
          {currentUser.role === 'PLATFORM_OWNER' && !normalizedPath.startsWith('/admin') && (
            <ProtectedRoute allowedRoles={['PLATFORM_OWNER']}>
              <PlatformDashboard />
            </ProtectedRoute>
          )}
          {(currentUser.role === 'CENTER_ADMIN' || currentUser.role === 'STAFF' || (currentUser.role === 'PLATFORM_OWNER' && normalizedPath.startsWith('/admin'))) && (
            <ProtectedRoute allowedRoles={['CENTER_ADMIN', 'STAFF', 'PLATFORM_OWNER']}>
              <AdminDashboard />
            </ProtectedRoute>
          )}
          {currentUser.role === 'PARENT' && (
            <ProtectedRoute allowedRoles={['PARENT']}>
              <ParentPortal />
            </ProtectedRoute>
          )}
          {currentUser.role === 'TEACHER' && (
            <ProtectedRoute allowedRoles={['TEACHER']}>
              <TeacherPortal />
            </ProtectedRoute>
          )}
          {currentUser.role === 'STUDENT' && (
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentPortal />
            </ProtectedRoute>
          )}
        </main>
      </div>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />

      {/* Super Admin Sandbox Role Switcher (Strictly visible only to PLATFORM_OWNER, completely hidden for all coaching center users) */}
      {currentUser.role === 'PLATFORM_OWNER' && (
        switcherMinimized ? (
          <button
            onClick={() => setSwitcherMinimized(false)}
            className="hidden md:flex fixed bottom-3 right-4 z-30 bg-white/95 dark:bg-[#1C1C1E]/95 text-[#1D1D1F] dark:text-[#F5F5F7] backdrop-blur-2xl px-4 py-2.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-black/[0.08] dark:border-white/[0.1] items-center space-x-2 text-xs font-semibold hover:shadow-2xl transition cursor-pointer"
            title="Expand Super Admin Impersonation Bar"
          >
            <span className="w-2 h-2 rounded-full bg-[#FFA000] animate-pulse"></span>
            <span>Super Admin Sandbox: <strong className="text-[#E65100] dark:text-[#FFCA28]">{currentUser.role.replace('_', ' ')}</strong></span>
            <ChevronUp className="w-3.5 h-3.5 text-[#86868B]" />
          </button>
        ) : (
          <div
            className="hidden md:flex fixed bottom-3 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-[#1C1C1E]/95 text-[#1D1D1F] dark:text-[#F5F5F7] backdrop-blur-2xl px-3.5 py-2 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-black/[0.08] dark:border-white/[0.1] items-center space-x-1.5 text-xs max-w-[95vw] overflow-x-auto"
          >
            <span className="text-[10px] uppercase font-extrabold text-[#E65100] dark:text-[#FFD54F] pl-1 hidden sm:inline flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFA000] animate-pulse"></span>
              Super Admin Sandbox:
            </span>

            {(() => {
              const activeRole: string = currentUser.role;
              return (
                <>
                  <button
                    onClick={() => handleRoleSelect('PLATFORM_OWNER')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'PLATFORM_OWNER'
                        ? 'bg-[#FF3B30] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="SaaS Master Platform Console (/owner)"
                    aria-label="SaaS Super Admin"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SaaS Owner</span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect('CENTER_ADMIN')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'CENTER_ADMIN'
                        ? 'bg-gradient-to-r from-[#FF9500] to-[#FF3B30] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="Center Operations & Finance (/admin)"
                    aria-label="Center Admin"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Center Admin</span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect('STAFF')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'STAFF'
                        ? 'bg-[#0071E3] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="Front Desk Counter & Reception (/admin)"
                    aria-label="Staff Desk"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Desk</span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect('TEACHER')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'TEACHER'
                        ? 'bg-[#2997FF] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="Faculty Attendance & Marks (/teacher)"
                    aria-label="Teacher Portal"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Teacher</span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect('PARENT')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'PARENT'
                        ? 'bg-[#34C759] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="Parent Direct Portal & UPI Pay (/parent)"
                    aria-label="Parent Portal"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Parent</span>
                  </button>

                  <button
                    onClick={() => handleRoleSelect('STUDENT')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tooltip-top ${
                      activeRole === 'STUDENT'
                        ? 'bg-[#AF52DE] text-white font-bold shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                    }`}
                    data-tooltip="Student Study Workspace (/student)"
                    aria-label="Student Workspace"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </button>
                </>
              );
            })()}

            {/* Minimize button */}
            <button
              onClick={() => setSwitcherMinimized(true)}
              className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition ml-1 cursor-pointer"
              title="Minimize Bar"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      )}

      {/* Global Modals */}
      <LoginModal onOpenRegister={handleOpenRegister} />
      <RegisterCenterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        initialPlanId={registerPlanId}
      />
      <ArchitectureModal />
      <HelpSupportModal />
      <ReceiptModal />
      <UpiPaymentModal />
      <WhatsAppShareModal />
      <ToastSnackbar />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppProvider>
            <ErrorBoundary>
              <MainView />
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

