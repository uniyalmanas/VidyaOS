import React from 'react';
import {
  Building2,
  Users,
  Smartphone,
  QrCode,
  BarChart3,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';

/* ================================================================== */
/* Branded monogram avatar                                             */
/* ================================================================== */

const AVATAR_PALETTES: [string, string][] = [
  ['#6366F1', '#8B5CF6'],
  ['#F97316', '#DC2626'],
  ['#0EA5E9', '#4F46E5'],
  ['#10B981', '#0891B2'],
  ['#AF52DE', '#6366F1'],
  ['#F59E0B', '#EA580C'],
  ['#EC4899', '#8B5CF6'],
  ['#14B8A6', '#4F46E5']
];

const seedHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export interface VidyaAvatarProps {
  /** Person or entity name; drives the initials and (unless seeded) the color. */
  name?: string;
  /** Optional stable key so the same person always gets the same color. */
  seed?: string;
  size?: number;
  className?: string;
  /** `full` = circle (people), `xl` = rounded square (organizations). */
  shape?: 'full' | 'xl';
}

/**
 * Branded monogram avatar. Replaces external placeholder photos (e.g. the
 * Unsplash testimonial portrait on the login screen) with a deterministic,
 * offline, privacy-preserving gradient mark.
 */
export const VidyaAvatar: React.FC<VidyaAvatarProps> = ({
  name = '',
  seed,
  size = 40,
  className = '',
  shape = 'full'
}) => {
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const key = (seed || name || 'vidya').toLowerCase();
  const [from, to] = AVATAR_PALETTES[seedHash(key) % AVATAR_PALETTES.length];
  const initials = getInitials(name);
  const radius = shape === 'full' ? 30 : 18;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={name ? `${name} avatar` : 'VidyaOS avatar'}
      className={className}
    >
      <defs>
        <linearGradient id={`vav-${reactId}`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`vav-gloss-${reactId}`} x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx={radius} fill={`url(#vav-${reactId})`} />
      <rect x="2" y="2" width="60" height="60" rx={radius} fill={`url(#vav-gloss-${reactId})`} />
      <path
        d="M2 40L30 20L62 34V44C62 53.94 53.94 62 44 62H20C10.06 62 2 53.94 2 44V40Z"
        fill="#FFFFFF"
        fillOpacity="0.08"
      />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="inherit"
        fontSize="24"
        fontWeight="700"
        fill="#FFFFFF"
        letterSpacing="0.5"
      >
        {initials}
      </text>
    </svg>
  );
};

/* ================================================================== */
/* Hero illustration                                                   */
/* ================================================================== */

export interface HeroIllustrationProps {
  className?: string;
}

/**
 * The VidyaOS "learning constellation": the radiant prism at the centre of an
 * orbital hub that connects attendance, UPI fees, reports and parent alerts.
 */
