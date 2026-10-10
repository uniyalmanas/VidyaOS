import React, { useState, useEffect } from 'react';
import {
  Building2, Users, BookOpen, GraduationCap, ShieldCheck, ArrowRight, Sparkles,
  Smartphone, QrCode, Shield, Clock, ChevronDown, TrendingUp, Check,
  ExternalLink, Sun, Moon, DownloadCloud, Menu, X, Network, Wallet, Gem,
  Image, Video, MessageCircle, Palette, Zap
} from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { CloudSkuId, UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { CLOUD_SKUS } from '../../lib/entitlements';
import {
  ConsoleButton,
  StatusChip,
  VidyaLogo,
  Reveal,
  RevealGroup,
  CountUp,
  HeroIllustration,
  HowItWorksInfographic
} from '../ui';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PwaInstallModal } from '../common/PwaInstallModal';
import {
  fadeUp, fadeUpLg, staggerContainer, dropdownIn, tFast, tSpring, easings
} from '../../lib/motion';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenLogin: () => void;
  onOpenArchitecture?: () => void;
  onEnterApp: () => void;
  onOpenRegister?: (planId?: 'starter' | 'growth' | 'pro') => void;
}

const border = 'border border-black/[0.08] dark:border-white/[0.08]';
const card = `bg-white dark:bg-[#1C1C1E] ${border} shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]`;
const muted = 'text-[#86868B] dark:text-[#86868B]';
const sectionTitle = 'text-xs uppercase tracking-wider font-semibold text-[var(--fb-primary)] font-apple-text';
const heading = 'text-3xl sm:text-4xl lg:text-5xl font-semibold font-apple-display tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#console-demo', label: 'Console Demo' },
  { href: '#fee-calculator', label: 'Fee Calculator' },
  { href: '#pricing-tiers', label: 'Pricing' },
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
  { icon: QrCode, tint: 'bg-blue-500/10 text-[var(--fb-primary)]', title: 'Zero-Leakage UPI Fee Engine',
    text: 'Auto-generate fee invoices with student roll numbers, batch tags, and instant UPI QR codes. Parents pay via PhonePe, GPay, or Paytm, and get instant downloadable receipts.',
    points: ['Automated WhatsApp Due Reminders', 'GST / PAN Ready Digital Receipts'] },
  { icon: Smartphone, tint: 'bg-amber-500/10 text-[var(--fb-accent)]', title: '20-Second Mobile Attendance',
    text: 'Faculty marks entire batch attendance in seconds with 1-tap presets. Absent students automatically trigger real-time WhatsApp alerts to parents.',
    points: ['Real-time Absent Alerts to Parents', 'Monthly % Attendance Log'] },
  { icon: Building2, tint: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300', title: 'Multi-Branch & Batch Topology',
    text: 'Organize morning, evening, and weekend batches across multiple branches — school boards (CBSE, ICSE, State), IIT-JEE/NEET, and government-exam coaching (SSC, Banking, Railways, UPSC & State PSC).',
    points: ['Branch-Level Revenue Ledgers', 'Shared Faculty Timetable Slots'] },
  { icon: Sparkles, tint: 'bg-[#AF52DE]/12 text-[#AF52DE] dark:text-[#BF5AF2]', title: 'AI Study Assistant (Gemini)',
    text: 'Integrated Google Gemini intelligence grounds syllabus questions, creates instant test diagnostic summaries, and helps students review tricky concepts.',
    points: ['Smart Syllabus & Exam Tracker', 'Diagnostic Test Report Generation'] },
  { icon: Shield, tint: 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]', title: 'Multi-Tenant Data Privacy',
    text: 'Every coaching center gets a dedicated tenant workspace. Student phone numbers, fee data, and exam results are never mixed or shared with competitors.',
    points: ['Strict Role-Based Isolation', 'Hardened Firestore Security Rules'] },
  { icon: Clock, tint: 'bg-orange-500/10 text-[var(--fb-accent)]', title: 'Offline-Resilient Cloud Sync',
    text: 'Never halt attendance or receipt printing because of a broadband drop. Data is cached locally and automatically syncs when the connection resumes.',
    points: ['Instant Local-First Performance', 'Background Firestore Sync'] },
];

const freeCore = {
  name: 'Core ERP',
  price: '₹0',
  period: 'forever',
  blurb: 'The full operating system — invoicing, attendance, parent portal, staff & branches. Free for every coaching center, forever. No card required.',
  cta: 'Register Free Center',
  items: [
    { icon: Users, text: '150 students · 2 branches' },
    { icon: QrCode, text: 'UPI invoicing + receipts' },
    { icon: BookOpen, text: '20-second attendance' },
    { icon: Smartphone, text: 'Parent & student portals' },
    { icon: Network, text: 'Multi-branch topology' },
    { icon: Image, text: '1 GB media storage' },
    { icon: Shield, text: 'Offline-first sync' },
    { icon: Zap, text: 'Push notifications' }
  ] as const
};

