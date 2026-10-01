import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ConsoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const ConsoleButton: React.FC<ConsoleButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  loading = false,
  icon,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium font-apple-text tracking-tight transition-all duration-150 rounded-full select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0071E3]/35 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97] ease-out";

  const variantClasses = {
    primary:
      "bg-gradient-to-b from-[#FFA726] to-[#F57C00] hover:from-[#FFB74D] hover:to-[#FFA000] text-slate-950 font-semibold shadow-[0_2px_8px_rgba(255,160,0,0.3)] border border-amber-400/40 dark:from-[#FFCA28] dark:to-[#FFA000] dark:text-[#121314]",
    secondary:
      "bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.1] shadow-2xs backdrop-blur-md",
    blue:
      "bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium shadow-[0_2px_8px_rgba(0,113,227,0.3)] border border-blue-400/30",
    ghost:
      "bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#86868B] hover:text-[#1D1D1F] dark:text-[#86868B] dark:hover:text-[#F5F5F7] border border-transparent",
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 text-[#FF3B30] dark:text-[#FF453A] border border-rose-500/20"
  };

  const sizeClasses = {
    xs: "text-xs px-3 py-1 gap-1.5 h-7",
    sm: "text-xs px-3.5 py-1.5 gap-1.5 h-8",
    md: "text-sm px-4.5 py-2 gap-2 h-9",
    lg: "text-sm sm:text-base px-6 py-2.5 gap-2.5 h-10 font-semibold"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
