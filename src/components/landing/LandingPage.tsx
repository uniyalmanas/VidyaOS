import React, { useState, useEffect } from 'react';
import {
  Building2, Users, BookOpen, GraduationCap, ShieldCheck, ArrowRight, Sparkles,
  Smartphone, QrCode, Shield, Clock, ChevronDown, ChevronUp, TrendingUp, Check,
  ExternalLink, Sun, Moon, DownloadCloud
} from 'lucide-react';
import { UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ConsoleButton, StatusChip, VidyaLogo } from '../ui';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from '../common/PwaInstallModal';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenLogin: () => void;
  onOpenArchitecture?: () => void;
  onEnterApp: () => void;
  onOpenRegister?: (planId?: 'starter' | 'growth' | 'pro') => void;
}

const border = 'border border-[#DADCE0] dark:border-[#3C4043]';
const card = `bg-white dark:bg-[#1E1F20] ${border}`;
const muted = 'text-[#5F6368] dark:text-[#9AA0A6]';
const sectionTitle = 'text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans';
const heading = 'text-2xl sm:text-3xl font-bold font-google-sans text-[#202124] dark:text-white';

const navLinks = [
  { href: '#features', label: 'Platform Features' },
  { href: '#interactive-demo', label: 'Console Demo' },
  { href: '#roi-calculator', label: 'Fee Calculator' },
  { href: '#pricing', label: 'Pricing Tiers' },
  { href: '#faqs', label: 'FAQs' },
];

const roleTabs: { id: UserRole; label: string; icon: React.ElementType }[] = [
  { id: 'CENTER_ADMIN', label: 'Center Admin Console', icon: Building2 },
  { id: 'PARENT', label: 'Parent Portal (Multi-Child)', icon: Users },
  { id: 'TEACHER', label: 'Faculty Attendance Desk', icon: BookOpen },
  { id: 'STUDENT', label: 'Student Workspace', icon: GraduationCap },
  { id: 'PLATFORM_OWNER', label: 'SaaS Super-Admin', icon: ShieldCheck },
];

const features = [
  { icon: QrCode, tint: 'bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28]', title: 'Zero-Leakage UPI Fee Engine',
    text: 'Auto-generate fee invoices with student roll numbers, batch tags, and instant UPI QR codes. Parents pay via PhonePe, GPay, or Paytm, and get instant downloadable receipts.',
    points: ['Automated WhatsApp Due Reminders', 'GST / PAN Ready Digital Receipts'] },
  { icon: Smartphone, tint: 'bg-[#188038]/15 text-[#188038] dark:text-[#81C995]', title: '20-Second Mobile Attendance',
    text: 'Faculty marks entire batch attendance in seconds with 1-tap presets. Absent students automatically trigger real-time WhatsApp alerts to parents.',
    points: ['Real-time Absent Alerts to Parents', 'Monthly % Attendance Log'] },
  { icon: Building2, tint: 'bg-[#1A73E8]/15 text-[#1A73E8] dark:text-[#8AB4F8]', title: 'Multi-Branch & Batch Topology',
    text: 'Organize morning, evening, and weekend batches across multiple branches. Supports CBSE, ICSE, State Boards, IIT-JEE, and NEET curriculums.',
    points: ['Branch-Level Revenue Ledgers', 'Shared Faculty Timetable Slots'] },
  { icon: Sparkles, tint: 'bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28]', title: 'AI Study Assistant (Gemini)',
    text: 'Integrated Google Gemini intelligence grounds syllabus questions, creates instant test diagnostic summaries, and helps students review tricky concepts.',
    points: ['Smart Syllabus & Exam Tracker', 'Diagnostic Test Report Generation'] },
  { icon: Shield, tint: 'bg-[#188038]/15 text-[#188038] dark:text-[#81C995]', title: 'Multi-Tenant Data Privacy',
    text: 'Every coaching center gets a dedicated tenant workspace. Student phone numbers, fee data, and exam results are never mixed or shared with competitors.',
    points: ['Strict Role-Based Isolation', 'Hardened Firestore Security Rules'] },
  { icon: Clock, tint: 'bg-[#1A73E8]/15 text-[#1A73E8] dark:text-[#8AB4F8]', title: 'Offline-Resilient Cloud Sync',
    text: 'Never halt attendance or receipt printing because of a broadband drop. Data is cached locally and automatically syncs when the connection resumes.',
    points: ['Instant Local-First Performance', 'Background Firestore Sync'] },
];

