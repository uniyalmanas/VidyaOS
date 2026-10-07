import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { CountUp } from './CountUp';

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

/**
 * Splits a display value like "₹4.8 Cr", "1,240" or "99.8%" into
 * prefix / numeric / suffix so the number can animate on mount.
 * Returns null when the value isn't animatable (e.g. "On track").
 */
function parseCountable(value: string | number): {
  prefix: string;
  amount: number;
  suffix: string;
  decimals: number;
} | null {
  if (typeof value === 'number') {
    return { prefix: '', amount: value, suffix: '', decimals: Number.isInteger(value) ? 0 : 1 };
  }
  const match = value.match(/^([^0-9-]*)(-?[\d][\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, rawNumber, suffix] = match;
  const numeric = parseFloat(rawNumber.replace(/,/g, ''));
  if (!isFinite(numeric)) return null;
  const decimals = rawNumber.includes('.') ? rawNumber.split('.')[1].length : 0;
  return { prefix, amount: numeric, suffix, decimals };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  badge,
  onClick,
  accentColor = '#4F46E5',
  actionText,
  className = ''
}) => {
  const Component: React.ElementType = onClick ? 'button' : 'div';
  const countable = parseCountable(value);

  return (
    <Component
      onClick={onClick}
      className={`group bg-white/95 dark:bg-[#1C1C1E]/95 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-4.5 lg:p-5 flex flex-col justify-between text-left relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover-lift ${
        onClick
          ? 'hover:border-[var(--fb-primary-border)] hover:shadow-[0_8px_24px_-6px_rgba(79,70,229,0.25)] cursor-pointer'
          : 'transition-[border-color,box-shadow] duration-200'
      } ${className}`}
    >
      {/* Subtle Top Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-150"
        style={{ backgroundColor: accentColor }}
      />

      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#86868B]">
          <span className="font-semibold font-apple-text uppercase tracking-[0.12em] text-[9px] sm:text-[10px] leading-none truncate">
            {label}
          </span>
          {icon ? (
            <div
              className="p-1.5 rounded-xl transition-transform duration-200 group-hover:scale-105 shrink-0"
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
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.05em] tabular-nums leading-none">
          {countable ? (
            <CountUp
              value={countable.amount}
              decimals={countable.decimals}
              prefix={countable.prefix}
              suffix={countable.suffix}
              duration={1.1}
            />
          ) : (
            value
          )}
        </div>

        {/* Subtext & Trend */}
        {(subtext || trend) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-[#86868B] font-apple-text">
            {trend && (
              <span
                className={`font-semibold flex items-center px-1.5 py-0.5 rounded-md ${
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