export const HeroIllustration: React.FC<HeroIllustrationProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 640 520"
    role="img"
    aria-label="VidyaOS connects attendance, fees, reports and parent alerts around one center"
    className={`w-full h-auto ${className}`}
  >
    <defs>
      <radialGradient id="vhi-glow" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.30" />
        <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="vhi-core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#FFD54F" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FF3D00" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="vhi-flame-l" x1="12" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1744" />
        <stop offset="100%" stopColor="#D50000" />
      </linearGradient>
      <linearGradient id="vhi-flame-r" x1="36" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFAB00" />
        <stop offset="45%" stopColor="#FF6D00" />
        <stop offset="100%" stopColor="#FF3D00" />
      </linearGradient>
      <filter id="vhi-nodeShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1D1D1F" floodOpacity="0.12" />
      </filter>
    </defs>

    <rect x="20" y="20" width="600" height="480" rx="44" fill="url(#vhi-glow)" />
    <ellipse cx="320" cy="472" rx="236" ry="24" className="fill-slate-900/[0.05] dark:fill-black/40" />

    {/* orbital rings */}
    <g className="text-[var(--fb-primary)]">
      <ellipse
        cx="320" cy="258" rx="234" ry="118" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 9" opacity="0.35"
        transform="rotate(-16 320 258)"
      />
      <ellipse
        cx="320" cy="258" rx="198" ry="98" fill="none"
        stroke="currentColor" strokeWidth="1" opacity="0.22"
        transform="rotate(13 320 258)"
      />
    </g>

    {/* constellation links */}
    <g className="text-[var(--fb-primary)]" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7" fill="none" opacity="0.4">
      <path d="M320 258 L150 128" />
      <path d="M320 258 L500 150" />
      <path d="M320 258 L128 388" />
      <path d="M320 258 L510 396" />
    </g>

    {/* centre emblem */}
    <circle cx="320" cy="258" r="86" fill="url(#vhi-glow)" />
    <circle cx="320" cy="258" r="70" fill="url(#vhi-core)" />
    <circle cx="320" cy="258" r="64" fill="none" className="stroke-white/70 dark:stroke-white/25" strokeWidth="1.5" />
    <circle cx="320" cy="258" r="64" fill="none" className="stroke-[#FF6D00]/40" strokeWidth="1" strokeDasharray="3 6" />
    <g transform="translate(268 206) scale(2.1667)">
      <path
        d="M8 36.5C13.5 35 19 36 24 38.5C29 36 34.5 35 40 36.5C38 41 31.5 43.5 24 43.5C16.5 43.5 10 41 8 36.5Z"
        fill="url(#vhi-flame-r)"
      />
      <path
        d="M24 6.5C24 6.5 13 17 11 26C9.5 32.5 15.5 36.5 24 38.5C20.5 33 21 24 24 16.5V6.5Z"
        fill="url(#vhi-flame-l)"
      />
      <path
        d="M24 6.5V16.5C27 24 27.5 33 24 38.5C32.5 36.5 38.5 32.5 37 26C35 17 24 6.5 24 6.5Z"
        fill="url(#vhi-flame-r)"
      />
      <path d="M24 18L27.5 24.5L24 31L20.5 24.5L24 18Z" fill="#FF3D00" stroke="#FFD54F" strokeWidth="0.8" />
      <path d="M24 8.5L24.8 20L24 34" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* orbit pulse nodes */}
    <circle cx="176" cy="196" r="4" className="fill-[#6366F1]" />
    <circle cx="472" cy="330" r="4" className="fill-[#EA580C]" />
    <circle cx="452" cy="188" r="3" className="fill-[#7C3AED]" />
    <circle cx="186" cy="342" r="3" className="fill-[#10B981]" />

    {/* sparkles */}
    <g className="fill-[#FF6D00]" opacity="0.55">
      <path d="M250 66l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
      <path d="M566 250l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      <path d="M74 250l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      <path d="M336 466l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
    </g>

    {/* node: attendance */}
    <g>
      <rect x="66" y="96" width="168" height="64" rx="20" className="fill-white dark:fill-[#1C1C1E] stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" filter="url(#vhi-nodeShadow)" />
      <circle cx="100" cy="128" r="16" className="fill-[#10B981]" />
      <path d="M93 128l5 5 8-9" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="126" y="124" fontFamily="inherit" fontSize="14" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">Attendance</text>
      <rect x="126" y="134" width="82" height="7" rx="3.5" className="fill-slate-400/40 dark:fill-slate-500/50" />
    </g>

    {/* node: upi fees */}
    <g>
      <rect x="416" y="118" width="168" height="64" rx="20" className="fill-white dark:fill-[#1C1C1E] stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" filter="url(#vhi-nodeShadow)" />
      <circle cx="450" cy="150" r="16" className="fill-[#EA580C]" />
      <text x="450" y="151" textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontSize="17" fontWeight="800" fill="#FFFFFF">₹</text>
      <text x="476" y="146" fontFamily="inherit" fontSize="14" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">UPI Fees</text>
      <rect x="476" y="156" width="82" height="7" rx="3.5" className="fill-slate-400/40 dark:fill-slate-500/50" />
    </g>

    {/* node: reports */}
    <g>
      <rect x="44" y="356" width="168" height="64" rx="20" className="fill-white dark:fill-[#1C1C1E] stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" filter="url(#vhi-nodeShadow)" />
      <circle cx="78" cy="388" r="16" className="fill-[#6366F1]" />
      <g fill="#FFFFFF">
        <rect x="71" y="391" width="3.5" height="6" rx="1.5" />
        <rect x="76.5" y="386" width="3.5" height="11" rx="1.5" />
        <rect x="82" y="382" width="3.5" height="15" rx="1.5" />
      </g>
      <text x="104" y="384" fontFamily="inherit" fontSize="14" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">Reports</text>
      <rect x="104" y="394" width="82" height="7" rx="3.5" className="fill-slate-400/40 dark:fill-slate-500/50" />
    </g>

    {/* node: parent alerts */}
    <g>
      <rect x="426" y="364" width="168" height="64" rx="20" className="fill-white dark:fill-[#1C1C1E] stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" filter="url(#vhi-nodeShadow)" />
      <circle cx="460" cy="396" r="16" className="fill-[#7C3AED]" />
      <path d="M452 388h16a4 4 0 014 4v8a4 4 0 01-4 4h-7l-6 6v-6h-3a4 4 0 01-4-4v-8a4 4 0 014-4z" fill="#FFFFFF" />
      <text x="486" y="392" fontFamily="inherit" fontSize="14" fontWeight="700" className="fill-slate-800 dark:fill-slate-100">Parent Alerts</text>
      <rect x="486" y="402" width="74" height="7" rx="3.5" className="fill-slate-400/40 dark:fill-slate-500/50" />
    </g>
  </svg>
);