/** Per-SKU visual identity for the Cloud Store shelf. */
const skuTints: Record<CloudSkuId, { emoji: string; tint: string }> = {
  media: { emoji: '🖼️', tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-300' },
  messaging: { emoji: '💬', tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  growth: { emoji: '🚀', tint: 'bg-teal-500/10 text-teal-600 dark:text-teal-300' },
  brand: { emoji: '🎨', tint: 'bg-pink-500/10 text-pink-600 dark:text-pink-300' },
  app: { emoji: '📱', tint: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' },
  video: { emoji: '🎬', tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-300' },
  ai: { emoji: '✨', tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  pro: { emoji: '💎', tint: 'bg-[#EA580C]/10 text-[#EA580C] dark:text-[#FDBA74]' }
};

const skuIcons: Record<CloudSkuId, React.ElementType> = {
  media: Image,
  messaging: MessageCircle,
  growth: TrendingUp,
  brand: Palette,
  app: Smartphone,
  video: Video,
  ai: Sparkles,
  pro: Gem
};

/** Rough cloud-stack forecast by center size (used by the ROI calculator). */
const cloudTierBySize: { max: number; label: string; detail: string; price: string; tone: 'free' | 'mid' | 'pro' }[] = [
  { max: 150, label: 'Free Forever Core', detail: 'Full ERP · ₹0/mo · no card', price: '₹0', tone: 'free' },
  { max: 500, label: 'Growth', detail: 'More students & branches + Cloud Messaging + Media', price: '₹1,097/mo', tone: 'mid' },
  { max: Infinity, label: 'Cloud Pro', detail: 'Everything in the cloud store', price: '₹1,999/mo', tone: 'pro' }
];

const marqueePhrases = [
  'Free Forever', '₹0 Gateway Cuts', '20-Second Attendance', 'WhatsApp Alerts',
  'SSC · Banking · Railways · UPSC', 'Multi-Branch', 'Offline-First Sync', 'No Card Required'
];

/** Funky scrolling ticker — two identical copies for a seamless -50% loop. */
const MarqueeStrip: React.FC<{ className?: string; tone?: 'brand' | 'dark' }> = ({ className = '', tone = 'brand' }) => (
  <div aria-hidden="true" className={`marquee-hover-pause relative overflow-hidden select-none ${className}`}>
    <div className="marquee-mask flex overflow-hidden">
      <div className="animate-marquee flex w-max items-center">
        {[0, 1].map(copy => (
          <div key={copy} className="flex items-center">
            {marqueePhrases.map(t => (
              <span
                key={`${copy}-${t}`}
                className="mx-5 inline-flex items-center gap-2.5 whitespace-nowrap font-funky font-bold tracking-tight text-sm sm:text-base"
              >
                {t}
                <span className={tone === 'brand' ? 'text-white/60' : 'text-[var(--fb-primary)]/50'}>✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Rotated sticker badge with a playful hover wiggle + optional emoji. */
const Sticker: React.FC<{
  children: React.ReactNode;
  className?: string;
  emoji?: string;
  tilt?: number;
  pop?: boolean;
}> = ({ children, className = '', emoji, tilt = -4, pop = true }) => (
  <span
    style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
    className={`animate-wiggle-hover inline-flex items-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-1.5 text-xs font-funky font-bold select-none shadow-[0_6px_20px_rgba(0,0,0,0.14)] ${pop ? 'animate-pop' : ''} ${className}`}
  >
    {emoji && <span className="text-sm leading-none">{emoji}</span>}
    {children}
  </span>
);

const faqs = [
  { q: 'Is VidyaOS really free? What is the catch?',
    a: "No catch — the core ERP is free forever for every center: 150 students, 2 branches, unlimited staff, and 1 GB of media storage. Attendance, UPI invoicing, the parent portal and push notifications never cost a rupee. You only pay if you switch on a cloud meter that actually costs us money to run — extra storage, automated WhatsApp/SMS, a branded app, hosted video, or AI credits. No card is required to start." },
  { q: 'How does UPI Fee Collection work? Do we need a complex payment gateway?',
    a: "No payment gateway or commercial merchant account required. VidyaOS generates instant dynamic UPI QR codes and deep-links for PhonePe, Google Pay, and Paytm directly mapped to your coaching institute's UPI VPA. When parents pay, automated receipts with GST/PAN and student enrollment details are generated instantly." },
  { q: 'Can teachers mark attendance from their personal mobile phones?',
    a: 'Yes. Teachers receive a dedicated, responsive mobile roster. Marking a batch of 40 students takes less than 20 seconds. The moment an absent student is marked, an automated WhatsApp alert can be sent to parents with class timing and institute contact info.' },
  { q: 'What if a parent has two or three children enrolled in different batches?',
    a: "VidyaOS has native Multi-Child support. Parents switch between their children in 1 tap from their portal without separate logins or accounts, seeing each child's individual attendance, test ranks, and fee invoices." },
  { q: 'Can VidyaOS work if the internet connection is unstable at our center?',
    a: 'Yes. VidyaOS is built with an offline-first architecture powered by client caching and hybrid Firestore synchronization. Attendance and student records load from offline storage, and sync seamlessly once connectivity restores.' },
  { q: 'Can we manage multiple branches under a single center owner login?',
    a: 'Yes. The free core already supports 2 branches with branch-level revenue filters and shared faculty schedules; larger networks can stack Cloud Pro for a bigger footprint. All from one owner login.' },
];

/* ------------------------------------------------------------------ */
/* Interactive demo widgets.                                           */
/* These live at MODULE scope on purpose: child components holding     */
/* useState inside the LandingPage body would remount on every parent  */
/* render and lose their state.                                        */
/* ------------------------------------------------------------------ */

const fmtINR = (n: number) => Math.round(n).toLocaleString('en-IN');
const fmtInt = (n: number) => String(Math.round(n));

/** Number that smoothly springs toward `value` instead of snapping. */
const AnimatedNumber: React.FC<{
  value: number;
  format: (n: number) => string;
  className?: string;
}> = ({ value, format, className }) => {
  const source = useMotionValue(value);
  const spring = useSpring(source, { stiffness: 170, damping: 26, mass: 0.6 });
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    source.set(value);
  }, [value, source]);

  useEffect(() => spring.on('change', latest => setDisplay(format(latest))), [spring, format]);

  return <span className={`count-up ${className ?? ''}`}>{display}</span>;
};

/** Parent-portal demo: paying the fee flips the button into a paid state. */
const PayFeeButton: React.FC = () => {
  const [paid, setPaid] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {paid ? (
        <motion.span
          key="paid"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={tSpring}
          className="inline-flex items-center justify-center gap-1.5 h-8 px-4 min-w-[160px] rounded-full text-xs font-bold select-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
        >
          <Check className="w-3.5 h-3.5" />
          Paid ₹2,500
        </motion.span>
      ) : (
        <motion.button
          key="pay"
          type="button"
          onClick={() => setPaid(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={tFast}
          className="hover-lift inline-flex items-center justify-center gap-1.5 h-8 px-4 min-w-[160px] rounded-full text-xs font-bold text-white cursor-pointer select-none bg-[var(--fb-primary)] hover:bg-[var(--fb-primary-hover)] border border-black/10 dark:border-white/15 shadow-[0_2px_12px_rgba(79,70,229,0.35)] active:scale-[0.97]"
        >
          <QrCode className="w-3.5 h-3.5" />
          Pay Fee (₹2,500)
        </motion.button>
      )}
    </AnimatePresence>
  );
};

type AttMark = 'P' | 'A' | 'L';

const rosterStudents = [
  { name: 'Rahul Sharma', roll: '10-01' },
  { name: 'Priya Verma', roll: '10-02' },
  { name: 'Aman Gupta', roll: '10-03' },
  { name: 'Sneha Iyer', roll: '10-04' },
];

const markPill: Record<AttMark, string> = {
  P: 'bg-[#188038]',
  A: 'bg-[#DC2626]',
  L: 'bg-[var(--fb-accent)]',
};

/**
 * Teacher demo: P/A/L segmented control per row (with a sliding layoutId
 * indicator) plus a working "Mark All 32 Present" bulk action.
 */
const AttendanceDesk: React.FC = () => {
  const [marks, setMarks] = useState<AttMark[]>(['P', 'P', 'A', 'P']);
  const allPresent = marks.every(m => m === 'P');

  const setMark = (idx: number, m: AttMark) =>
    setMarks(prev => prev.map((v, i) => (i === idx ? m : v)));

  const markAllPresent = () => setMarks(rosterStudents.map(() => 'P' as AttMark));

  return (
    <div className={`${card} p-4 rounded-xl space-y-3`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold">Batch Roster Attendance (Class 10 CBSE Math)</span>
          <p className={`text-[11px] ${muted}`}>Faculty: Prof. Anjali Sharma · 32 Students Enrolled</p>
        </div>
        <button
          type="button"
          onClick={markAllPresent}
          aria-disabled={allPresent}
          className={`inline-flex items-center justify-center h-7 px-3.5 min-w-[160px] rounded-full text-xs font-bold select-none transition-colors duration-150 ${
            allPresent
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 cursor-default'
              : 'hover-lift text-white cursor-pointer bg-[var(--fb-primary)] hover:bg-[var(--fb-primary-hover)] border border-black/10 dark:border-white/15 shadow-[0_2px_12px_rgba(79,70,229,0.35)] active:scale-[0.97]'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={allPresent ? 'done' : 'todo'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={tSpring}
              className="inline-flex items-center gap-1.5"
            >
              {allPresent ? (
                <><Check className="w-3.5 h-3.5" /> 32 Present</>
              ) : (
                'Mark All 32 Present'
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <div className="space-y-1.5">
        {rosterStudents.map((s, i) => (
          <div
            key={s.roll}
            className="p-2.5 bg-[#F5F5F7] dark:bg-[#000000] rounded-lg text-xs flex items-center justify-between gap-2 border border-black/[0.04] dark:border-white/[0.06]"
          >
            <span className="truncate">{s.name} · Roll {s.roll}</span>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.06] dark:border-white/[0.08] flex-shrink-0">
              {(['P', 'A', 'L'] as AttMark[]).map(m => {
                const active = marks[i] === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMark(i, m)}
                    aria-label={`${m === 'P' ? 'Present' : m === 'A' ? 'Absent' : 'Late'} for ${s.name}`}
                    aria-pressed={active}
                    className={`relative px-2 py-0.5 rounded-md font-bold text-[10px] cursor-pointer transition-colors duration-150 ${
                      active ? 'text-white' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`attMark-${i}`}
                        transition={tSpring}
                        className={`absolute inset-0 rounded-md transition-colors duration-200 ${markPill[m]}`}
                      />
                    )}
                    <span className="relative z-10">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className={`text-[10px] ${muted} pl-1`}>…and 28 more students in this batch</p>
      </div>
    </div>
  );
};

/** Student demo: "View Solution" expands an inline step-by-step answer. */
const StudentTestCard: React.FC = () => {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className={`${card} p-4 rounded-xl space-y-3`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold">Student Academic Vault · Rahul Sharma</span>
          <p className={`text-[11px] ${muted}`}>Class 10 CBSE · Mathematics & Science</p>
        </div>
        <div><StatusChip label="RANK #2" variant="success" size="xs" /></div>
      </div>

      <div className="p-3 bg-[#F5F5F7] dark:bg-[#000000] rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-black/[0.04] dark:border-white/[0.06]">
        <div>
          <span className="font-semibold">Diagnostic Test 3: Trigonometry</span>
          <p className={`text-[10px] ${muted}`}>Scored 44/50 (88%) · Percentile: 94th</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSolution(v => !v)}
          aria-expanded={showSolution}
          className="shrink-0 inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full text-xs font-bold cursor-pointer bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] hover:bg-[var(--fb-primary-subtle)] hover:text-[var(--fb-primary)] hover:border-[var(--fb-primary-border)] dark:hover:bg-[var(--fb-primary-subtle)] dark:hover:text-[var(--fb-primary)] dark:hover:border-[var(--fb-primary-border)] transition-colors duration-150 active:scale-[0.97]"
        >
          <motion.span animate={{ rotate: showSolution ? 180 : 0 }} transition={tFast} className="inline-flex">
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
          {showSolution ? 'Hide Solution' : 'View Solution'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showSolution && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: easings.outQuart }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] text-left">
              <span className="font-bold text-[11px] text-[var(--fb-primary)]">Q7 · Step-by-step solution</span>
              <p className={`text-[11px] ${muted} mt-1 leading-relaxed`}>
                Given cos θ = 0.6 → sin θ = √(1 − 0.36) = 0.8. Opposite : Hypotenuse = 0.8 : 1,
                so the triangle area resolves to <strong className="text-[#188038] dark:text-[#30D158]">48 cm²</strong>. Marks awarded: 5/5.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Console address-bar latency chip: cheap rotating "live" values. */
const latencySamples = [12, 11, 14, 9, 13, 10, 16, 12];

const LiveLatencyChip: React.FC = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIdx(v => (v + 1) % latencySamples.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.span
      key={latencySamples[idx]}
      initial={{ opacity: 0.35, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tFast}
      className="text-[9px] px-1 rounded tabular-nums bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-sans font-bold flex-shrink-0"
    >
      {latencySamples[idx]}ms
    </motion.span>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole, onOpenLogin, onOpenArchitecture, onEnterApp, onOpenRegister
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const pwaState = usePwaInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const forecastTier = cloudTierBySize.find(t => studentCount <= t.max) ?? cloudTierBySize[cloudTierBySize.length - 1];

  const totalMonthlyCollection = studentCount * monthlyFee;
  // Leakage grows with centre size: interpolates the stated 8–12% range
  // (8% at 20 students → 12% at 1,000 students) so copy and maths agree.
  const leakageRate = 0.08 + ((studentCount - 20) / 980) * 0.04;
  const estimatedRecoveredLeakage = Math.round(totalMonthlyCollection * leakageRate);
  const staffHoursSaved = Math.round(studentCount * 0.25);

  const registerCenter = () =>
    onOpenRegister ? onOpenRegister() : onSelectRole('CENTER_ADMIN');

  const stat = 'text-2xl sm:text-3xl font-bold font-apple-display tracking-tight';
  const statLabel = `text-xs font-normal ${muted} mt-0.5 font-apple-text`;

  return (
    <div className="w-full min-h-dvh overflow-x-hidden scroll-smooth bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text selection:bg-[var(--fb-primary-subtle)] selection:text-[var(--fb-primary)] transition-colors duration-200">

      {/* Dynamic Top App Bar: Apple Frosted Glass with Liquid Blur */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 px-4 sm:px-6 lg:px-8 ${
          isScrolled
            ? 'bg-white/90 dark:bg-[#000000]/90 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.22)] dark:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.85)] py-3 sm:py-3.5'
            : 'bg-white/80 dark:bg-[#000000]/80 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.06] shadow-none py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 w-full">
          {/* Brand Anchor: VidyaOS Emblem — smooth scroll to top, no hash jump */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center flex-shrink-0 cursor-pointer group"
            aria-label="VidyaOS — back to top"
          >
            <VidyaLogo size="md" showBadge={true} badgeText="v2.5" />
          </button>

          {/* Desktop Navigation Links: Clean Pill Cluster with slide-in underline */}
          <div className="hidden lg:flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.08] shadow-2xs">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="group relative px-3.5 lg:px-4 py-2 rounded-full text-[13px] font-semibold text-[#1D1D1F]/80 dark:text-[#F5F5F7]/80 hover:text-[var(--fb-primary)] hover:bg-white dark:hover:text-[var(--fb-primary)] dark:hover:bg-white/10 hover:shadow-2xs transition-all duration-150 whitespace-nowrap"
              >
                {l.label}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 right-3.5 bottom-1 h-0.5 rounded-full bg-[var(--fb-primary)] origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"
                />
              </a>
            ))}
          </div>

          {/* Right Action Cluster: Space-Optimized Minimalist Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Install App - Compact circular icon pill */}
            {!pwaState.isInstalled && (
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="p-2 sm:p-2.5 rounded-full border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 text-[#005ECF] dark:text-[#5AC8FA] transition cursor-pointer flex-shrink-0 active:scale-95"
                title="Install VidyaOS App"
                aria-label="Install App"
              >
                <DownloadCloud className="w-4 h-4 text-[#0071E3] dark:text-[#5AC8FA]" />
              </button>
            )}

            {/* Theme Toggle: Apple Minimalist Glass Pill */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-[#86868B] dark:text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-all cursor-pointer flex-shrink-0 active:scale-95"
              title={`Toggle Theme (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark'
                ? <Sun className="w-4 h-4 text-[#2997FF]" />
                : <Moon className="w-4 h-4 text-[#0071E3]" />}
            </button>

            {/* Register Center - Sleek subtle link on ultra-wide screens */}
            {onOpenRegister && (
              <button
                onClick={() => onOpenRegister()}
                className="hidden xl:inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold px-3 py-2 rounded-full text-[#005ECF] dark:text-[#5AC8FA] hover:bg-blue-500/10 transition cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#5AC8FA]" />
                <span>Register</span>
              </button>
            )}

            {/* Sign In - Sleek text ghost button */}
            <button
              onClick={onOpenLogin}
              className="text-xs sm:text-[13px] font-semibold px-3.5 sm:px-4 py-2 rounded-full text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer active:scale-95 whitespace-nowrap"
            >
              Sign In
            </button>

            {/* Console Button - Apple Key Blue Pill */}
            <ConsoleButton
              variant="blue"
              size="sm"
              iconRight={<ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />}
              onClick={onEnterApp}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-[13px] whitespace-nowrap font-semibold shadow-xs"
            >
              <span className="hidden sm:inline">Go to Console</span>
              <span className="sm:hidden">Console</span>
            </ConsoleButton>

            {/* Mobile/Tablet Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 sm:p-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer active:scale-95"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Navigation Drawer (animated enter + exit) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={dropdownIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="lg:hidden mt-2 p-2.5 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl space-y-2"
            >
              <div className="flex flex-col gap-0.5">
                {navLinks.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:bg-black/[0.06] transition flex items-center justify-between"
                  >
                    <span>{l.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#86868B]" />
                  </a>
                ))}
              </div>

              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
                {onOpenRegister && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-[#005ECF] dark:text-[#5AC8FA] border border-blue-500/25 text-center transition cursor-pointer"
                  >
                    Register Center
                  </button>
                )}
                {!pwaState.isInstalled && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setIsPwaModalOpen(true); }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg border border-black/[0.08] dark:border-white/[0.12] text-center cursor-pointer"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Install App</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="relative w-full overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,120,128,0.08),rgba(245,245,247,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(174,174,178,0.1),rgba(17,17,19,0))]">
        {/* Ambient indigo/saffron glow orbs + dotted paper grid — slow, decorative only */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-24 -right-24 h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.22),transparent_65%)] blur-3xl animate-gradient-pan" />
          <div className="absolute top-32 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.18),transparent_65%)] blur-2xl animate-float" />
          <div className="absolute top-72 -left-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.16),transparent_65%)] blur-2xl animate-float" style={{ animationDelay: '1.4s' }} />
          <div className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)] dark:opacity-30" />
        </div>

        {/* Floating funky stickers — decorative on wide screens only */}
        <div aria-hidden="true" className="hidden lg:block pointer-events-none absolute inset-0">
          <Sticker emoji="⚡" tilt={-9} className="absolute left-[3%] top-[15%] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] border-[#A5B4FC] dark:border-[#6366F1]/60">20-sec attendance</Sticker>
          <Sticker emoji="🧾" tilt={7} className="absolute right-[2%] top-[22%] bg-[#FBF3E4] dark:bg-[#3A2A16] text-[#9A5B00] dark:text-[#FBBF24] border-amber-400/70">₹0 gateway cuts</Sticker>
          <Sticker emoji="🎯" tilt={-6} className="absolute left-[5%] bottom-[16%] bg-[#EAF4FF] dark:bg-[#122B4D] text-[#005ECF] dark:text-[#5AC8FA] border-blue-500/40">SSC · UPSC · Banking</Sticker>
          <Sticker emoji="💸" tilt={8} className="absolute right-[4%] bottom-[8%] bg-[#E6F4EA] dark:bg-[#12331E] text-[#188038] dark:text-[#30D158] border-emerald-500/40">150 students free</Sticker>
        </div>

        <motion.div
          className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.12] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs max-w-full backdrop-blur-md">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0071E3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0071E3]"></span>
            </span>
            <span className="font-funky tracking-wide leading-tight text-center break-words sm:whitespace-nowrap">
              <span className="sm:hidden">VIDYAOS 2.5 • THE FREE-FOREVER COACHING OS</span>
              <span className="hidden sm:inline">VIDYAOS 2.5 • THE FREE-FOREVER COACHING OS</span>
            </span>
          </motion.div>

          <motion.h1 variants={fadeUpLg} className="font-funky text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] max-w-4xl mx-auto leading-[1.04]">
            Run your coaching.{' '}
            <span className="text-gradient-brand">Not your chaos.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className={`text-base sm:text-lg ${muted} max-w-2xl mx-auto leading-relaxed font-normal`}>
            Attendance, fees, parents & staff — tamed in one beautiful console. Built for tuition centers, schools and{' '}
            <strong className="text-[#1D1D1F] dark:text-white font-medium">SSC · Banking · Railways · UPSC</strong> coaching.
            Free forever. No card. No drama.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-medium text-[#86868B] max-w-2xl mx-auto">
            {['₹0 Gateway Cuts', '1-Tap Attendance (<20s)', 'Automated WhatsApp Alerts', 'Multi-Child Single Login', 'Offline-First Sync'].map(p => (
              <span key={p} className="px-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs transition-colors duration-150 hover:text-[var(--fb-primary)] hover:border-[var(--fb-primary-border)] dark:hover:text-[var(--fb-primary)] dark:hover:border-[var(--fb-primary-border)] cursor-default">{p}</span>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto sm:max-w-none">
            {onOpenRegister && (
              <motion.button
                type="button"
                onClick={() => onOpenRegister()}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={tFast}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-10 sm:h-11 px-6 rounded-full text-sm sm:text-base font-semibold text-white cursor-pointer select-none gradient-brand shadow-[0_8px_24px_rgba(79,70,229,0.40)] hover:shadow-[0_14px_36px_rgba(79,70,229,0.55)] transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fb-primary)] focus-visible:ring-offset-2"
              >
                <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
                <span>Start Free — No Card</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </motion.button>
            )}
            <ConsoleButton variant="secondary" size="lg"
              icon={<Building2 className="w-4 h-4 text-[var(--fb-primary)]" />}
              onClick={() => onSelectRole('CENTER_ADMIN')}
              className="w-full sm:w-auto justify-center hover:-translate-y-0.5">
              Open Admin Console Demo
            </ConsoleButton>
          </motion.div>

          <motion.div variants={fadeUpLg} className="pt-10 sm:pt-14">
            <div className="hover-lift bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <div className={`${stat} text-[#1D1D1F] dark:text-white`}><CountUp value={450} suffix="+" /></div>
                <div className={statLabel}>Coaching Centers Active</div>
              </div>
              <div>
                <div className={`${stat} text-[var(--fb-accent)]`}><CountUp value={4.8} decimals={1} prefix="₹" suffix=" Cr+" /></div>
                <div className={statLabel}>UPI Fees Reconciled</div>
              </div>
              <div>
                <div className={`${stat} text-[var(--fb-primary)]`}><CountUp value={20} prefix="< " suffix=" sec" /></div>
                <div className={statLabel}>1-Tap Batch Attendance</div>
              </div>
              <div>
                <div className={stat}><span className="text-gradient-brand"><CountUp value={99.8} decimals={1} suffix="%" /></span></div>
                <div className={statLabel}>Parent Transparency Rate</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Funky marquee ticker — free-core attitude on repeat */}
      <div className="relative z-10 bg-white dark:bg-[#1C1C1E]">
        <div className="rotate-[-1.1deg] scale-[1.02] bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#EA580C] text-white py-2.5 shadow-[0_10px_30px_rgba(79,70,229,0.35)]">
          <MarqueeStrip tone="brand" className="py-0 text-white" />
        </div>
      </div>

      {/* Hero brand illustration — the VidyaOS learning constellation */}
      <section className="relative -mt-6 sm:-mt-12 pb-6 sm:pb-10 max-w-4xl mx-auto px-4 lg:px-8">
        <Reveal variant="scale">
          <div className="relative rounded-[32px] border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#1C1C1E]/60 backdrop-blur-xl p-3 sm:p-6 shadow-[0_24px_70px_-24px_rgba(79,70,229,0.35)]">
            <HeroIllustration />
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-12 sm:py-20 max-w-7xl mx-auto px-4 lg:px-8 space-y-10 sm:space-y-12">
        <Reveal className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className={sectionTitle}>Engineered for Indian Realities</h2>
          <p className={`${heading} font-funky`}>Everything You Need to Run Your Institute</p>
          <p className={`text-[13px] sm:text-sm ${muted}`}>
            Built for how Indian coaching actually runs — cash/UPI reconciliations, multi-branch batches, instant parent communication.
          </p>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <motion.article
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: tFast }}
                whileTap={{ y: -1, scale: 0.99, transition: { duration: 0.1 } }}
                className={`group relative overflow-hidden p-5 sm:p-6 rounded-2xl space-y-3 cursor-default transition-[border-color] duration-200 hover:border-[var(--fb-primary-border)] dark:hover:border-[var(--fb-primary-border)] ${card}`}
              >
                {/* Gradient sheen that fades in on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(135deg,var(--fb-primary-subtle),transparent_45%,var(--fb-accent-subtle))]"
                />
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${f.tint} transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:-rotate-6`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="relative text-base font-bold font-google-sans">{f.title}</h3>
                <p className={`relative text-[13px] sm:text-xs ${muted} leading-relaxed`}>{f.text}</p>
                <ul className={`relative pt-2 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1.5 text-[13px] sm:text-xs ${muted}`}>
                  {f.points.map(p => (
                    <li key={p} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#188038] shrink-0" /> {p}</li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </RevealGroup>
      </section>

      {/* How it works — onboarding infographic */}
      <section id="how-it-works" className="scroll-mt-24 py-12 sm:py-16 bg-white dark:bg-[#1C1C1E] border-y border-black/[0.08] dark:border-white/[0.08] transition-colors">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 space-y-8 sm:space-y-10">
          <Reveal className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={sectionTitle}>From admission to receipt</h2>
            <p className={`${heading} font-funky`}>How a Day on VidyaOS Flows</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              Five connected steps replace paper registers, spreadsheets and chasing fee calls — inside one tenant-isolated workspace.
            </p>
          </Reveal>
          <Reveal variant="fade" delay={0.05}>
            <HowItWorksInfographic />
          </Reveal>
        </div>
      </section>

      {/* Role demo */}
      <section id="console-demo" className={`scroll-mt-24 py-12 sm:py-16 bg-white dark:bg-[#1C1C1E] border-y border-black/[0.08] dark:border-white/[0.08] transition-colors`}>
        <div id="interactive-demo" className="scroll-mt-24 max-w-6xl mx-auto px-4 lg:px-8 space-y-6 sm:space-y-8">
          <Reveal className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={sectionTitle}>Role-Based Console Experience</h2>
            <p className={`${heading} font-funky`}>One Unified OS, Five Dedicated Workspaces</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              Each stakeholder gets a purpose-built workspace with isolated permissions, clean tabular data, and zero noise.
            </p>
          </Reveal>

          {/* Role switcher with sliding indigo pill */}
          <Reveal variant="fade" className={`flex flex-nowrap sm:flex-wrap items-center sm:justify-center gap-1.5 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl ${border} w-full sm:w-fit mx-auto overflow-x-auto`}>
            {roleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-white shadow-xs'
                      : `${muted} hover:text-[#1D1D1F] dark:hover:text-white`
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="roleTabPill"
                      transition={tSpring}
                      className="absolute inset-0 rounded-lg bg-[var(--fb-primary)] shadow-[0_2px_12px_rgba(79,70,229,0.4)]"
                    />
                  )}
                  <Icon className={`relative z-10 w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[var(--fb-primary)]'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </Reveal>

          <Reveal variant="scale" delay={0.05} className={`bg-[#F5F5F7] dark:bg-[#000000] rounded-2xl ${border} overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/5`}>
            <div className={`bg-white dark:bg-[#1C1C1E] px-3 sm:px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3 text-xs`}>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                <div className="h-4 w-px bg-black/[0.08] dark:border-white/[0.08] mx-1"></div>
                <span className="font-google-sans font-bold hidden sm:inline">VidyaOS Console</span>
              </div>

              <div className={`flex-1 max-w-md mx-2 hidden sm:flex items-center space-x-2 px-3 py-1 rounded-md bg-black/[0.03] dark:bg-white/[0.06] ${muted} text-[11px] font-mono ${border}`}>
                <ShieldCheck className="w-3 h-3 text-[#188038] flex-shrink-0" />
                <span className="truncate" title="Live preview session — one-click launch from this demo">
                  https://console.vidyaos.in/apex-academy/{activePreviewTab.toLowerCase().replace('_', '-')}
                </span>
                <LiveLatencyChip />
              </div>

              <button
                onClick={() => onSelectRole(activePreviewTab)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--fb-primary-subtle)] text-[var(--fb-primary)] border border-[var(--fb-primary-border)] hover:bg-[var(--fb-primary)] hover:text-white transition-colors duration-150 cursor-pointer flex-shrink-0 ml-auto sm:ml-0 active:scale-95"
              >
                <span className="hidden sm:inline">Launch Live Session</span>
                <span className="sm:hidden">Launch</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="p-3 sm:p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activePreviewTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: easings.outQuart }}
                  className="space-y-4 sm:space-y-6"
                >
                  {activePreviewTab === 'CENTER_ADMIN' && (
                    <div className="space-y-4">
                      <div className={`${card} border-l-4 border-l-[var(--fb-primary)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
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
                        <div className={`${card} hover-lift p-4 rounded-xl`}>
                          <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Enrolled Students</span>
                          <div className="text-2xl font-bold font-google-sans mt-1">214</div>
                          <span className="text-[11px] text-[var(--fb-primary)]">Across 8 active batches</span>
                        </div>
                        <div className={`${card} hover-lift p-4 rounded-xl`}>
                          <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Today's Attendance</span>
                          <div className="text-2xl font-bold font-google-sans text-[#188038] dark:text-[#30D158] mt-1">94.8%</div>
                          <span className="text-[11px] text-[#188038] dark:text-[#30D158]">↑ 3.2% this month</span>
                        </div>
                        <div className={`${card} hover-lift p-4 rounded-xl`}>
                          <span className={`${muted} font-semibold uppercase tracking-wider text-[10px]`}>Pending Fees Due</span>
                          <div className="text-2xl font-bold font-google-sans text-[var(--fb-primary)] mt-1">₹42,500</div>
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
                        <PayFeeButton />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { l: 'Attendance', v: '92%', c: 'text-[#188038] dark:text-[#30D158]', s: 'Present Today' },
                          { l: 'Fees Due', v: '₹2,500', c: 'text-[var(--fb-primary)]', s: 'Due 10 Oct' },
                          { l: 'Latest Score', v: '44 / 50', c: 'text-[var(--fb-primary)]', s: 'Rank #2' },
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
                    <AttendanceDesk />
                  )}

                  {activePreviewTab === 'STUDENT' && (
                    <StudentTestCard />
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
                          { l: 'Monthly MRR', v: '₹18,40,000', c: 'text-[#188038] dark:text-[#30D158]' },
                          { l: 'Active Quotas', v: '28,400 Students', c: '' },
                          { l: 'Database Leaks', v: '0 Incidents', c: 'text-[#188038] dark:text-[#30D158]' },
                        ].map(m => (
                          <div key={m.l} className="p-2.5 bg-[#F5F5F7] dark:bg-[#000000] rounded-lg text-center border border-black/[0.04] dark:border-white/[0.06]">
                            <span className={`text-[10px] ${muted}`}>{m.l}</span>
                            <div className={`text-lg font-bold ${m.c}`}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Calculator */}
      <section id="fee-calculator" className="scroll-mt-24 py-12 sm:py-20 bg-white dark:bg-[#1C1C1E] border-y border-black/[0.08] dark:border-white/[0.08] transition-colors">
        <div id="roi-calculator" className="scroll-mt-24 max-w-5xl mx-auto px-4 lg:px-8 space-y-8 sm:space-y-10">
          <Reveal className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className={sectionTitle}>Course Fee Recovery Estimator</h2>
            <p className={`${heading} font-funky`}>Calculate Your Recovered Fee Leakage</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              Indian coaching & education centers typically lose 8–12% of total collections to delayed payments, uncollected dues, and lost receipts.
            </p>
          </Reveal>

          <Reveal className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#F5F5F7] dark:bg-[#000000] p-4 sm:p-8 rounded-2xl ${border}`}>
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <label htmlFor="students">Enrolled Students:</label>
                  <span className="text-[var(--fb-primary)] font-bold text-sm font-mono">{studentCount} Students</span>
                </div>
                <div className="py-2">
                  <input id="students" type="range" min="20" max="1000" step="10" value={studentCount}
                    onChange={e => setStudentCount(Number(e.target.value))}
                    aria-label="Enrolled students"
                    className="vidya-range touch-pan-y" />
                </div>
                <div className="flex justify-between text-[10px] text-[#86868B] mt-1 font-mono">
                  <span>20</span><span>500</span><span>1,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <label htmlFor="fee">Average Monthly Fee per Student:</label>
                  <span className="text-[var(--fb-accent)] font-bold text-sm font-mono">₹{monthlyFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="py-2">
                  <input id="fee" type="range" min="500" max="10000" step="250" value={monthlyFee}
                    onChange={e => setMonthlyFee(Number(e.target.value))}
                    aria-label="Average monthly fee per student"
                    className="vidya-range accent-range touch-pan-y" />
                </div>
                <div className="flex justify-between text-[10px] text-[#86868B] mt-1 font-mono">
                  <span>₹500</span><span>₹5,000</span><span>₹10,000</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-lg ${card} text-[13px] sm:text-xs ${muted} flex items-start gap-2.5`}>
                <TrendingUp className="w-4 h-4 text-[var(--fb-primary)] shrink-0 mt-0.5" />
                <span>
                  Automatic UPI payment links & automated WhatsApp reminders achieve an average <strong>92% on-time collection rate</strong> within 5 days of invoice dispatch.
                </span>
              </div>
            </div>

            <div className={`lg:col-span-5 ${card} p-5 sm:p-6 rounded-xl space-y-4 text-center hover-lift hover:border-[var(--fb-primary-border)] dark:hover:border-[var(--fb-primary-border)]`}>
              <div>
                <span className={`text-[10px] ${muted} font-semibold uppercase tracking-wider`}>Total Monthly Revenue</span>
                <div className="text-2xl font-bold font-google-sans mt-1 break-words">₹<AnimatedNumber value={totalMonthlyCollection} format={fmtINR} /></div>
              </div>

              <div className="p-4 bg-[#E6F4EA] dark:bg-emerald-950/40 rounded-xl border border-[#CEEAD6] dark:border-emerald-800/40 transition-transform duration-200 hover:scale-[1.015]">
                <span className="text-xs text-[#188038] dark:text-[#81C995] font-semibold block">Estimated Fee Leakage Recovered</span>
                <div className="text-2xl sm:text-3xl font-bold font-google-sans text-[#188038] dark:text-[#81C995] mt-1 break-words">
                  + ₹<AnimatedNumber value={estimatedRecoveredLeakage} format={fmtINR} />
                </div>
                <span className={`text-[10px] ${muted}`}>
                  per month · applies a {(leakageRate * 100).toFixed(1)}% leakage rate (industry range 8–12%)
                </span>
              </div>

              <div className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-shadow duration-200 hover:shadow-md ${
                forecastTier.tone === 'free'
                  ? 'bg-[#EAF4FF] dark:bg-blue-950/40 border-[var(--fb-primary-border)]'
                  : forecastTier.tone === 'mid'
                    ? 'bg-[#E6F4EA] dark:bg-emerald-950/40 border-[#CEEAD6] dark:border-emerald-800/40'
                    : 'bg-[#FBF3E4] dark:bg-[#3A2A16] border-amber-400/60'
              }`}>
                <div>
                  <span className="text-[10px] font-bold text-[var(--fb-primary)] uppercase tracking-wider block">Your Free-Tier Forecast</span>
                  <span className="text-xs font-bold">{forecastTier.label} · {forecastTier.detail}</span>
                </div>
                <span className={`text-xs font-bold shrink-0 ${forecastTier.tone === 'free' ? 'text-[var(--fb-primary)]' : forecastTier.tone === 'mid' ? 'text-[#188038] dark:text-[#30D158]' : 'text-[#9A5B00] dark:text-[#FBBF24]'}`}>{forecastTier.price}</span>
              </div>

              <div className="text-xs text-[var(--fb-primary)] font-semibold">⚡ ~<AnimatedNumber value={staffHoursSaved} format={fmtInt} /> Staff Hours Saved Every Month</div>

              <ConsoleButton variant="primary" size="md" onClick={registerCenter} className="w-full justify-center">
                Start Free — No Card
              </ConsoleButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing — Free software, paid cloud */}
      <section id="pricing-tiers" className="scroll-mt-24 py-12 sm:py-20 max-w-6xl mx-auto px-4 lg:px-8 space-y-10 sm:space-y-12">
        <Reveal className="max-w-2xl mx-auto">
          <div id="pricing" className="scroll-mt-24 text-center space-y-2">
            <h2 className={sectionTitle}>Free software · Paid cloud · Zero gatekeeping</h2>
            <p className={`${heading} font-funky`}>Your core ERP is free. Forever.</p>
            <p className={`text-[13px] sm:text-sm ${muted}`}>
              No card. No trial countdown. No per-seat rent. Pay only when you switch on a cloud meter that actually runs on our servers.
            </p>
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Forever core card */}
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -3 }}
            transition={tFast}
            className="relative overflow-hidden rounded-3xl gradient-brand text-white p-6 sm:p-8 shadow-[0_24px_60px_-20px_rgba(79,70,229,0.55)]"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#EA580C]/30 blur-3xl animate-float" />
            </div>
            <Sticker emoji="🆓" tilt={-6} className="absolute -top-3 right-5 z-10 bg-white text-[#4F46E5] border-[#C7D2FE]">
              FREE FOREVER
            </Sticker>
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-funky font-bold uppercase tracking-wider">
                <Wallet className="w-3 h-3" /> Core ERP · No card required
              </span>
              <div>
                <div className="text-5xl sm:text-6xl font-funky font-extrabold tracking-tight">
                  ₹0 <span className="text-lg font-semibold text-white/70">/ forever</span>
                </div>
                <p className="text-white/85 text-xs sm:text-sm leading-relaxed mt-2 max-w-sm">{freeCore.blurb}</p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {freeCore.items.map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <li key={item.text} className="flex items-center gap-2 text-[11px] sm:text-xs font-medium text-white/90 bg-white/10 rounded-lg px-2.5 py-2 border border-white/10">
                      <ItemIcon className="w-3.5 h-3.5 text-[#C7D2FE] shrink-0" />
                      {item.text}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={registerCenter}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-bold bg-white text-[#4F46E5] cursor-pointer hover-lift hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)] active:scale-[0.97]"
              >
                <Sparkles className="w-4 h-4" />
                {freeCore.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Why-free explainer column */}
          <div className="space-y-4">
            <div className={`${card} rounded-2xl p-5 hover-lift`}>
              <h3 className="font-funky font-extrabold text-sm flex items-center gap-2">
                <span className="text-base" aria-hidden="true">💡</span> Why is the core free?
              </h3>
              <p className={`text-[12px] ${muted} leading-relaxed mt-1.5`}>
                Attendance, invoices, portals and push run on standard cloud infra — cheap for us, so free for you. The software is the product we give away; the cloud is the meter.
              </p>
            </div>
            <div className={`${card} rounded-2xl p-5 hover-lift`}>
              <h3 className="font-funky font-extrabold text-sm flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🧾</span> What costs money?
              </h3>
              <p className={`text-[12px] ${muted} leading-relaxed mt-1.5`}>
                Only the <strong className="text-[#1D1D1F] dark:text-white font-semibold">meters that genuinely cost us money</strong>: extra media storage, automated WhatsApp/SMS/email, hosted video, AI credits, a custom brand and a branded app. Your bill stays ₹0 until you choose one.
              </p>
            </div>
            <div className="rounded-2xl p-5 bg-gradient-to-br from-[#E6F4EA] to-[#D6EDE0] dark:from-emerald-950/50 dark:to-emerald-900/30 border border-[#CEEAD6] dark:border-emerald-800/40 hover-lift">
              <h3 className="font-funky font-extrabold text-sm text-[#188038] dark:text-[#30D158] flex items-center gap-2">
                <span aria-hidden="true">🎁</span> The free forever bundle
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['150 students', '2 branches', 'Unlimited staff', '1 GB media', 'Push notifications', 'UPI invoicing'].map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-full bg-white/70 dark:bg-white/10 text-[10px] font-bold text-[#188038] dark:text-[#30D158] border border-[#CEEAD6] dark:border-emerald-800/40">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Cloud Store — the meters */}
        <Reveal className="text-center space-y-2 pt-2">
          <p className={sectionTitle}>The Cloud Store</p>
          <h3 className="text-2xl sm:text-3xl font-funky font-extrabold tracking-tight">
            Meters you switch on <span className="text-gradient-brand">only when you need them</span>
          </h3>
          <p className={`text-[13px] sm:text-sm ${muted} max-w-xl mx-auto`}>
            Prices straight from our live store — pay for exactly the cloud you use. Buy one meter, or all seven via Cloud Pro at a bundle discount.
          </p>
        </Reveal>

        <RevealGroup className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {CLOUD_SKUS.map(sku => {
            const Icon = skuIcons[sku.id];
            const t = skuTints[sku.id];
            const isPro = sku.id === 'pro';
            return (
              <motion.div
                key={sku.id}
                variants={fadeUp}
                whileHover={{ y: -3, transition: tFast }}
                className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col gap-3 cursor-default ${card} hover:border-[var(--fb-primary-border)] transition-[border-color] duration-200`}
              >
                {isPro && (
                  <>
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 gradient-brand" />
                    <span className="absolute -top-2.5 right-3 rotate-3 rounded-full bg-[#EA580C] text-white text-[9px] font-funky font-extrabold uppercase tracking-wider px-2 py-0.5 shadow-md">
                      Best deal
                    </span>
                  </>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${t.tint} group-hover:-rotate-6 group-hover:scale-110 transition-transform duration-200`}>
                    <span aria-hidden="true">{t.emoji}</span>
                  </div>
                  <Icon className="w-4 h-4 text-[#86868B] group-hover:text-[var(--fb-primary)] transition-colors duration-150" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-funky font-extrabold">{sku.name}</h4>
                  <p className={`text-[11px] leading-snug ${muted}`}>{sku.tagline}</p>
                </div>
                <div className="mt-auto flex items-baseline justify-between gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-lg font-bold font-google-sans">₹{sku.priceMonthly}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>per month</span>
                </div>
              </motion.div>
            );
          })}
        </RevealGroup>

        {/* Fair-use trust strip */}
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#86868B]">
            {['Switch meters on/off anytime', 'Prorated monthly billing', 'No card needed to start', 'Core keeps working if you skip a meter'].map(t => (
              <span key={t} className="px-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs transition-colors duration-150 hover:text-[var(--fb-primary)] hover:border-[var(--fb-primary-border)] cursor-default">{t}</span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faqs" className="scroll-mt-24 py-12 sm:py-16 max-w-4xl mx-auto px-4 lg:px-8 space-y-8">
        <Reveal className="text-center space-y-2">
          <h2 className={sectionTitle}>Frequently Asked Questions</h2>
          <p className="text-2xl sm:text-3xl font-funky font-extrabold tracking-tight">Answers for Coaching Center Owners</p>
        </Reveal>

        <RevealGroup className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <motion.div key={idx} variants={fadeUp} className={`${card} rounded-xl overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)]`}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className={`w-full min-h-[48px] p-4 text-left flex items-center justify-between gap-2 text-[13px] sm:text-xs font-bold cursor-pointer transition-colors duration-150 ${
                    isOpen ? 'text-[var(--fb-primary)]' : 'hover:text-[var(--fb-primary)]'
                  }`}
                >
                  <span>{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={tFast}
                    className={`shrink-0 ${isOpen ? 'text-[var(--fb-primary)]' : 'text-[#86868B]'}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: easings.outQuart }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 pt-3 text-[13px] sm:text-xs ${muted} leading-relaxed border-t border-black/[0.08] dark:border-white/[0.08]`}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </RevealGroup>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-14 sm:py-24 text-white">
        <div aria-hidden="true" className="absolute inset-0 gradient-brand" />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0B0A1F]/70" />
        <div aria-hidden="true" className="absolute -top-20 -left-24 -right-24 h-72 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.32),transparent_65%)] blur-3xl animate-float" />
        <div aria-hidden="true" className="absolute inset-0 bg-dot-grid opacity-20" />
        <div aria-hidden="true" className="absolute top-8 -right-8 sm:right-12 rotate-12 rounded-full border-[3px] border-[#FDBA74]/70 text-[#FDBA74] font-funky font-extrabold uppercase tracking-[0.18em] text-xs px-4 py-2 opacity-70">
          Free · Forever
        </div>

        <Reveal variant="up-lg" className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#FDBA74]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set up in under 60 seconds</span>
          </div>
          <h2 className="font-funky text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Your institute, minus the{' '}
            <span className="text-[#FDBA74]">paper madness.</span> 🎉
          </h2>
          <p className="text-[13px] sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Indian coaching & education centers running attendance, fees and parents on one free console.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-sm sm:max-w-none mx-auto">
            <ConsoleButton variant="primary" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}
              onClick={() => onSelectRole('CENTER_ADMIN')}
              className="w-full sm:w-auto justify-center hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(79,70,229,0.6)]">
              Launch Live Center Admin Demo
            </ConsoleButton>
            <ConsoleButton variant="secondary" size="lg" onClick={onEnterApp}
              className="w-full sm:w-auto justify-center bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white hover:-translate-y-0.5 dark:bg-white/10 dark:text-white">
              Enter VidyaOS Application
            </ConsoleButton>
          </div>
        </Reveal>
      </section>

      {/* Bottom marquee — send-off on the funky wall */}
      <div className="bg-white dark:bg-[#1C1C1E]">
        <div className="rotate-[0.8deg] scale-[1.02] bg-gradient-to-r from-[#EA580C] via-[#4F46E5] to-[#7C3AED] text-white py-2.5">
          <MarqueeStrip tone="brand" className="py-0 text-white" />
        </div>
      </div>

      {/* Footer */}
      <footer className={`bg-white dark:bg-[#1C1C1E] border-t border-black/[0.08] dark:border-white/[0.08] py-8 px-4 lg:px-8 text-xs ${muted}`}>
        <Reveal variant="fade" className="max-w-7xl mx-auto flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4">
          <VidyaLogo size="sm" badgeText="ENTERPRISE" subtitle="Operating System for Coaching & Education Centers" />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button onClick={() => onSelectRole('CENTER_ADMIN')} className="hover:text-[var(--fb-accent)] transition-colors duration-150 cursor-pointer py-1">Center Admin</button>
            <button onClick={() => onSelectRole('PARENT')} className="hover:text-[var(--fb-accent)] transition-colors duration-150 cursor-pointer py-1">Parent Portal</button>
            <button onClick={() => onSelectRole('TEACHER')} className="hover:text-[var(--fb-accent)] transition-colors duration-150 cursor-pointer py-1">Teacher Desk</button>
            <button onClick={() => onSelectRole('STUDENT')} className="hover:text-[var(--fb-accent)] transition-colors duration-150 cursor-pointer py-1">Student Workspace</button>
            {onOpenArchitecture && (
              <button
                onClick={onOpenArchitecture}
                className="inline-flex items-center gap-1.5 hover:text-[var(--fb-accent)] transition-colors duration-150 cursor-pointer py-1"
              >
                <Network className="w-3.5 h-3.5" />
                <span>View Architecture</span>
              </button>
            )}
          </div>
          <div>© 2026 VidyaOS Technologies India Pvt Ltd. All rights reserved.</div>
        </Reveal>
      </footer>

      <PwaInstallModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} pwaState={pwaState} />
    </div>
  );
};
