import React, { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring, animate } from 'motion/react';

export interface CountUpProps {
  /** Final numeric value to animate to. */
  value: number;
  /** Number of decimal places to display. */
  decimals?: number;
  /** Prefix, e.g. '₹' or '$'. */
  prefix?: string;
  /** Suffix, e.g. '+' or '%'. */
  suffix?: string;
  /** Duration in seconds. */
  duration?: number;
  /** Start counting only when scrolled into view (default true). */
  startInView?: boolean;
  className?: string;
  /** Separator style for thousands (default: Indian grouping when prefix is ₹). */
  indianNumbering?: boolean;
}

const formatNumber = (n: number, decimals: number, indian: boolean): string => {
  if (decimals > 0) return n.toFixed(decimals);
  const rounded = Math.round(n);
  if (indian) {
    return rounded.toLocaleString('en-IN');
  }
  return rounded.toLocaleString('en-US');
};

/**
 * Animated numeric counter that counts up from 0 when it scrolls into view.
 * Used for KPI values (hero stats, MetricCards, dashboards).
 *
 * @example
 * <CountUp value={450} suffix="+" prefix="" />
 * <CountUp value={4.8} decimals={1} prefix="₹" suffix=" Cr" />
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.6,
  startInView = true,
  className = '',
  indianNumbering,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState('0');
  const useIndian = indianNumbering ?? prefix.includes('₹');
  const hasStarted = useRef(false);
  const current = useRef(0);

  // Count 0 → value on first view, then smoothly retarget whenever `value`
  // changes (live KPI updates) by animating from the last displayed number.
  useEffect(() => {
    if (startInView && !inView) return;

    const isFirst = !hasStarted.current;
    const from = isFirst ? 0 : current.current;
    hasStarted.current = true;

    const controls = animate(from, value, {
      duration: isFirst ? duration : Math.min(duration, 0.9),
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (latest) => {
        current.current = latest;
        setDisplay(formatNumber(latest, decimals, useIndian));
      },
      onComplete: () => {
        current.current = value;
        setDisplay(formatNumber(value, decimals, useIndian));
      },
    });

    return () => controls.stop();
  }, [inView, value, duration, decimals, useIndian, startInView]);

  return (
    <span ref={ref} className={`count-up ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

/**
 * Pulsing status dot used for "live" indicators.
 */
export const LiveDot: React.FC<{ className?: string; color?: string }> = ({
  className = '',
  color = 'var(--fb-primary)',
}) => (
  <span className={`relative flex h-2 w-2 ${className}`}>
    <span
      className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
      style={{ backgroundColor: color }}
    />
    <span
      className="relative inline-flex h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  </span>
);

export { useMotionValue, useSpring };