/* ================================================================== */
/* "How it works" infographic                                          */
/* ================================================================== */

interface HowStep {
  icon: LucideIcon;
  title: string;
  text: string;
  from: string;
  to: string;
}

const HOW_STEPS: HowStep[] = [
  {
    icon: Building2,
    title: 'Set up your center',
    text: 'Add your institute profile, UPI ID and branches in minutes.',
    from: '#6366F1',
    to: '#8B5CF6'
  },
  {
    icon: Users,
    title: 'Create batches & enroll',
    text: 'Organize classes by board and add students with roll numbers.',
    from: '#0EA5E9',
    to: '#4F46E5'
  },
  {
    icon: Smartphone,
    title: 'Mark 1-tap attendance',
    text: 'Faculty flags a full batch present in under 20 seconds on mobile.',
    from: '#10B981',
    to: '#0891B2'
  },
  {
    icon: QrCode,
    title: 'Collect UPI fees',
    text: 'Parents scan a dynamic QR and get instant digitised receipts.',
    from: '#F97316',
    to: '#DC2626'
  },
  {
    icon: BarChart3,
    title: 'Track results & reports',
    text: 'Diagnostics, percentiles and outcomes roll up automatically.',
    from: '#AF52DE',
    to: '#6366F1'
  }
];

export interface HowItWorksInfographicProps {
  className?: string;
  /** `full` for the landing section, `compact` for modals. */
  variant?: 'full' | 'compact';
}

/**
 * Five-step onboarding infographic (set up → attend → fees → results). Pure SVG
 * orbs with CSS layout so it reflows from one column to a full desktop rail.
 */
