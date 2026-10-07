import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

export interface ConsoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'children' | 'className' | 'disabled'>;

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
    "inline-flex items-center justify-center font-medium font-apple-text tracking-tight rounded-full select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fb-primary-border)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ease-out";

  const variantClasses = {
    primary:
      "bg-gradient-to-b from-[var(--fb-primary)] to-[var(--fb-primary-hover)] hover:brightness-110 hover:shadow-[var(--fb-glow-primary)] text-white font-semibold shadow-[0_2px_12px_rgba(79,70,229,0.28)] border border-black/10 dark:border-white/15",
    secondary:
      "bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.1] shadow-2xs backdrop-blur-md",
    blue:
      "bg-[var(--fb-primary)] hover:brightness-110 hover:shadow-[var(--fb-glow-primary)] text-white font-medium shadow-[0_2px_12px_rgba(79,70,229,0.28)] border border-black/10 dark:border-white/15",
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

  // Motion drives transform, so CSS only transitions color/opacity/filter.
  const motionProps = {
    whileHover: disabled || loading ? undefined : { y: -1 },
    whileTap: disabled || loading ? undefined : { scale: 0.96 },
    transition: { type: 'spring' as const, stiffness: 500, damping: 32, mass: 0.6 },
  } satisfies MotionButtonProps;

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} transition-[color,background-color,border-color,box-shadow,filter] duration-150 ${className}`}
      disabled={disabled || loading}
      {...motionProps}
      {...(props as MotionButtonProps)}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </motion.button>
  );
};
