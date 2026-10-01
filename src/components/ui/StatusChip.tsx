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
      bg: 'bg-[#E6F4EA] dark:bg-emerald-950/40',
      text: 'text-[#188038] dark:text-[#81C995]',
      border: 'border-[#CEEAD6] dark:border-emerald-800/40',
      dotColor: 'bg-[#188038] dark:bg-[#81C995]'
    },
    warning: {
      bg: 'bg-[#FEF7E0] dark:bg-amber-950/40',
      text: 'text-[#B06000] dark:text-[#FDD663]',
      border: 'border-[#FEEFC3] dark:border-amber-800/40',
      dotColor: 'bg-[#FFA000] dark:bg-[#FFCA28]'
    },
    error: {
      bg: 'bg-[#FCE8E6] dark:bg-rose-950/40',
      text: 'text-[#D93025] dark:text-[#F28B82]',
      border: 'border-[#FAD2CF] dark:border-rose-800/40',
      dotColor: 'bg-[#D93025] dark:bg-[#F28B82]'
    },
    info: {
      bg: 'bg-[#E8F0FE] dark:bg-blue-950/40',
      text: 'text-[#1A73E8] dark:text-[#8AB4F8]',
      border: 'border-[#D2E3FC] dark:border-blue-800/40',
      dotColor: 'bg-[#1A73E8] dark:bg-[#8AB4F8]'
    },
    neutral: {
      bg: 'bg-[#F1F3F4] dark:bg-[#282A2C]',
      text: 'text-[#5F6368] dark:text-[#9AA0A6]',
      border: 'border-[#DADCE0] dark:border-[#3C4043]',
      dotColor: 'bg-[#80868B] dark:bg-[#9AA0A6]'
    }
  };

  const currentVariant = variantStyles[variant];

  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5 gap-1.5',
    sm: 'text-xs px-2.5 py-1 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium font-google-sans rounded-full border ${currentVariant.bg} ${currentVariant.text} ${currentVariant.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.dotColor}`} />}
      <span className="capitalize">{label}</span>
    </span>
  );
};
