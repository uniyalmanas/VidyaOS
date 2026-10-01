import React from 'react';

export interface ConsoleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const ConsoleInput = React.forwardRef<HTMLInputElement, ConsoleInputProps>(
  ({ label, helperText, error, icon, iconRight, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold font-google-sans text-[#3C4043] dark:text-[#C4C7C5]"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#5F6368] dark:text-[#9AA0A6] pointer-events-none flex-shrink-0">
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full text-xs font-medium text-[#202124] dark:text-[#E8EAED] bg-white dark:bg-[#1E1F20] border rounded-lg transition-all duration-150 py-2 ${
              icon ? 'pl-9' : 'pl-3'
            } ${iconRight ? 'pr-9' : 'pr-3'} ${
              error
                ? 'border-[#D93025] focus:ring-2 focus:ring-[#D93025]/30'
                : 'border-[#DADCE0] dark:border-[#3C4043] hover:border-[#BDC1C6] focus:border-[#FFA000] focus:ring-2 focus:ring-[#FFA000]/25'
            } focus:outline-none disabled:bg-[#F1F3F4] dark:disabled:bg-[#282A2C] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3 text-[#5F6368] dark:text-[#9AA0A6] flex-shrink-0">
              {iconRight}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] text-[#D93025] dark:text-[#F28B82] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

ConsoleInput.displayName = 'ConsoleInput';

export interface ConsoleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const ConsoleSelect = React.forwardRef<HTMLSelectElement, ConsoleSelectProps>(
  ({ label, helperText, error, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1 w-full text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold font-google-sans text-[#3C4043] dark:text-[#C4C7C5]"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <select
          id={selectId}
          ref={ref}
          className={`w-full text-xs font-medium text-[#202124] dark:text-[#E8EAED] bg-white dark:bg-[#1E1F20] border rounded-lg transition-all duration-150 py-2 px-3 ${
            error
              ? 'border-[#D93025] focus:ring-2 focus:ring-[#D93025]/30'
              : 'border-[#DADCE0] dark:border-[#3C4043] hover:border-[#BDC1C6] focus:border-[#FFA000] focus:ring-2 focus:ring-[#FFA000]/25'
          } focus:outline-none disabled:bg-[#F1F3F4] dark:disabled:bg-[#282A2C] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>

        {error ? (
          <p className="text-[11px] text-[#D93025] dark:text-[#F28B82] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

ConsoleSelect.displayName = 'ConsoleSelect';