const plans = [
  { id: 'starter' as const, name: 'Starter Batch', price: '₹599', blurb: 'For single-branch neighborhood coaching & education centers.', cta: 'Choose Starter Batch', featured: false,
    items: ['Up to 100 Enrolled Students', '1 Center Branch', '1-Tap UPI Invoicing & Receipts', 'Mobile Attendance Register', 'Parent Portal Access'] },
  { id: 'growth' as const, name: 'Growth Academy', price: '₹1,299', blurb: 'For growing institutes and competitive test prep centers.', cta: 'Start Free 14-Day Trial', featured: true,
    items: ['Up to 300 Enrolled Students', 'Up to 2 Branches Supported', 'Automated WhatsApp Absentee Alerts', 'Diagnostic Tests & Percentile Rankings', 'Automated Exam & Test Scheduler', 'Teacher Salary & Time Slot Scheduler'] },
  { id: 'pro' as const, name: 'Multi-Branch Pro', price: '₹2,199', blurb: 'For large coaching networks and test prep academies.', cta: 'Choose Multi-Branch Pro', featured: false,
    items: ['Up to 1,000 Enrolled Students', 'Up to 5 Branches Supported', 'Custom Domain & Center Branding', 'Dedicated WhatsApp API integration', '24/7 Priority Support & Onboarding'] },
];

