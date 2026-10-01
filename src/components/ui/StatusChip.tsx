import React from 'react';

export type StatusChipVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusChipProps {
  label: string;
  variant?: StatusChipVariant;
  size?: 'xs' | 'sm';
  dot?: boolean;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'neutral',
  size = 'xs',
  dot = true,
  className = ''
}) => {
  const variantStyles = {
    success: {
      bg: 'bg-[#34C759]/12 dark:bg-[#30D158]/15',
      text: 'text-[#248A3D] dark:text-[#30D158]',
      border: 'border-[#34C759]/25 dark:border-[#30D158]/30',
      dotColor: 'bg-[#34C759] dark:bg-[#30D158]'
    },
    warning: {
      bg: 'bg-[#FF9500]/12 dark:bg-[#FF9F0A]/15',
      text: 'text-[#C96B00] dark:text-[#FF9F0A]',
      border: 'border-[#FF9500]/25 dark:border-[#FF9F0A]/30',
      dotColor: 'bg-[#FF9500] dark:bg-[#FF9F0A]'
    },
    error: {
      bg: 'bg-[#FF3B30]/12 dark:bg-[#FF453A]/15',
      text: 'text-[#D70015] dark:text-[#FF453A]',
      border: 'border-[#FF3B30]/25 dark:border-[#FF453A]/30',
      dotColor: 'bg-[#FF3B30] dark:bg-[#FF453A]'
    },
    info: {
      bg: 'bg-[#0071E3]/12 dark:bg-[#2997FF]/15',
      text: 'text-[#0071E3] dark:text-[#2997FF]',
      border: 'border-[#0071E3]/25 dark:border-[#2997FF]/30',
      dotColor: 'bg-[#0071E3] dark:bg-[#2997FF]'
    },
    neutral: {
      bg: 'bg-black/[0.04] dark:bg-white/[0.08]',
      text: 'text-[#86868B] dark:text-[#A1A1A6]',
      border: 'border-black/[0.06] dark:border-white/[0.12]',
      dotColor: 'bg-[#86868B] dark:bg-[#A1A1A6]'
    }
  };

  const currentVariant = variantStyles[variant];

  const sizeClasses = {
    xs: 'text-[10.5px] px-2.5 py-0.5 gap-1.5',
    sm: 'text-xs px-3 py-1 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium font-apple-text tracking-tight rounded-full border ${currentVariant.bg} ${currentVariant.text} ${currentVariant.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.dotColor}`} />}
      <span className="capitalize">{label}</span>
    </span>
  );
};
