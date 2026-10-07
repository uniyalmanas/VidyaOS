import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  onBack
}) => {
  // Auto-detect back handler if not explicitly provided but parent breadcrumb has an onClick
  const effectiveBack = onBack || (breadcrumbs && breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2]?.onClick : undefined);

  return (
    <div className={`space-y-2 pb-4 sm:pb-5 border-b border-black/[0.08] dark:border-white/[0.08] ${className}`}>
      {/* Breadcrumb Path */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#86868B] font-apple-text overflow-x-auto no-scrollbar whitespace-nowrap min-w-0">
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#86868B]/60" />}
                {item.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-[#0071E3] dark:text-[#2997FF] hover:underline font-medium transition cursor-pointer inline-flex items-center gap-1 focus:outline-none"
                    title={`Back to ${item.label}`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className={isLast ? "font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]" : "text-[#86868B]"}>
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title Row & Actions */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            {effectiveBack && (
              <button
                type="button"
                onClick={effectiveBack}
                className="p-1.5 -ml-1 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] dark:text-[#86868B] dark:hover:text-white dark:hover:bg-white/[0.08] transition cursor-pointer flex-shrink-0 focus:outline-none"
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}
            <h1 className="text-lg sm:text-2xl font-semibold font-apple-display tracking-[-0.04em] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-sm text-[#86868B] font-apple-text leading-relaxed break-words">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center flex-wrap gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {children && <div className="pt-2">{children}</div>}
    </div>
  );
};
