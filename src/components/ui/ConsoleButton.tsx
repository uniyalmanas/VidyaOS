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
    "inline-flex items-center justify-center font-medium font-google-sans transition-all duration-150 rounded-lg select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]";

  const variantClasses = {
    primary:
      "bg-[#FFA000] hover:bg-[#F57C00] active:bg-[#E65100] text-[#202124] font-bold shadow-xs hover:shadow-sm border border-[#FF8F00]/40 dark:bg-[#FFCA28] dark:hover:bg-[#FFB300] dark:text-[#121314]",
    secondary:
      "bg-white hover:bg-[#F1F3F4] text-[#3C4043] border border-[#DADCE0] shadow-2xs hover:border-[#BDC1C6] dark:bg-[#1E1F20] dark:hover:bg-[#282A2C] dark:text-[#E8EAED] dark:border-[#3C4043] dark:hover:border-[#5F6368]",
    blue:
      "bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold shadow-xs border border-transparent dark:bg-[#8AB4F8] dark:hover:bg-[#AECBFA] dark:text-[#121314]",
    ghost:
      "bg-transparent hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] dark:hover:bg-[#282A2C] dark:text-[#9AA0A6] dark:hover:text-white border border-transparent",
    danger:
      "bg-white hover:bg-rose-50 text-[#D93025] border border-rose-200 dark:bg-[#1E1F20] dark:hover:bg-rose-950/30 dark:text-[#F28B82] dark:border-rose-900/50"
  };

  const sizeClasses = {
    xs: "text-xs px-2.5 py-1 gap-1.5 h-7",
    sm: "text-xs px-3 py-1.5 gap-1.5 h-8",
    md: "text-sm px-4 py-2 gap-2 h-9",
    lg: "text-base px-5 py-2.5 gap-2.5 h-10"
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