const faqs = [
  { q: 'How does UPI Fee Collection work? Do we need a complex payment gateway?',
    a: "No payment gateway or commercial merchant account required. VidyaOS generates instant dynamic UPI QR codes and deep-links for PhonePe, Google Pay, and Paytm directly mapped to your coaching institute's UPI VPA. When parents pay, automated receipts with GST/PAN and student enrollment details are generated instantly." },
  { q: 'Can teachers mark attendance from their personal mobile phones?',
    a: 'Yes. Teachers receive a dedicated, responsive mobile roster. Marking a batch of 40 students takes less than 20 seconds. The moment an absent student is marked, an automated WhatsApp alert can be sent to parents with class timing and institute contact info.' },
  { q: 'What if a parent has two or three children enrolled in different batches?',
    a: "VidyaOS has native Multi-Child support. Parents switch between their children in 1 tap from their portal without separate logins or accounts, seeing each child's individual attendance, test ranks, and fee invoices." },
  { q: 'Can VidyaOS work if the internet connection is unstable at our center?',
    a: 'Yes. VidyaOS is built with an offline-first architecture powered by client caching and hybrid Firestore synchronization. Attendance and student records load from offline storage, and sync seamlessly once connectivity restores.' },
  { q: 'Can we manage multiple branches under a single center owner login?',
    a: 'Yes, within your plan limits (1 branch on Starter, 2 on Growth, 5 on Multi-Branch Pro). Owners can filter students and fee collections by branch and manage shared faculty schedules.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole, onOpenLogin, onEnterApp, onOpenRegister
}) => {
  const { resolvedTheme, toggleTheme, theme } = useTheme();
  const pwaState = usePwaInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  // Dynamic scroll state to elevate header on scroll
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [activePreviewTab, setActivePreviewTab] = useState<UserRole>('CENTER_ADMIN');
  const [studentCount, setStudentCount] = useState(250);
  const [monthlyFee, setMonthlyFee] = useState(2500);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const recommendedPlan =
    studentCount <= 100 ? plans[0] : studentCount <= 300 ? plans[1] : plans[2];

  const totalMonthlyCollection = studentCount * monthlyFee;
  const estimatedRecoveredLeakage = Math.round(totalMonthlyCollection * 0.08);
  const staffHoursSaved = Math.round(studentCount * 0.25);

  const choosePlan = (id: 'starter' | 'growth' | 'pro') =>
    onOpenRegister ? onOpenRegister(id) : onSelectRole('CENTER_ADMIN');

  const stat = 'text-2xl sm:text-3xl font-extrabold font-google-sans';
  const statLabel = `text-xs font-medium ${muted} mt-0.5`;

  return (
    <div className="w-full min-h-dvh overflow-x-hidden scroll-smooth bg-[#F8F9FA] dark:bg-[#131314] text-[#202124] dark:text-[#E8EAED] font-['Inter',system-ui,sans-serif] selection:bg-[#FFA000]/25 selection:text-[#202124] transition-colors duration-200">

      {/* Dynamic Top App Bar: fluid flexbox architecture adapting smoothly from 320px to 4K displays */}
      <nav
        className={`sticky top-0 z-40 w-full transition-all duration-200 px-3 sm:px-5 lg:px-8 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[#1E1F20]/95 backdrop-blur-md border-b border-[#DADCE0] dark:border-[#3C4043] shadow-xs py-2 sm:py-2.5'
            : 'bg-white/85 dark:bg-[#1E1F20]/85 backdrop-blur-sm border-b border-[#DADCE0]/50 dark:border-[#3C4043]/50 py-2 sm:py-2.5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Brand Anchor: dynamically adapts from flame+VidyaOS on mobile to full title+badge+subtitle on desktop */}
          <div className="flex items-center min-w-0 flex-shrink">
            <VidyaLogo size="sm" showBadge={true} badgeText="CONSOLE v2.5" subtitle="Coaching & Education Center OS" />
          </div>

          {/* Desktop Navigation Links (Centered in flex container) */}
          <div className={`hidden lg:flex items-center justify-center space-x-1 xl:space-x-2 text-xs font-semibold ${muted} flex-1 px-4`}>
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="px-2.5 py-1.5 rounded-lg hover:text-[#FFA000] dark:hover:text-[#FFCA28] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right Action Cluster: pure flexbox with no rigid widths */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 flex-shrink-0 ml-auto">
            {/* Install App - Visible on Tablet & Desktop */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#B06000] dark:text-[#FFCA28] text-xs font-semibold transition cursor-pointer flex-shrink-0 active:scale-95"
              title="Install VidyaOS PWA on iOS, Android or Laptop"
              aria-label="Install App"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-[#FFA000] dark:text-[#FFCA28]" />
              <span className="hidden md:inline">Install App</span>
              <span className="md:hidden">App</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-lg ${border} ${muted} hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition-colors cursor-pointer flex-shrink-0 active:scale-95`}
              title={`Toggle Theme (Current: ${theme})`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark'
                ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFCA28]" />
                : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFA000]" />}
            </button>

            {/* Register Center - Large screens only */}
            {onOpenRegister && (
              <ConsoleButton variant="primary" size="xs" icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => onOpenRegister()} className="hidden xl:inline-flex">
                Register Center
              </ConsoleButton>
            )}

            {/* Sign In */}
            <ConsoleButton variant="secondary" size="xs" onClick={onOpenLogin} className="inline-flex">
              Sign In
            </ConsoleButton>

            {/* Console Button - Fluid label scaling */}
            <ConsoleButton variant="primary" size="xs"
              iconRight={<ArrowRight className="w-3 h-3 hidden sm:inline" />}
              onClick={onEnterApp} className="px-2.5 sm:px-3 text-xs shadow-2xs hover:shadow-xs transition">
              <span className="hidden sm:inline">Go to Console</span>
              <span className="sm:hidden">Console</span>
            </ConsoleButton>
          </div>
        </div>

        {/* Mobile & Tablet Flexible Navigation Strip: all tabs and actions accessible with smooth horizontal flex scroll */}
        <div className="lg:hidden flex items-center gap-1.5 pt-2 pb-0.5 overflow-x-auto no-scrollbar border-t border-[#DADCE0]/40 dark:border-[#3C4043]/40 text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] scroll-smooth">
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 bg-[#F1F3F4] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] hover:text-[#FFA000] dark:hover:text-[#FFCA28] hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[11px]"
            >
              {l.label}
            </a>
          ))}
          {!pwaState.isInstalled && (
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 text-[#B06000] dark:text-[#FFCA28] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer text-[11px]"
            >
              <DownloadCloud className="w-3 h-3 text-[#FFA000] dark:text-[#FFCA28]" />
              <span>Install App</span>
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative w-full overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-24 lg:pb-28 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,160,0,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,160,0,0.15),rgba(19,19,20,0))]">
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-40 dark:opacity-20 bg-[radial-gradient(#FFA000_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-7">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-500/30 text-xs font-semibold text-[#B06000] dark:text-[#FFCA28] shadow-[0_0_20px_rgba(255,160,0,0.15)] max-w-full">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFA000] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFA000]"></span>
            </span>
            <span className="font-google-sans tracking-wide leading-tight text-center break-words sm:whitespace-nowrap">
              <span className="sm:hidden">VIDYAOS 2.5 • GOOGLE CLOUD FOR COACHING CENTERS</span>
              <span className="hidden sm:inline">VIDYAOS 2.5 • GOOGLE CLOUD ARCHITECTURE FOR COACHING & EDUCATION CENTERS</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-google-sans tracking-tight text-[#202124] dark:text-[#F8F9FA] max-w-4xl mx-auto leading-[1.14]">
            The Modern Operating System for{' '}
            <span className="bg-gradient-to-r from-[#E65100] via-[#FFA000] to-[#FFCA28] bg-clip-text text-transparent">
              Coaching & Education Centers
            </span>
          </h1>

          <p className={`text-sm sm:text-lg ${muted} max-w-2xl mx-auto leading-relaxed font-normal`}>
            Eliminate chaotic WhatsApp groups, lost paper attendance registers, and overdue cash fees. VidyaOS unites{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">zero-surcharge UPI payments</strong>,{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">20-second batch attendance</strong>, and{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">automated WhatsApp parent alerts</strong> in one reliable cloud console.
          </p>

          <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 text-[11px] font-mono font-medium ${muted} max-w-2xl mx-auto`}>
            {['✓ ₹0 Gateway Cuts (Direct UPI)', '✓ 1-Tap Attendance (<20s)', '✓ Automated WhatsApp Alerts', '✓ Multi-Child Single Login', '✓ Offline-First Sync'].map(p => (
              <span key={p} className={`px-2.5 py-1 rounded-md ${card}`}>{p}</span>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto sm:max-w-none">
            {onOpenRegister && (
              <ConsoleButton variant="primary" size="lg"
                icon={<Sparkles className="w-4 h-4" />} iconRight={<ArrowRight className="w-4 h-4" />}
                onClick={() => onOpenRegister()}
                className="w-full sm:w-auto justify-center shadow-[0_4px_14px_rgba(255,160,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,160,0,0.45)] transform hover:-translate-y-0.5 transition">
                Register Your Center (Free Trial)
              </ConsoleButton>
            )}
            <ConsoleButton variant="secondary" size="lg"
              icon={<Building2 className="w-4 h-4 text-[#FFA000]" />}
              onClick={() => onSelectRole('CENTER_ADMIN')} className="w-full sm:w-auto justify-center">
              Open Admin Console Demo
            </ConsoleButton>
          </div>

          <div className="pt-8 sm:pt-10">
            <div className={`bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-md ${border} rounded-2xl p-4 sm:p-6 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 text-center`}>
              <div><div className={`${stat} text-[#202124] dark:text-white`}>450+</div><div className={statLabel}>Coaching Centers Active</div></div>
              <div><div className={`${stat} text-[#188038] dark:text-[#81C995]`}>₹4.8 Cr+</div><div className={statLabel}>UPI Fees Reconciled</div></div>
              <div><div className={`${stat} text-[#FFA000] dark:text-[#FFCA28]`}>&lt; 20 sec</div><div className={statLabel}>1-Tap Batch Attendance</div></div>
              <div><div className={`${stat} text-[#1A73E8] dark:text-[#8AB4F8]`}>99.8%</div><div className={statLabel}>Parent Transparency Rate</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Role demo */}
      <section id="interactive-demo" className={`scroll-mt-20 py-12 sm:py-16 bg-white dark:bg-[#1E1F20] border-y border-[#DADCE0] dark:border-[#3C4043] transition-colors`}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 space-y-6 sm:space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={sectionTitle}>Role-Based Console Experience</h2>
            <p className={heading}>One Unified OS, Five Dedicated Workspaces</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              Each stakeholder gets a purpose-built workspace with isolated permissions, clean tabular data, and zero noise.
            </p>
          </div>

          <div className={`flex flex-nowrap sm:flex-wrap items-center sm:justify-center gap-1.5 p-1 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-xl ${border} w-full sm:w-fit mx-auto overflow-x-auto`}>
            {roleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-white font-bold shadow-xs border border-[#FFA000]/40'
                      : `${muted} hover:text-[#202124] dark:hover:text-white`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#FFA000]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={`bg-[#F8F9FA] dark:bg-[#131314] rounded-2xl ${border} overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/5`}>
            <div className={`bg-white dark:bg-[#1E1F20] px-3 sm:px-4 py-3 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between gap-3 text-xs`}>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                <div className="h-4 w-px bg-[#DADCE0] dark:bg-[#3C4043] mx-1"></div>
                <span className="font-google-sans font-bold hidden sm:inline">VidyaOS Console</span>
              </div>

              <div className={`flex-1 max-w-md mx-2 hidden sm:flex items-center space-x-2 px-3 py-1 rounded-md bg-[#F1F3F4] dark:bg-[#131314] ${muted} text-[11px] font-mono ${border}`}>
                <ShieldCheck className="w-3 h-3 text-[#188038] flex-shrink-0" />
                <span className="truncate">https://console.vidyaos.in/apex-academy/{activePreviewTab.toLowerCase().replace('_', '-')}</span>
                <span className="ml-auto text-[9px] px-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-sans font-bold flex-shrink-0">12ms</span>
              </div>

              <button
                onClick={() => onSelectRole(activePreviewTab)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#E65100] dark:text-[#FFCA28] bg-[#FFA000]/10 hover:bg-[#FFA000]/20 border border-[#FFA000]/30 transition cursor-pointer flex-shrink-0 ml-auto sm:ml-0"
              >
                <span className="hidden sm:inline">Launch Live Session</span>
                <span className="sm:hidden">Launch</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {activePreviewTab === 'CENTER_ADMIN' && (
                <div className="space-y-4">
                  <div className={`${card} border-l-4 border-l-[#FFA000] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip label="DAILY PRIORITY" variant="warning" size="xs" />
                        <span className={`text-xs ${muted}`}>Apex Science Academy · Session 2026–27</span>
                      </div>
                      <h4 className="font-google-sans font-bold text-sm sm:text-base mt-1">
                        Aaj Ka Kaam · 1-Tap Attendance & Overdue WhatsApp UPI
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#188038] break-all">Counter UPI: apex@okaxis</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`${card} p-4 rounded-xl`}>
                      <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Enrolled Students</span>
                      <div className="text-2xl font-bold font-google-sans mt-1">214</div>
                      <span className="text-[11px] text-[#1A73E8]">Across 8 active batches</span>
                    </div>
                    <div className={`${card} p-4 rounded-xl`}>
                      <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Today's Attendance</span>
                      <div className="text-2xl font-bold font-google-sans text-[#188038] mt-1">94.8%</div>
                      <span className="text-[11px] text-[#188038]">↑ 3.2% this month</span>
                    </div>
                    <div className={`${card} p-4 rounded-xl`}>
                      <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Pending Fees Due</span>
                      <div className="text-2xl font-bold font-google-sans text-[#E65100] dark:text-[#FFCA28] mt-1">₹42,500</div>
                      <span className={`text-[11px] ${muted}`}>14 collections pending</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'PARENT' && (
                <div className="space-y-4">
                  <div className={`${card} p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs ${muted}`}>Logged in Parent:</span>
                        <strong className="text-xs">Rajesh Sharma</strong>
                        <StatusChip label="OTP VERIFIED" variant="success" size="xs" />
                      </div>
                      <div className="text-sm font-bold font-google-sans mt-1">
                        Rahul Sharma (Class 10 CBSE) · Next Class: Today, 5:00 PM
                      </div>
                    </div>
                    <ConsoleButton variant="primary" size="sm" icon={<QrCode className="w-3.5 h-3.5" />} className="justify-center">
                      Pay Fee (₹2,500)
                    </ConsoleButton>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { l: 'Attendance', v: '92%', c: 'text-[#188038]', s: 'Present Today' },
                      { l: 'Fees Due', v: '₹2,500', c: 'text-[#FFA000]', s: 'Due 10 Oct' },
                      { l: 'Latest Score', v: '44 / 50', c: 'text-[#1A73E8]', s: 'Rank #2' },
                      { l: 'Homework', v: 'Checked', c: '', s: '0 Overdue' },
                    ].map(m => (
                      <div key={m.l} className={`${card} p-3 rounded-xl text-center`}>
                        <span className={`text-[10px] ${muted} uppercase font-bold`}>{m.l}</span>
                        <div className={`text-xl font-bold mt-0.5 ${m.c}`}>{m.v}</div>
                        <span className={`text-[10px] ${muted}`}>{m.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePreviewTab === 'TEACHER' && (
                <div className={`${card} p-4 rounded-xl space-y-3`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold">Batch Roster Attendance (Class 10 CBSE Math)</span>
                      <p className={`text-[11px] ${muted}`}>Faculty: Prof. Anjali Sharma · 32 Students Enrolled</p>
                    </div>
                    <ConsoleButton variant="blue" size="xs" className="justify-center">Mark All 32 Present</ConsoleButton>
                  </div>
                  <div className={`p-3 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-xs ${muted} flex items-center justify-between gap-2`}>
                    <span>Rahul Sharma · Roll 10-01</span>
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 rounded bg-[#188038] text-white font-bold text-[10px]">P</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E1F20] border font-bold text-[10px]">A</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E1F20] border font-bold text-[10px]">L</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'STUDENT' && (
                <div className={`${card} p-4 rounded-xl space-y-3`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold">Student Academic Vault · Rahul Sharma</span>
                      <p className={`text-[11px] ${muted}`}>Class 10 CBSE · Mathematics & Science</p>
                    </div>
                    <div><StatusChip label="RANK #2" variant="success" size="xs" /></div>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">Diagnostic Test 3: Trigonometry</span>
                      <p className={`text-[10px] ${muted}`}>Scored 44/50 (88%) · Percentile: 94th</p>
                    </div>
                    <ConsoleButton variant="secondary" size="xs" className="justify-center">View Solution</ConsoleButton>
                  </div>
                </div>
              )}

              {activePreviewTab === 'PLATFORM_OWNER' && (
                <div className={`${card} p-4 rounded-xl space-y-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold">Multi-Tenant Platform Control</span>
                      <p className={`text-[11px] ${muted}`}>450+ Active Coaching Centers across India</p>
                    </div>
                    <StatusChip label="HEALTHY" variant="success" size="xs" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {[
                      { l: 'Monthly MRR', v: '₹18,40,000', c: 'text-[#188038]' },
                      { l: 'Active Quotas', v: '28,400 Students', c: '' },
                      { l: 'Database Leaks', v: '0 Incidents', c: 'text-[#188038]' },
                    ].map(m => (
                      <div key={m.l} className="p-2.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-center">
                        <span className={`text-[10px] ${muted}`}>{m.l}</span>
                        <div className={`text-lg font-bold ${m.c}`}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-12 sm:py-20 max-w-7xl mx-auto px-4 lg:px-8 space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className={sectionTitle}>Engineered for Indian Realities</h2>
          <p className={heading}>Everything You Need to Run Your Institute</p>
          <p className={`text-[13px] sm:text-sm ${muted}`}>
            Tailored specifically for Indian coaching operations: cash/UPI reconciliations, multi-branch batches, and instant parent communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={`${card} p-5 sm:p-6 rounded-xl shadow-xs space-y-3`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.tint}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-google-sans">{f.title}</h3>
                <p className={`text-[13px] sm:text-xs ${muted} leading-relaxed`}>{f.text}</p>
                <ul className={`pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-[13px] sm:text-xs ${muted}`}>
                  {f.points.map(p => (
                    <li key={p} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038] shrink-0" /> {p}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Calculator */}
      <section id="roi-calculator" className="scroll-mt-20 py-12 sm:py-20 bg-white dark:bg-[#1E1F20] border-y border-[#DADCE0] dark:border-[#3C4043] transition-colors">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 space-y-8 sm:space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={sectionTitle}>Course Fee Recovery Estimator</h2>
            <p className={heading}>Calculate Your Recovered Fee Leakage</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              Indian coaching & education centers typically lose 8–12% of total collections to delayed payments, uncollected dues, and lost receipts.
            </p>
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#F8F9FA] dark:bg-[#131314] p-4 sm:p-8 rounded-2xl ${border}`}>
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <label htmlFor="students">Enrolled Students:</label>
                  <span className="text-[#FFA000] font-bold text-sm font-mono">{studentCount} Students</span>
                </div>
                <div className="py-2">
                  <input id="students" type="range" min="20" max="1000" step="10" value={studentCount}
                    onChange={e => setStudentCount(Number(e.target.value))}
                    aria-label="Enrolled students"
                    className="w-full h-2 bg-[#DADCE0] dark:bg-[#3C4043] rounded-lg appearance-none cursor-pointer accent-[#FFA000] touch-pan-y" />
                </div>
                <div className="flex justify-between text-[10px] text-[#5F6368] mt-1 font-mono">
                  <span>20</span><span>500</span><span>1,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <label htmlFor="fee">Average Monthly Fee per Student:</label>
                  <span className="text-[#188038] font-bold text-sm font-mono">₹{monthlyFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="py-2">
                  <input id="fee" type="range" min="500" max="10000" step="250" value={monthlyFee}
                    onChange={e => setMonthlyFee(Number(e.target.value))}
                    aria-label="Average monthly fee per student"
                    className="w-full h-2 bg-[#DADCE0] dark:bg-[#3C4043] rounded-lg appearance-none cursor-pointer accent-[#188038] touch-pan-y" />
                </div>
                <div className="flex justify-between text-[10px] text-[#5F6368] mt-1 font-mono">
                  <span>₹500</span><span>₹5,000</span><span>₹10,000</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-lg ${card} text-[13px] sm:text-xs ${muted} flex items-start gap-2.5`}>
                <TrendingUp className="w-4 h-4 text-[#FFA000] shrink-0 mt-0.5" />
                <span>
                  Automatic UPI payment links & automated WhatsApp reminders achieve an average <strong>92% on-time collection rate</strong> within 5 days of invoice dispatch.
                </span>
              </div>
            </div>

            <div className={`lg:col-span-5 ${card} p-5 sm:p-6 rounded-xl space-y-4 text-center`}>
              <div>
                <span className={`text-[10px] ${muted} font-semibold uppercase tracking-wider`}>Total Monthly Revenue</span>
                <div className="text-2xl font-bold font-google-sans mt-1 break-words">₹{totalMonthlyCollection.toLocaleString('en-IN')}</div>
              </div>

              <div className="p-4 bg-[#E6F4EA] dark:bg-emerald-950/40 rounded-xl border border-[#CEEAD6] dark:border-emerald-800/40">
                <span className="text-xs text-[#188038] dark:text-[#81C995] font-semibold block">Estimated Fee Leakage Recovered</span>
                <div className="text-2xl sm:text-3xl font-bold font-google-sans text-[#188038] dark:text-[#81C995] mt-1 break-words">
                  + ₹{estimatedRecoveredLeakage.toLocaleString('en-IN')}
                </div>
                <span className={`text-[10px] ${muted}`}>per month from uncollected or delayed dues</span>
              </div>

              <div className="p-3 bg-[#FEF7E0] dark:bg-amber-950/40 rounded-xl border border-[#FEEFC3] dark:border-amber-900/40 text-left flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#E65100] dark:text-[#FFCA28] uppercase tracking-wider block">Recommended Plan</span>
                  <span className="text-xs font-bold">{recommendedPlan.name} ({recommendedPlan.price}/mo)</span>
                </div>
                <button type="button" onClick={() => choosePlan(recommendedPlan.id)}
                  className="text-xs font-bold text-[#E65100] dark:text-[#FFCA28] hover:underline cursor-pointer shrink-0 py-2">
                  Select Plan →
                </button>
              </div>

              <div className="text-xs text-[#1A73E8] font-semibold">⚡ ~{staffHoursSaved} Staff Hours Saved Every Month</div>

              <ConsoleButton variant="primary" size="md" onClick={() => choosePlan(recommendedPlan.id)} className="w-full justify-center">
                Start with {recommendedPlan.name}
              </ConsoleButton>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-12 sm:py-20 max-w-6xl mx-auto px-4 lg:px-8 space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className={sectionTitle}>Simple, Transparent Pricing</h2>
          <p className={heading}>Plans Built for Every Coaching Scale</p>
          <p className={`text-[13px] sm:text-sm ${muted}`}>
            No hidden gateway surcharges. Flat transparent pricing (₹599 / ₹1,299 / ₹2,199/mo). 14-day free trial on all plans.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-md lg:max-w-none mx-auto">
          {plans.map(p => (
            <div
              key={p.id}
              className={`bg-white dark:bg-[#1E1F20] p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-6 relative ${
                p.featured
                  ? 'border-2 border-[#FFA000] shadow-lg lg:-translate-y-2 order-first lg:order-none'
                  : border
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <StatusChip label="MOST POPULAR" variant="warning" size="xs" />
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${p.featured ? 'text-[#E65100] dark:text-[#FFCA28]' : 'text-[#5F6368]'}`}>{p.name}</span>
                  <div className="text-3xl font-bold font-google-sans mt-1">
                    {p.price}<span className="text-xs font-normal text-[#5F6368]">/mo</span>
                  </div>
                  <p className="text-[13px] sm:text-xs text-[#5F6368] mt-1">{p.blurb}</p>
                </div>
                <ul className={`space-y-2 text-[13px] sm:text-xs border-t border-[#DADCE0]/60 dark:border-[#3C4043] pt-4 ${p.featured ? 'font-medium' : muted}`}>
                  {p.items.map(i => (
                    <li key={i} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038] shrink-0" /> {i}</li>
                  ))}
                </ul>
              </div>
              <ConsoleButton variant={p.featured ? 'primary' : 'secondary'} size="md" onClick={() => choosePlan(p.id)} className="w-full justify-center">
                {p.cta}
              </ConsoleButton>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="scroll-mt-20 py-12 sm:py-16 max-w-4xl mx-auto px-4 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className={sectionTitle}>Frequently Asked Questions</h2>
          <p className="text-xl sm:text-2xl font-bold font-google-sans">Answers for Coaching Center Owners</p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`${card} rounded-xl overflow-hidden transition`}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                aria-expanded={openFaq === idx}
                className="w-full min-h-[48px] p-4 text-left flex items-center justify-between gap-2 text-[13px] sm:text-xs font-bold cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === idx
                  ? <ChevronUp className="w-4 h-4 text-[#FFA000] shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-[#5F6368] shrink-0" />}
              </button>
              {openFaq === idx && (
                <div className={`px-4 pb-4 pt-3 text-[13px] sm:text-xs ${muted} leading-relaxed border-t border-[#DADCE0]/60 dark:border-[#3C4043]`}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 bg-[#051E34] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FFCA28]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set up in under 60 seconds</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-google-sans tracking-tight">
            Ready to modernize your coaching center?
          </h2>
          <p className="text-[13px] sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Indian coaching and education centers saving 40+ hours every month on fee follow-ups, paper attendance registers, and parent communications.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-sm sm:max-w-none mx-auto">
            <ConsoleButton variant="primary" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}
              onClick={() => onSelectRole('CENTER_ADMIN')} className="w-full sm:w-auto justify-center">
              Launch Live Center Admin Demo
            </ConsoleButton>
            <ConsoleButton variant="secondary" size="lg" onClick={onEnterApp}
              className="w-full sm:w-auto justify-center bg-white/10 text-white border-white/20 hover:bg-white/20 dark:bg-white/10 dark:text-white">
              Enter VidyaOS Application
            </ConsoleButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`bg-white dark:bg-[#1E1F20] border-t border-[#DADCE0] dark:border-[#3C4043] py-8 px-4 lg:px-8 text-xs ${muted}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4">
          <VidyaLogo size="sm" badgeText="ENTERPRISE" subtitle="Operating System for Coaching & Education Centers" />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button onClick={() => onSelectRole('CENTER_ADMIN')} className="hover:text-[#FFA000] cursor-pointer py-1">Center Admin</button>
            <button onClick={() => onSelectRole('PARENT')} className="hover:text-[#FFA000] cursor-pointer py-1">Parent Portal</button>
            <button onClick={() => onSelectRole('TEACHER')} className="hover:text-[#FFA000] cursor-pointer py-1">Teacher Desk</button>
            <button onClick={() => onSelectRole('STUDENT')} className="hover:text-[#FFA000] cursor-pointer py-1">Student Workspace</button>
          </div>
          <div>© 2026 VidyaOS Technologies India Pvt Ltd. All rights reserved.</div>
        </div>
      </footer>

      <PwaInstallModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} pwaState={pwaState} />
    </div>
  );
};
