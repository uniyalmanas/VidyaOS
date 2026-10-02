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
      className={`bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-200 relative overflow-hidden group shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
        onClick
          ? 'hover:border-black/[0.16] dark:hover:border-white/[0.2] hover:shadow-md active:scale-[0.99] cursor-pointer'
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
        <div className="flex items-center justify-between text-xs text-[#86868B]">
          <span className="font-semibold font-apple-text uppercase tracking-wider text-[11px]">
            {label}
          </span>
          {icon ? (
            <div
              className="p-1.5 rounded-xl transition-transform duration-200 group-hover:scale-105"
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
        <div className="text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight tabular-nums">
          {value}
        </div>

        {/* Subtext & Trend */}
        {(subtext || trend) && (
          <div className="flex items-center space-x-2 text-xs text-[#86868B] font-apple-text">
            {trend && (
              <span
                className={`font-semibold flex items-center text-[11px] px-1.5 py-0.5 rounded-md ${
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
        <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs font-semibold text-[#0071E3] dark:text-[#2997FF] font-apple-text">
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </Component>
  );
};
