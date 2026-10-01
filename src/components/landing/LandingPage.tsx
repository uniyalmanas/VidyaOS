import React, { useState } from 'react';
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Smartphone,
  CreditCard,
  QrCode,
  Shield,
  Clock,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingUp,
  Check,
  Star,
  ExternalLink,
  Laptop,
  Flame,
  PhoneCall,
  Send,
  Play,
  Sun,
  Moon,
  Search,
  Bell,
  DownloadCloud
} from 'lucide-react';
import { UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ConsoleButton, StatusChip, VidyaLogo } from '../ui';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from '../common/PwaInstallModal';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenLogin: () => void;
  onOpenArchitecture: () => void;
  onEnterApp: () => void;
  onOpenRegister?: (planId?: 'starter' | 'growth' | 'pro') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole,
  onOpenLogin,
  onOpenArchitecture,
  onEnterApp,
  onOpenRegister
}) => {
  const { resolvedTheme, toggleTheme, theme } = useTheme();
  const pwaState = usePwaInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);

  // Interactive Live Demo preview tab
  const [activePreviewTab, setActivePreviewTab] = useState<UserRole>('CENTER_ADMIN');

  // ROI Calculator state
  const [studentCount, setStudentCount] = useState<number>(250);
  const [monthlyFee, setMonthlyFee] = useState<number>(2500);

  // Recommended plan based on enrolled student scale
  const recommendedPlan =
    studentCount <= 100
      ? { id: 'starter' as const, name: 'Starter Batch', price: '₹599/mo', desc: 'Up to 100 students' }
      : studentCount <= 300
      ? { id: 'growth' as const, name: 'Growth Academy', price: '₹1,299/mo', desc: 'Up to 300 students' }
      : { id: 'pro' as const, name: 'Multi-Branch Pro', price: '₹2,199/mo', desc: 'Up to 1,000 students' };

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Computed ROI
  const totalMonthlyCollection = studentCount * monthlyFee;
  const estimatedRecoveredLeakage = Math.round(totalMonthlyCollection * 0.08); // 8% saved from uncollected/delayed fees
  const staffHoursSaved = Math.round(studentCount * 0.25); // ~62 hours saved per month

  const faqs = [
    {
      q: "How does UPI Fee Collection work? Do we need a complex payment gateway?",
      a: "No payment gateway or commercial merchant account required. VidyaOS generates instant dynamic UPI QR codes and deep-links for PhonePe, Google Pay, and Paytm directly mapped to your coaching institute's UPI VPA. When parents pay, automated receipts with GST/PAN and student enrollment details are generated instantly."
    },
    {
      q: "Can teachers mark attendance from their personal mobile phones?",
      a: "Yes. Teachers receive a dedicated, responsive mobile roster. Marking a batch of 40 students takes less than 20 seconds. The moment an absent student is marked, an automated WhatsApp alert can be sent to parents with class timing and institute contact info."
    },
    {
      q: "What if a parent has two or three children enrolled in different batches?",
      a: "VidyaOS has native Multi-Child support. Parents switch between their children in 1 tap from their portal without separate logins or accounts, seeing each child's individual attendance, test ranks, and fee invoices."
    },
    {
      q: "Can VidyaOS work if the internet connection is unstable at our center?",
      a: "Yes. VidyaOS is built with an offline-first architecture powered by client caching and hybrid Firestore synchronization. Attendance and student records load from offline storage, and sync seamlessly once connectivity restores."
    },
    {
      q: "Can we manage multiple branches under a single center owner login?",
      a: "Absolutely. Center owners can configure multiple branches (e.g., South Ex Branch, Rohini Branch, Kalu Sarai Branch), filter students and fee collections by branch, and manage shared faculty schedules."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#131314] text-[#202124] dark:text-[#E8EAED] font-['Inter',system-ui,sans-serif] selection:bg-[#FFA000]/25 selection:text-[#202124] transition-colors duration-200">
      
      {/* 1. Official Firebase Top App Bar */}
      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-[#1E1F20]/95 backdrop-blur-md border-b border-[#DADCE0] dark:border-[#3C4043] px-4 lg:px-8 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Official VidyaOS Console Brand Anchor */}
          <VidyaLogo size="sm" badgeText="CONSOLE v2.5" subtitle="Coaching & Education Center OS" />

          {/* Center Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6 text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
            <a href="#features" className="hover:text-[#FFA000] dark:hover:text-[#FFCA28] transition">Platform Features</a>
            <a href="#interactive-demo" className="hover:text-[#FFA000] dark:hover:text-[#FFCA28] transition">Console Demo</a>
            <a href="#roi-calculator" className="hover:text-[#FFA000] dark:hover:text-[#FFCA28] transition">Fee Calculator</a>
            <a href="#pricing" className="hover:text-[#FFA000] dark:hover:text-[#FFCA28] transition">Pricing Tiers</a>
            <a href="#faqs" className="hover:text-[#FFA000] dark:hover:text-[#FFCA28] transition">FAQs</a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Install App Link/Button in Header for iOS, Android, Laptop */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#B06000] dark:text-[#FFCA28] text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Install VidyaOS PWA on iOS, Android or Laptop"
              aria-label="Install App"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-[#FFA000] dark:text-[#FFCA28]" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">App</span>
              {pwaState.platform !== 'unknown' && (
                <span className="hidden md:inline text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 font-mono">
                  {pwaState.platform === 'ios' ? 'iOS' : pwaState.platform === 'android' ? 'Android' : 'Laptop'}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition cursor-pointer"
              title={`Toggle Theme (Current: ${theme})`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FFCA28]" />
              ) : (
                <Moon className="w-4 h-4 text-[#FFA000]" />
              )}
            </button>

            {onOpenRegister && (
              <ConsoleButton
                variant="primary"
                size="xs"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => onOpenRegister?.()}
                className="hidden md:inline-flex"
              >
                Register Center
              </ConsoleButton>
            )}

            <ConsoleButton
              variant="secondary"
              size="xs"
              onClick={onOpenLogin}
            >
              Sign In
            </ConsoleButton>

            <ConsoleButton
              variant="primary"
              size="xs"
              iconRight={<ArrowRight className="w-3 h-3" />}
              onClick={onEnterApp}
            >
              Go to Console
            </ConsoleButton>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section (Ultra-Premium Google/Firebase Style) */}
      <section className="relative overflow-hidden pt-14 pb-20 lg:pt-24 lg:pb-28 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,160,0,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,160,0,0.15),rgba(19,19,20,0))]">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-40 dark:opacity-20 bg-[radial-gradient(#FFA000_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="max-w-5xl mx-auto px-4 lg:px-8 text-center space-y-7">
          {/* Glowing Shimmer Badge */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-500/30 text-xs font-semibold text-[#B06000] dark:text-[#FFCA28] shadow-[0_0_20px_rgba(255,160,0,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFA000] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFA000]"></span>
            </span>
            <span className="font-google-sans tracking-wide">VIDYAOS 2.5 • GOOGLE CLOUD ARCHITECTURE FOR COACHING & EDUCATION CENTERS</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-google-sans tracking-tight text-[#202124] dark:text-[#F8F9FA] max-w-4xl mx-auto leading-[1.14]">
            The Modern Operating System for{' '}
            <span className="bg-gradient-to-r from-[#E65100] via-[#FFA000] to-[#FFCA28] bg-clip-text text-transparent">
              Coaching & Education Centers
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-[#5F6368] dark:text-[#9AA0A6] max-w-2xl mx-auto leading-relaxed font-normal">
            Eliminate chaotic WhatsApp groups, lost paper attendance registers, and overdue cash fees. VidyaOS unites{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">zero-surcharge UPI payments</strong>,{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">20-second batch attendance</strong>, and{' '}
            <strong className="text-[#202124] dark:text-white font-semibold">automated WhatsApp parent alerts</strong> in one reliable cloud console.
          </p>

          {/* Feature Highlight Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-mono font-medium text-[#5F6368] dark:text-[#9AA0A6]">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] shadow-2xs">
              ✓ ₹0 Gateway Cuts (Direct UPI)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] shadow-2xs">
              ✓ 1-Tap Attendance (&lt;20s)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] shadow-2xs">
              ✓ Automated WhatsApp Alerts
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] shadow-2xs">
              ✓ Multi-Child Single Login
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] shadow-2xs">
              ✓ Offline-First Sync
            </span>
          </div>

          {/* CTA Action Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            {onOpenRegister && (
              <ConsoleButton
                variant="primary"
                size="lg"
                icon={<Sparkles className="w-4 h-4" />}
                iconRight={<ArrowRight className="w-4 h-4" />}
                onClick={() => onOpenRegister?.()}
                className="shadow-[0_4px_14px_rgba(255,160,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,160,0,0.45)] transform hover:-translate-y-0.5 transition"
              >
                Register Your Center (Free Trial)
              </ConsoleButton>
            )}

            <ConsoleButton
              variant="secondary"
              size="lg"
              icon={<Building2 className="w-4 h-4 text-[#FFA000]" />}
              onClick={() => onSelectRole('CENTER_ADMIN')}
            >
              Open Admin Console Demo
            </ConsoleButton>
          </div>

          {/* Premium Trust Metrics Container */}
          <div className="pt-10">
            <div className="bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-md border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl p-6 shadow-xs max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-left sm:text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-google-sans text-[#202124] dark:text-white">
                  450+
                </div>
                <div className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  Coaching Centers Active
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-google-sans text-[#188038] dark:text-[#81C995]">
                  ₹4.8 Cr+
                </div>
                <div className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  UPI Fees Reconciled
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-google-sans text-[#FFA000] dark:text-[#FFCA28]">
                  &lt; 20 sec
                </div>
                <div className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  1-Tap Batch Attendance
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-google-sans text-[#1A73E8] dark:text-[#8AB4F8]">
                  99.8%
                </div>
                <div className="text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  Parent Transparency Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Role Showcase / Live Interactive Firebase Console Preview */}
      <section id="interactive-demo" className="py-16 bg-white dark:bg-[#1E1F20] border-y border-[#DADCE0] dark:border-[#3C4043] transition-colors">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans">
              Role-Based Console Experience
            </h2>
            <p className="text-2xl sm:text-3xl font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
              One Unified OS, Five Dedicated Workspaces
            </p>
            <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              Each stakeholder gets a purpose-built workspace with isolated permissions, clean tabular data, and zero noise.
            </p>
          </div>

          {/* Interactive Role Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] w-fit mx-auto">
            {[
              { id: 'CENTER_ADMIN', label: 'Center Admin Console', icon: Building2 },
              { id: 'PARENT', label: 'Parent Portal (Multi-Child)', icon: Users },
              { id: 'TEACHER', label: 'Faculty Attendance Desk', icon: BookOpen },
              { id: 'STUDENT', label: 'Student Workspace', icon: GraduationCap },
              { id: 'PLATFORM_OWNER', label: 'SaaS Super-Admin', icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as UserRole)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-white font-bold shadow-xs border border-[#FFA000]/40'
                      : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#FFA000]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Authentic Firebase Console Window Mockup */}
          <div className="bg-[#F8F9FA] dark:bg-[#131314] rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/5">
            {/* Console Mockup Top Bar */}
            <div className="bg-white dark:bg-[#1E1F20] px-4 py-3 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-2xs"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-2xs"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-2xs"></div>
                <div className="h-4 w-px bg-[#DADCE0] dark:bg-[#3C4043] mx-1"></div>
                <span className="font-google-sans font-bold text-[#202124] dark:text-[#E8EAED] hidden sm:inline">
                  VidyaOS Console
                </span>
              </div>

              {/* Simulated Omnibox Bar */}
              <div className="flex-1 max-w-md mx-2 hidden sm:flex items-center space-x-2 px-3 py-1 rounded-md bg-[#F1F3F4] dark:bg-[#131314] text-[#5F6368] dark:text-[#9AA0A6] text-[11px] font-mono border border-[#DADCE0] dark:border-[#3C4043]">
                <ShieldCheck className="w-3 h-3 text-[#188038] flex-shrink-0" />
                <span className="truncate">https://console.vidyaos.in/apex-academy/{activePreviewTab.toLowerCase().replace('_', '-')}</span>
                <span className="ml-auto text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-sans font-bold flex-shrink-0">
                  12ms
                </span>
              </div>

              <button
                onClick={() => onSelectRole(activePreviewTab)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#E65100] dark:text-[#FFCA28] bg-[#FFA000]/10 hover:bg-[#FFA000]/20 border border-[#FFA000]/30 transition cursor-pointer flex-shrink-0"
              >
                <span>Launch Live Session</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Console Workspace Content Preview */}
            <div className="p-6 space-y-6">
              {activePreviewTab === 'CENTER_ADMIN' && (
                <div className="space-y-4">
                  {/* Daily Priority Banner */}
                  <div className="bg-white dark:bg-[#1E1F20] border-l-4 border-l-[#FFA000] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <StatusChip label="DAILY PRIORITY" variant="warning" size="xs" />
                        <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                          Apex Science Academy · Session 2026–27
                        </span>
                      </div>
                      <h4 className="font-google-sans font-bold text-sm sm:text-base text-[#202124] dark:text-white mt-1">
                        Aaj Ka Kaam · 1-Tap Attendance & Overdue WhatsApp UPI
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-semibold text-[#188038]">
                        Counter UPI: apex@okaxis
                      </span>
                    </div>
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
                      <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold uppercase tracking-wider text-[10px]">
                        Enrolled Students
                      </span>
                      <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                        214
                      </div>
                      <span className="text-[11px] text-[#1A73E8]">Across 8 active batches</span>
                    </div>
                    <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
                      <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold uppercase tracking-wider text-[10px]">
                        Today's Attendance
                      </span>
                      <div className="text-2xl font-bold font-google-sans text-[#188038] mt-1">
                        94.8%
                      </div>
                      <span className="text-[11px] text-[#188038]">↑ 3.2% this month</span>
                    </div>
                    <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
                      <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-semibold uppercase tracking-wider text-[10px]">
                        Pending Fees Due
                      </span>
                      <div className="text-2xl font-bold font-google-sans text-[#E65100] dark:text-[#FFCA28] mt-1">
                        ₹42,500
                      </div>
                      <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">14 collections pending</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'PARENT' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">Logged in Parent:</span>
                        <strong className="text-xs text-[#202124] dark:text-white">Rajesh Sharma</strong>
                        <StatusChip label="OTP VERIFIED" variant="success" size="xs" />
                      </div>
                      <div className="text-sm font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                        Rahul Sharma (Class 10 CBSE) · Next Class: Today, 5:00 PM
                      </div>
                    </div>
                    <ConsoleButton
                      variant="primary"
                      size="sm"
                      icon={<QrCode className="w-3.5 h-3.5" />}
                    >
                      Pay Fee (₹2,500)
                    </ConsoleButton>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-[#1E1F20] p-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-center">
                      <span className="text-[10px] text-[#5F6368] uppercase font-bold">Attendance</span>
                      <div className="text-xl font-bold text-[#188038] mt-0.5">92%</div>
                      <span className="text-[10px] text-[#5F6368]">Present Today</span>
                    </div>
                    <div className="bg-white dark:bg-[#1E1F20] p-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-center">
                      <span className="text-[10px] text-[#5F6368] uppercase font-bold">Fees Due</span>
                      <div className="text-xl font-bold text-[#FFA000] mt-0.5">₹2,500</div>
                      <span className="text-[10px] text-[#5F6368]">Due 10 Oct</span>
                    </div>
                    <div className="bg-white dark:bg-[#1E1F20] p-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-center">
                      <span className="text-[10px] text-[#5F6368] uppercase font-bold">Latest Score</span>
                      <div className="text-xl font-bold text-[#1A73E8] mt-0.5">44 / 50</div>
                      <span className="text-[10px] text-[#5F6368]">Rank #2</span>
                    </div>
                    <div className="bg-white dark:bg-[#1E1F20] p-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] text-center">
                      <span className="text-[10px] text-[#5F6368] uppercase font-bold">Homework</span>
                      <div className="text-xl font-bold text-[#202124] dark:text-white mt-0.5">Checked</div>
                      <span className="text-[10px] text-[#188038]">0 Overdue</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'TEACHER' && (
                <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#202124] dark:text-white">Batch Roster Attendance (Class 10 CBSE Math)</span>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">Faculty: Prof. Anjali Sharma · 32 Students Enrolled</p>
                    </div>
                    <ConsoleButton variant="blue" size="xs">
                      Mark All 32 Present
                    </ConsoleButton>
                  </div>
                  <div className="p-3 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-xs text-[#5F6368] dark:text-[#9AA0A6] flex items-center justify-between">
                    <span>Rahul Sharma · Roll 10-01</span>
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 rounded bg-[#188038] text-white font-bold text-[10px]">P</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E1F20] border text-[#5F6368] font-bold text-[10px]">A</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1E1F20] border text-[#5F6368] font-bold text-[10px]">L</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'STUDENT' && (
                <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#202124] dark:text-white">Student Academic Vault · Rahul Sharma</span>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">Class 10 CBSE · Mathematics & Science</p>
                    </div>
                    <StatusChip label="RANK #2" variant="success" size="xs" />
                  </div>
                  <div className="p-3 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#202124] dark:text-white">Diagnostic Test 3: Trigonometry</span>
                      <p className="text-[10px] text-[#5F6368]">Scored 44/50 (88%) · Percentile: 94th</p>
                    </div>
                    <ConsoleButton variant="secondary" size="xs">View Solution</ConsoleButton>
                  </div>
                </div>
              )}

              {activePreviewTab === 'PLATFORM_OWNER' && (
                <div className="bg-white dark:bg-[#1E1F20] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#202124] dark:text-white">Multi-Tenant Platform Control</span>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">450+ Active Coaching Centers across India</p>
                    </div>
                    <StatusChip label="HEALTHY" variant="success" size="xs" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-center">
                      <span className="text-[10px] text-[#5F6368]">Monthly MRR</span>
                      <div className="text-lg font-bold text-[#188038]">₹18,40,000</div>
                    </div>
                    <div className="p-2.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-center">
                      <span className="text-[10px] text-[#5F6368]">Active Quotas</span>
                      <div className="text-lg font-bold text-[#202124] dark:text-white">28,400 Students</div>
                    </div>
                    <div className="p-2.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg text-center">
                      <span className="text-[10px] text-[#5F6368]">Database Leaks</span>
                      <div className="text-lg font-bold text-[#188038]">0 Incidents</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Feature Pillars (Firebase Product Suite style) */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans">
            Engineered for Indian Realities
          </h2>
          <p className="text-3xl font-bold font-google-sans text-[#202124] dark:text-white">
            Everything You Need to Run Your Institute
          </p>
          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            Tailored specifically for Indian coaching operations: cash/UPI reconciliations, multi-branch batches, and instant parent communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              Zero-Leakage UPI Fee Engine
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Auto-generate fee invoices with student roll numbers, batch tags, and instant UPI QR codes. Parents pay via PhonePe, GPay, or Paytm, and get instant downloadable receipts.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Automated WhatsApp Due Reminders</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> GST / PAN Ready Digital Receipts</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#188038]/15 text-[#188038] dark:text-[#81C995] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              20-Second Mobile Attendance
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Faculty marks entire batch attendance in seconds with 1-tap presets. Absent students automatically trigger real-time WhatsApp alerts to parents.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Real-time Absent Alerts to Parents</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Monthly % Attendance Log</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A73E8]/15 text-[#1A73E8] dark:text-[#8AB4F8] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              Multi-Branch & Batch Topology
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Organize morning, evening, and weekend batches across multiple branches. Supports CBSE, ICSE, State Boards, IIT-JEE, and NEET curriculums.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Branch-Level Revenue Ledgers</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Shared Faculty Timetable Slots</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              AI Study Assistant (Gemini)
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Integrated Google Gemini intelligence grounds syllabus questions, creates instant test diagnostic summaries, and helps students review tricky concepts.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Smart Syllabus & Exam Tracker</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Diagnostic Test Report Generation</li>
            </ul>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#188038]/15 text-[#188038] dark:text-[#81C995] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              Multi-Tenant Data Privacy
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Every coaching center gets a dedicated tenant workspace. Student phone numbers, fee data, and exam results are never mixed or shared with competitors.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Strict Role-Based Isolation</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Hardened Firestore Security Rules</li>
            </ul>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A73E8]/15 text-[#1A73E8] dark:text-[#8AB4F8] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-white">
              Offline-Resilient Cloud Sync
            </h3>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Never halt attendance or receipt printing because of a broadband drop. Data is cached locally and automatically syncs when the connection resumes.
            </p>
            <ul className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Instant Local-First Performance</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038]" /> Background Firestore Sync</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Pricing Calculator (Google Cloud Pricing Calculator style) */}
      <section id="roi-calculator" className="py-20 bg-white dark:bg-[#1E1F20] border-y border-[#DADCE0] dark:border-[#3C4043] transition-colors">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans">
              Course Fee Recovery Estimator
            </h2>
            <p className="text-2xl sm:text-3xl font-bold font-google-sans text-[#202124] dark:text-white">
              Calculate Your Recovered Fee Leakage
            </p>
            <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              Indian coaching & education centers typically lose 8–12% of total collections to delayed payments, uncollected dues, and lost receipts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#F8F9FA] dark:bg-[#131314] p-6 sm:p-8 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043]">
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-2">
                  <span>Enrolled Students:</span>
                  <span className="text-[#FFA000] font-bold text-sm font-mono">{studentCount} Students</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1200"
                  step="10"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#DADCE0] dark:bg-[#3C4043] rounded-lg appearance-none cursor-pointer accent-[#FFA000]"
                />
                <div className="flex justify-between text-[10px] text-[#5F6368] mt-1 font-mono">
                  <span>20</span>
                  <span>600</span>
                  <span>1,200+</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-[#202124] dark:text-[#E8EAED] mb-2">
                  <span>Average Monthly Fee per Student:</span>
                  <span className="text-[#188038] font-bold text-sm font-mono">₹{monthlyFee.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#DADCE0] dark:bg-[#3C4043] rounded-lg appearance-none cursor-pointer accent-[#188038]"
                />
                <div className="flex justify-between text-[10px] text-[#5F6368] mt-1 font-mono">
                  <span>₹500 / mo</span>
                  <span>₹5,000 / mo</span>
                  <span>₹10,000 / mo</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] text-xs text-[#5F6368] dark:text-[#9AA0A6] flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-[#FFA000] shrink-0 mt-0.5" />
                <span>
                  Automatic UPI payment links & automated WhatsApp reminders achieve an average <strong>92% on-time collection rate</strong> within 5 days of invoice dispatch.
                </span>
              </div>
            </div>

            {/* Results Card */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1E1F20] p-6 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-4 text-center">
              <div>
                <span className="text-xs text-[#5F6368] font-semibold uppercase tracking-wider text-[10px]">
                  Total Monthly Revenue
                </span>
                <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                  ₹{totalMonthlyCollection.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-4 bg-[#E6F4EA] dark:bg-emerald-950/40 rounded-xl border border-[#CEEAD6] dark:border-emerald-800/40">
                <span className="text-xs text-[#188038] dark:text-[#81C995] font-semibold block">
                  Estimated Fee Leakage Recovered
                </span>
                <div className="text-3xl font-bold font-google-sans text-[#188038] dark:text-[#81C995] mt-1">
                  + ₹{estimatedRecoveredLeakage.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                  per month from uncollected or delayed dues
                </span>
              </div>

              <div className="p-3 bg-[#FEF7E0] dark:bg-amber-950/40 rounded-xl border border-[#FEEFC3] dark:border-amber-900/40 text-left flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#E65100] dark:text-[#FFCA28] uppercase tracking-wider block">
                    Recommended Plan
                  </span>
                  <span className="text-xs font-bold text-[#202124] dark:text-white">
                    {recommendedPlan.name} ({recommendedPlan.price})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRegister ? onOpenRegister(recommendedPlan.id) : onSelectRole('CENTER_ADMIN')}
                  className="text-xs font-bold text-[#E65100] dark:text-[#FFCA28] hover:underline cursor-pointer"
                >
                  Select Plan →
                </button>
              </div>

              <div className="text-xs text-[#1A73E8] font-semibold">
                ⚡ ~{staffHoursSaved} Staff Hours Saved Every Month
              </div>

              <ConsoleButton
                variant="primary"
                size="md"
                onClick={() => onOpenRegister ? onOpenRegister(recommendedPlan.id) : onSelectRole('CENTER_ADMIN')}
                className="w-full justify-center"
              >
                Start with {recommendedPlan.name}
              </ConsoleButton>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Transparent Pricing Grid (Firebase Spark / Blaze style) */}
      <section id="pricing" className="py-20 max-w-6xl mx-auto px-4 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans">
            Simple, Transparent Pricing
          </h2>
          <p className="text-3xl font-bold font-google-sans text-[#202124] dark:text-white">
            Plans Built for Every Coaching Scale
          </p>
          <p className="text-xs sm:text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            No hidden gateway surcharges. Flat transparent pricing (₹599 / ₹1,299 / ₹2,199/mo). 14-day free trial on all plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Starter */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#5F6368] uppercase tracking-wider">Starter Batch</span>
                <div className="text-3xl font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                  ₹599<span className="text-xs font-normal text-[#5F6368]">/mo</span>
                </div>
                <p className="text-xs text-[#5F6368] mt-1">For single-branch neighborhood coaching & education centers.</p>
              </div>
              <ul className="space-y-2 text-xs text-[#5F6368] dark:text-[#9AA0A6] border-t border-[#DADCE0]/60 dark:border-[#3C4043] pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Up to 100 Enrolled Students</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> 1 Center Branch</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> 1-Tap UPI Invoicing & Receipts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Mobile Attendance Register</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Parent Portal Access</li>
              </ul>
            </div>
            <ConsoleButton
              variant="secondary"
              size="md"
              onClick={() => onOpenRegister ? onOpenRegister('starter') : onSelectRole('CENTER_ADMIN')}
              className="w-full justify-center"
            >
              Choose Starter Batch
            </ConsoleButton>
          </div>

          {/* Plan 2: Growth (Featured with Firebase Amber Accent) */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-2xl border-2 border-[#FFA000] shadow-lg flex flex-col justify-between space-y-6 relative transform lg:-translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <StatusChip label="MOST POPULAR" variant="warning" size="xs" />
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#E65100] dark:text-[#FFCA28] uppercase tracking-wider">Growth Academy</span>
                <div className="text-3xl font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                  ₹1,299<span className="text-xs font-normal text-[#5F6368]">/mo</span>
                </div>
                <p className="text-xs text-[#5F6368] mt-1">For growing institutes and competitive test prep centers.</p>
              </div>
              <ul className="space-y-2 text-xs text-[#202124] dark:text-[#E8EAED] font-medium border-t border-[#DADCE0]/60 dark:border-[#3C4043] pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Up to 300 Enrolled Students</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Up to 2 Branches Supported</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Automated WhatsApp Absentee Alerts</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Diagnostic Tests & Percentile Rankings</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Automated Exam & Test Scheduler</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Teacher Salary & Time Slot Scheduler</li>
              </ul>
            </div>
            <ConsoleButton
              variant="primary"
              size="md"
              onClick={() => onOpenRegister ? onOpenRegister('growth') : onSelectRole('CENTER_ADMIN')}
              className="w-full justify-center"
            >
              Start Free 14-Day Trial
            </ConsoleButton>
          </div>

          {/* Plan 3: Pro */}
          <div className="bg-white dark:bg-[#1E1F20] p-6 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#5F6368] uppercase tracking-wider">Multi-Branch Pro</span>
                <div className="text-3xl font-bold font-google-sans text-[#202124] dark:text-white mt-1">
                  ₹2,199<span className="text-xs font-normal text-[#5F6368]">/mo</span>
                </div>
                <p className="text-xs text-[#5F6368] mt-1">For large coaching networks and test prep academies.</p>
              </div>
              <ul className="space-y-2 text-xs text-[#5F6368] dark:text-[#9AA0A6] border-t border-[#DADCE0]/60 dark:border-[#3C4043] pt-4">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Up to 1,000 Enrolled Students</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Up to 5 Branches Supported</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Custom Domain & Center Branding</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> Dedicated WhatsApp API integration</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#188038]" /> 24/7 Priority Support & Onboarding</li>
              </ul>
            </div>
            <ConsoleButton
              variant="secondary"
              size="md"
              onClick={() => onOpenRegister ? onOpenRegister('pro') : onSelectRole('CENTER_ADMIN')}
              className="w-full justify-center"
            >
              Choose Multi-Branch Pro
            </ConsoleButton>
          </div>
        </div>
      </section>

      {/* 7. FAQs */}
      <section id="faqs" className="py-16 max-w-4xl mx-auto px-4 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-[#FFA000] dark:text-[#FFCA28] font-google-sans">
            Frequently Asked Questions
          </h2>
          <p className="text-2xl font-bold font-google-sans text-[#202124] dark:text-white">
            Answers for Coaching Center Owners
          </p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden transition"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-[#202124] dark:text-[#E8EAED] cursor-pointer"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-[#FFA000] shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#5F6368] shrink-0 ml-2" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed border-t border-[#DADCE0]/60 dark:border-[#3C4043]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Final CTA (Firebase Navy + Warm Amber) */}
      <section className="py-16 bg-[#051E34] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FFCA28]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set up in under 60 seconds</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold font-google-sans tracking-tight">
            Ready to modernize your coaching center?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Indian coaching and education centers saving 40+ hours every month on fee follow-ups, paper attendance registers, and parent communications.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <ConsoleButton
              variant="primary"
              size="lg"
              iconRight={<ArrowRight className="w-4 h-4" />}
              onClick={() => onSelectRole('CENTER_ADMIN')}
            >
              Launch Live Center Admin Demo
            </ConsoleButton>

            <ConsoleButton
              variant="secondary"
              size="lg"
              onClick={onEnterApp}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 dark:bg-white/10 dark:text-white"
            >
              Enter VidyaOS Application
            </ConsoleButton>
          </div>
        </div>
      </section>

      {/* 9. Official Footer */}
      <footer className="bg-white dark:bg-[#1E1F20] border-t border-[#DADCE0] dark:border-[#3C4043] py-8 px-4 lg:px-8 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <VidyaLogo size="sm" badgeText="ENTERPRISE" subtitle="Operating System for Coaching & Education Centers" />

          <div className="flex flex-wrap items-center gap-5">
            <button onClick={() => onSelectRole('CENTER_ADMIN')} className="hover:text-[#FFA000] cursor-pointer">Center Admin</button>
            <button onClick={() => onSelectRole('PARENT')} className="hover:text-[#FFA000] cursor-pointer">Parent Portal</button>
            <button onClick={() => onSelectRole('TEACHER')} className="hover:text-[#FFA000] cursor-pointer">Teacher Desk</button>
            <button onClick={() => onSelectRole('STUDENT')} className="hover:text-[#FFA000] cursor-pointer">Student Workspace</button>
          </div>

          <div>
            © 2026 VidyaOS Technologies India Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>

      {/* PWA Install Modal for iOS, Android, Laptop */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        pwaState={pwaState}
      />
    </div>
  );
};
