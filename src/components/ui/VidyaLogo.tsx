import React from 'react';

export interface VidyaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * VidyaIcon: Custom high-precision vector mark.
 * Concept: "The Vidya Radiant Prism"
 * Fuses the sacred Diya/Jyoti flame of wisdom with geometric crystalline OS layers.
 */
export const VidyaIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Flame Left Facet Gradient: Bright Scarlet Red */}
        <linearGradient id="vidya-left-flame" x1="12" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF1744" />
          <stop offset="100%" stopColor="#D50000" />
        </linearGradient>

        {/* Flame Right Facet Gradient: Bright Fiery Orange */}
        <linearGradient id="vidya-right-flame" x1="36" y1="4" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFAB00" />
          <stop offset="45%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#FF3D00" />
        </linearGradient>

        {/* Center Radiant Core Spine: Pure Light */}
        <linearGradient id="vidya-core-spine" x1="24" y1="6" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#FFF3E0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF6D00" stopOpacity="0.15" />
        </linearGradient>

        {/* Base Foundation Arc: Pure Bright Red to Radiant Orange (Zero Black) */}
        <linearGradient id="vidya-os-base" x1="8" y1="36" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D50000" />
          <stop offset="50%" stopColor="#FF3D00" />
          <stop offset="100%" stopColor="#FF6D00" />
        </linearGradient>

        {/* Ambient Subtle Shadow/Glow */}
        <filter id="vidya-ambient-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF3D00" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background Soft Glow Disc */}
      <circle cx="24" cy="24" r="22" fill="#FF3D00" fillOpacity="0.08" className="dark:fill-opacity-15" />

      {/* Layer 1: The OS Architectural Pedestal (Diya Wisdom Base / Open Knowledge Foundation) */}
      <path
        d="M8 36.5C13.5 35 19 36 24 38.5C29 36 34.5 35 40 36.5C38 41 31.5 43.5 24 43.5C16.5 43.5 10 41 8 36.5Z"
        fill="url(#vidya-os-base)"
      />
      {/* Upper Foundation Edge highlight */}
      <path
        d="M8.5 36.5C13.8 35.1 19.1 36.1 24 38.5C28.9 36.1 34.2 35.1 39.5 36.5"
        stroke="#FF9100"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />

      {/* Layer 2: Left Geometric Flame Wing (Knowledge Ascent) */}
      <path
        d="M24 6.5C24 6.5 13 17 11 26C9.5 32.5 15.5 36.5 24 38.5C20.5 33 21 24 24 16.5V6.5Z"
        fill="url(#vidya-left-flame)"
        filter="url(#vidya-ambient-glow)"
      />

      {/* Layer 3: Right Geometric Flame Wing (Action & Intelligence) */}
      <path
        d="M24 6.5V16.5C27 24 27.5 33 24 38.5C32.5 36.5 38.5 32.5 37 26C35 17 24 6.5 24 6.5Z"
        fill="url(#vidya-right-flame)"
      />

      {/* Layer 4: Internal Floating Diamond Core (Fiery Orange-Red Core) */}
      <path
        d="M24 18L27.5 24.5L24 31L20.5 24.5L24 18Z"
        fill="#FF3D00"
        stroke="#FFD54F"
        strokeWidth="0.8"
      />

      {/* Layer 5: Luminous Center Spine Highlight */}
      <path
        d="M24 8.5L24.8 20L24 34"
        stroke="url(#vidya-core-spine)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const VidyaLogo: React.FC<VidyaLogoProps> = ({
  size = 'md',
  showText = true,
  showBadge = false,
  badgeText = '',
  subtitle,
  className = '',
  onClick
}) => {
  const sizeMap = {
    xs: { iconSize: 22, textClass: 'text-sm', badgeClass: 'text-[9px] px-1 py-0.2', subClass: 'text-[10px]' },
    sm: { iconSize: 26, textClass: 'text-base', badgeClass: 'text-[9px] px-1.5 py-0.5', subClass: 'text-[10px]' },
    md: { iconSize: 32, textClass: 'text-lg', badgeClass: 'text-[10px] px-1.5 py-0.5', subClass: 'text-xs' },
    lg: { iconSize: 42, textClass: 'text-2xl', badgeClass: 'text-xs px-2 py-0.5', subClass: 'text-xs' },
    xl: { iconSize: 52, textClass: 'text-3xl', badgeClass: 'text-xs px-2.5 py-1', subClass: 'text-sm' }
  };

  const current = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-2.5 select-none ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {/* Precision Vector Icon */}
      <VidyaIcon size={current.iconSize} />

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className={`font-google-sans font-bold tracking-tight ${current.textClass}`}>
              <span className="text-[#FF1744]">Vidya</span>
              <span className="text-[#FF6D00]">OS</span>
            </span>

            {showBadge && (
              <span
                className={`font-mono font-bold tracking-wider uppercase rounded-md bg-orange-500/10 text-[#FF5722] dark:text-[#FF9100] border border-orange-500/30 hidden md:inline-block ${current.badgeClass}`}
              >
                {badgeText}
              </span>
            )}
          </div>

          {subtitle && (
            <span className={`text-[#5F6368] dark:text-[#9AA0A6] font-medium tracking-tight -mt-0.5 hidden md:block ${current.subClass}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
