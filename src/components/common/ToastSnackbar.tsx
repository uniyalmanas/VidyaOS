import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toastIn, tapScale } from '../../lib/motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Per-type icon + brand accent color (matches --fb-* tokens in index.css). */
const TOAST_STYLE: Record<
  ToastType,
  { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; accent: string }
> = {
  success: { Icon: CheckCircle2, accent: 'var(--fb-status-success)' },
  error: { Icon: AlertCircle, accent: 'var(--fb-status-error)' },
  warning: { Icon: AlertTriangle, accent: 'var(--fb-accent)' },
  info: { Icon: Info, accent: 'var(--fb-primary)' }
};

export const ToastSnackbar: React.FC = () => {
  const { toast } = useApp();

  // Local dismissal keyed on the toast object itself: a newly created toast
  // is always a different object reference, so it re-appears automatically.
  const [dismissed, setDismissed] = useState<object | null>(null);

  // Release the reference once the toast clears so we never hold stale state.
  useEffect(() => {
    if (!toast) setDismissed(null);
  }, [toast]);

  const isDismissed = !!toast && dismissed === toast;
  const isVisible = !!toast && !isDismissed;
  const style = toast ? TOAST_STYLE[toast.type] : null;
  const Icon = style?.Icon;

  return (
    <AnimatePresence>
      {isVisible && style && Icon && (
        <motion.div
          key="toast-snackbar"
          variants={toastIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-24 md:bottom-6 left-6 right-6 sm:right-auto z-50 max-w-md"
          role="status"
          aria-live="polite"
        >
          <motion.div
            whileHover={{ y: -3, scale: 1.012 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative overflow-hidden bg-[#202124] dark:bg-[#E3E3E3] text-white dark:text-[#202124] pl-5 pr-3 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm border border-[#3C4043] dark:border-[#DADCE0]"
          >
            {/* Type-colored left accent bar */}
            <span
              aria-hidden="true"
              className="absolute left-0 inset-y-0 w-1.5"
              style={{ background: style.accent }}
            />

            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: style.accent }} />
            <span className="font-medium text-xs sm:text-sm flex-1">{toast!.message}</span>

            <motion.button
              onClick={() => setDismissed(toast!)}
              whileTap={tapScale.tap}
              className="p-1 -m-0.5 rounded-full text-white/60 dark:text-[#202124]/60 hover:text-white dark:hover:text-[#202124] hover:bg-white/10 dark:hover:bg-black/10 transition-[color,background-color] cursor-pointer flex-shrink-0 focus:outline-none"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
