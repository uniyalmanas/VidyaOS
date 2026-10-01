import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  accentColor?: string; // e.g. '#FFA000', '#1A73E8', '#188038'
  actionText?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  badge,
  onClick,
  accentColor = '#FFA000',
  actionText,
  className = ''
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-150 relative overflow-hidden group ${
        onClick
          ? 'hover:border-[#BDC1C6] dark:hover:border-[#5F6368] hover:shadow-xs active:scale-[0.99] cursor-pointer'
          : ''
      } ${className}`}
    >
      {/* Subtle Top Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-150"
        style={{ backgroundColor: accentColor }}
      />

      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between text-xs text-[#5F6368] dark:text-[#9AA0A6]">
          <span className="font-semibold font-google-sans uppercase tracking-wider text-[11px]">
            {label}
          </span>
          {icon ? (
            <div
              className="p-1.5 rounded-lg transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor
              }}
            >
              {icon}
            </div>
          ) : badge ? (
            badge
          ) : null}
        </div>

        {/* Primary Metric Number */}
        <div className="text-2xl sm:text-3xl font-bold font-google-sans text-[#202124] dark:text-[#E8EAED] tracking-tight">
          {value}
        </div>

        {/* Subtext & Trend */}
        {(subtext || trend) && (
          <div className="flex items-center space-x-2 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
            {trend && (
              <span
                className={`font-semibold flex items-center text-[11px] px-1.5 py-0.5 rounded ${
                  trend.isPositive
                    ? 'bg-[#E6F4EA] text-[#188038] dark:bg-emerald-950/40 dark:text-[#81C995]'
                    : 'bg-[#FCE8E6] text-[#D93025] dark:bg-rose-950/40 dark:text-[#F28B82]'
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtext && <span className="truncate">{subtext}</span>}
          </div>
        )}
      </div>

      {actionText && (
        <div className="mt-4 pt-3 border-t border-[#DADCE0]/60 dark:border-[#3C4043]/60 flex items-center justify-between text-xs font-medium text-[#1A73E8] dark:text-[#8AB4F8]">
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </Component>
  );
};
