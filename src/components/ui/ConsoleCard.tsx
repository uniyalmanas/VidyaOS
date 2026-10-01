import React from 'react';

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
  noPadding = false
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-200 ${className}`}
    >
      {(title || action) && (
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center flex-shrink-0 text-[#FFA000] dark:text-[#FFCA28]">
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

      <div className={noPadding ? bodyClassName : `p-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 sm:px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-xs text-[#86868B] font-apple-text">
          {footer}
        </div>
      )}
    </div>
  );
};
