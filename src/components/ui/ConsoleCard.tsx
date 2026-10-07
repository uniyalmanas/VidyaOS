import React from 'react';
import { motion } from 'motion/react';

export interface ConsoleCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  noPadding?: boolean;
  /** Set false to skip the scroll-in entrance animation (e.g. for cards that toggle rapidly). */
  animated?: boolean;
}

export const ConsoleCard: React.FC<ConsoleCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  footer,
  className = '',
  bodyClassName = '',
  children,
  noPadding = false,
  animated = true
}) => {
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 12 } : false}
      whileInView={animated ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.34, ease: [0.25, 1, 0.5, 1] }}
      className={`bg-white/95 dark:bg-[#1C1C1E]/95 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.32)] overflow-hidden transition-[box-shadow,border-color] duration-200 ${className}`}
    >
      {(title || action) && (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-[var(--fb-accent-subtle)] border border-[var(--fb-accent-border)] flex items-center justify-center flex-shrink-0 text-[var(--fb-accent)] transition-transform duration-200 group-hover:scale-105">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-semibold font-apple-text tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-[#86868B] dark:text-[#86868B] mt-0.5 truncate font-apple-text">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? bodyClassName : `p-4 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-xs text-[#86868B] font-apple-text">
          {footer}
        </div>
      )}
    </motion.div>
  );
};