export const HowItWorksInfographic: React.FC<HowItWorksInfographicProps> = ({
  className = '',
  variant = 'full'
}) => {
  const steps = variant === 'compact' ? HOW_STEPS.slice(0, 4) : HOW_STEPS;
  const orbSize = variant === 'compact' ? 58 : 78;

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="hidden lg:block absolute left-[7%] right-[7%] h-[3px] rounded-full opacity-25 top-[38px] bg-[linear-gradient(90deg,#6366F1,#0EA5E9,#10B981,#F97316,#AF52DE)]"
      />

      <ol className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <svg
                  width={orbSize}
                  height={orbSize}
                  viewBox="0 0 80 80"
                  aria-hidden="true"
                  className="drop-shadow-[0_8px_20px_rgba(79,70,229,0.22)]"
                >
                  <defs>
                    <linearGradient id={`vhi-step-${variant}-${index}`} x1="10" y1="6" x2="70" y2="74" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor={step.from} />
                      <stop offset="100%" stopColor={step.to} />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="40" r="33" className="fill-white dark:fill-[#1C1C1E]" />
                  <circle cx="40" cy="40" r="33" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
                  <circle cx="40" cy="40" r="26" fill={`url(#vhi-step-${variant}-${index})`} />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={step.from} strokeOpacity="0.28" strokeWidth="1" strokeDasharray="3 5" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.2} />
                </span>
                <span
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-[#1C1C1E]"
                  style={{ background: `linear-gradient(135deg, ${step.from}, ${step.to})` }}
                >
                  {index + 1}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {step.title}
                </h3>
                <p className="text-xs text-[#86868B] leading-relaxed max-w-[15rem] mx-auto">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/* ================================================================== */
/* Empty-state illustrations                                           */
/* ================================================================== */

export type EmptyStateVariant =
  | 'students'
  | 'fees'
  | 'attendance'
  | 'search'
  | 'messages'
  | 'timetable'
  | 'exams'
  | 'reports'
  | 'generic';

export interface EmptyStateIllustrationProps {
  variant?: EmptyStateVariant;
  /** Rendered width in px. */
  size?: number;
  className?: string;
}

/** Small scene per empty state so "no data" reads as guidance, not a void. */
export const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({
  variant = 'generic',
  size = 132,
  className = ''
}) => {
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `ves-${reactId}`;
  const warmId = `ves-warm-${reactId}`;

  const backdrop = (
    <>
      <ellipse cx="70" cy="100" rx="52" ry="8" className="fill-slate-900/[0.05] dark:fill-black/40" />
      <circle cx="70" cy="52" r="42" className="fill-[#6366F1]/[0.08] dark:fill-[#6366F1]/[0.15]" />
    </>
  );

  let scene: React.ReactNode = null;

  if (variant === 'students') {
    scene = (
      <g>
        <circle cx="56" cy="50" r="16" fill={`url(#${gradId})`} />
        <circle cx="56" cy="45" r="6" fill="#FFFFFF" fillOpacity="0.92" />
        <path d="M44 60a12 12 0 0124 0z" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="86" cy="56" r="13" fill="#F59E0B" />
        <circle cx="86" cy="52" r="5" fill="#FFFFFF" fillOpacity="0.92" />
        <path d="M76 66a10 10 0 0120 0z" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="98" cy="36" r="11" className="fill-white dark:fill-[#1C1C1E]" />
        <path d="M98 31v10M93 36h10" className="stroke-[#6366F1] dark:stroke-[#A5B4FC]" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  } else if (variant === 'fees') {
    scene = (
      <g>
        <rect x="42" y="24" width="40" height="52" rx="6" className="fill-white dark:fill-[#1C1C1E] stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
        <rect x="50" y="34" width="24" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="50" y="43" width="24" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="50" y="52" width="16" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="92" cy="60" r="18" fill={`url(#${warmId})`} />
        <text x="92" y="61" textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontSize="20" fontWeight="800" fill="#FFFFFF">₹</text>
      </g>
    );
  } else if (variant === 'attendance') {
    scene = (
      <g>
        <rect x="40" y="30" width="60" height="52" rx="8" className="fill-white dark:fill-[#1C1C1E]" stroke="#10B981" strokeWidth="1.6" />
        <rect x="40" y="30" width="60" height="14" rx="8" fill="#10B981" />
        <rect x="40" y="38" width="60" height="6" fill="#10B981" />
        <path d="M60 66l6 6 14-16" fill="none" stroke="#10B981" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="46" cy="26" r="3" fill="#10B981" />
        <circle cx="94" cy="26" r="3" fill="#10B981" />
      </g>
    );
  } else if (variant === 'search') {
    scene = (
      <g>
        <rect x="34" y="26" width="52" height="56" rx="8" className="fill-white dark:fill-[#1C1C1E] stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
        <rect x="44" y="40" width="30" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="44" y="50" width="24" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="90" cy="64" r="18" className="fill-[#6366F1]/[0.15]" stroke={`url(#${gradId})`} strokeWidth="3.5" />
        <path d="M103 77l12 12" stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  } else if (variant === 'messages') {
    scene = (
      <g>
        <path d="M32 30h52a8 8 0 018 8v22a8 8 0 01-8 8H58l-14 11V68H32a8 8 0 01-8-8V38a8 8 0 018-8z" fill={`url(#${gradId})`} />
        <circle cx="46" cy="49" r="3" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="58" cy="49" r="3" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="70" cy="49" r="3" fill="#FFFFFF" fillOpacity="0.92" />
        <rect x="82" y="46" width="40" height="30" rx="8" className="fill-white dark:fill-[#1C1C1E]" stroke="#EA580C" strokeWidth="1.6" />
        <rect x="90" y="56" width="24" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="90" y="64" width="16" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
      </g>
    );
  } else if (variant === 'timetable') {
    scene = (
      <g>
        <rect x="34" y="30" width="72" height="54" rx="8" className="fill-white dark:fill-[#1C1C1E]" stroke={`url(#${gradId})`} strokeWidth="1.6" />
        <rect x="34" y="30" width="72" height="14" rx="8" fill={`url(#${gradId})`} />
        <g className="fill-slate-300 dark:fill-slate-600">
          <rect x="42" y="52" width="16" height="10" rx="2" />
          <rect x="62" y="52" width="16" height="10" rx="2" />
          <rect x="82" y="52" width="16" height="10" rx="2" />
          <rect x="42" y="67" width="16" height="10" rx="2" />
          <rect x="62" y="67" width="16" height="10" rx="2" />
        </g>
        <circle cx="100" cy="74" r="13" className="fill-white dark:fill-[#1C1C1E]" stroke="#EA580C" strokeWidth="2" />
        <path d="M100 68v6l4 3" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  } else if (variant === 'exams') {
    scene = (
      <g>
        <rect x="40" y="26" width="60" height="58" rx="8" className="fill-white dark:fill-[#1C1C1E]" stroke="#7C3AED" strokeWidth="1.6" />
        <rect x="56" y="20" width="28" height="12" rx="5" fill="#7C3AED" />
        <rect x="50" y="42" width="40" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="50" y="52" width="30" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="50" y="62" width="36" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="98" cy="70" r="15" fill="#10B981" />
        <path d="M91 70l5 5 9-11" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  } else if (variant === 'reports') {
    scene = (
      <g>
        <rect x="34" y="24" width="72" height="60" rx="8" className="fill-white dark:fill-[#1C1C1E] stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
        <rect x="44" y="60" width="10" height="16" rx="3" fill="#6366F1" />
        <rect x="60" y="48" width="10" height="28" rx="3" fill="#7C3AED" />
        <rect x="76" y="38" width="10" height="38" rx="3" fill="#F97316" />
        <path d="M44 46l16-10 12 6 20-16" fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
      </g>
    );
  } else {
    scene = (
      <g>
        <rect x="42" y="26" width="56" height="52" rx="10" className="fill-white dark:fill-[#1C1C1E] stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
        <rect x="52" y="40" width="36" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <rect x="52" y="50" width="26" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
        <circle cx="92" cy="66" r="14" fill={`url(#${gradId})`} />
        <path d="M92 60v12M86 66h12" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M108 30l2.2 5.4 5.4 2.2-5.4 2.2L108 45l-2.2-5.2-5.4-2.2 5.4-2.2z" className="fill-[#F97316]" fillOpacity="0.85" />
      </g>
    );
  }

  return (
    <svg
      width={size}
      height={(size / 140) * 112}
      viewBox="0 0 140 112"
      role="img"
      aria-label={`No ${variant} data`}
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="20" y1="14" x2="120" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={warmId} x1="20" y1="14" x2="120" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      {backdrop}
      {scene}
    </svg>
  );
};

/* ================================================================== */
/* Document watermark / letterhead emblem                              */
/* ================================================================== */

export interface VidyaWatermarkProps {
  /** Emblem width as a percentage of the container. Kept subtle for print. */
  size?: number;
  opacity?: number;
  className?: string;
}

/**
 * Faint centered emblem for printed documents (receipts, ID cards, transfer
 * certificates). Renders behind the content with `pointer-events: none`.
 */
export const VidyaWatermark: React.FC<VidyaWatermarkProps> = ({
  size = 62,
  opacity = 0.055,
  className = ''
}) => (
  <div
    aria-hidden="true"
    className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
  >
    <svg
      viewBox="0 0 48 48"
      fill="none"
      style={{ width: `${size}%`, maxWidth: '24rem', opacity }}
      className="text-slate-900"
    >
      <path d="M8 36.5C13.5 35 19 36 24 38.5C29 36 34.5 35 40 36.5C38 41 31.5 43.5 24 43.5C16.5 43.5 10 41 8 36.5Z" fill="currentColor" />
      <path d="M24 6.5C24 6.5 13 17 11 26C9.5 32.5 15.5 36.5 24 38.5C20.5 33 21 24 24 16.5V6.5Z" fill="currentColor" />
      <path d="M24 6.5V16.5C27 24 27.5 33 24 38.5C32.5 36.5 38.5 32.5 37 26C35 17 24 6.5 24 6.5Z" fill="currentColor" fillOpacity="0.72" />
      <path d="M24 18L27.5 24.5L24 31L20.5 24.5L24 18Z" fill="currentColor" />
    </svg>
  </div>
);

/* ================================================================== */
/* Small brand accents                                                 */
/* ================================================================== */

/** Tiny prism + label for footers and trust lines. */
export const VidyaBrandChip: React.FC<{ label?: string; className?: string }> = ({
  label = 'Powered by VidyaOS',
  className = ''
}) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 ${className}`}>
    <svg viewBox="0 0 48 48" fill="none" className="w-3.5 h-3.5">
      <path d="M24 6.5C24 6.5 13 17 11 26C9.5 32.5 15.5 36.5 24 38.5C20.5 33 21 24 24 16.5V6.5Z" fill="#FF1744" />
      <path d="M24 6.5V16.5C27 24 27.5 33 24 38.5C32.5 36.5 38.5 32.5 37 26C35 17 24 6.5 24 6.5Z" fill="#FF6D00" />
      <path d="M8 36.5C13.5 35 19 36 24 38.5C29 36 34.5 35 40 36.5C38 41 31.5 43.5 24 43.5C16.5 43.5 10 41 8 36.5Z" fill="#FF3D00" />
    </svg>
    <span>{label}</span>
  </span>
);

/** Shielded trust badge for auth and document surfaces. */
export const VidyaTrustBadge: React.FC<{ label: string; className?: string }> = ({
  label,
  className = ''
}) => (
  <div className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-white/[0.1] bg-white/70 dark:bg-white/[0.04] px-3 py-1.5 ${className}`}>
    <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
  </div>
);