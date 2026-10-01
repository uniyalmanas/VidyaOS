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
      className={`bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl overflow-hidden transition-colors ${className}`}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between gap-3 bg-white dark:bg-[#1E1F20]">
          <div className="flex items-center space-x-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-center flex-shrink-0 text-[#FFA000] dark:text-[#FFCA28]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-bold font-google-sans text-[#202124] dark:text-[#E8EAED] truncate">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? bodyClassName : `p-5 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3 border-t border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-xs text-[#5F6368] dark:text-[#9AA0A6]">
          {footer}
        </div>
      )}
    </div>
  );
};
