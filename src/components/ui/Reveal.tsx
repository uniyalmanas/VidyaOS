import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { fadeUp, fadeIn, fadeUpLg, viewportOnce } from '../../lib/motion';

type RevealVariant = 'up' | 'up-lg' | 'fade' | 'scale';

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Which entrance motion to play when the element scrolls into view. */
  variant?: RevealVariant;
  /** Delay in seconds before the animation starts. */
  delay?: number;
  /** How much of the element must be visible before triggering. */
  amount?: number;
  /** Re-trigger on every scroll into view (default: play once). */
  repeat?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Render as a different element (e.g. 'section', 'li'). */
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'footer' | 'span';
}

/**
 * Scroll-reveal wrapper. Fades/slides children into view the first time
 * they enter the viewport. Respects prefers-reduced-motion automatically.
 *
 * @example
 * <Reveal variant="up" delay={0.1}>
 *   <h2>Hello</h2>
 * </Reveal>
 */
export const Reveal: React.FC<RevealProps> = ({
  variant = 'up',
  delay = 0,
  amount = 0.2,
  repeat = false,
  className = '',
  children,
  as = 'div',
  ...rest
}) => {
  const variants =
    variant === 'fade' ? fadeIn : variant === 'up-lg' ? fadeUpLg : variant === 'scale' ? { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } } : fadeUp;

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount }}
      transition={{ delay, ...(variants.visible as any)?.transition }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
};

/**
 * Staggered container: children animated with <Reveal variant="up"> (or any
 * motion element with `variants={fadeUp}`) will cascade in automatically.
 *
 * @example
 * <RevealGroup className="grid grid-cols-3">
 *   {[1,2,3].map(i => (
 *     <motion.div key={i} variants={fadeUp}>Card {i}</motion.div>
 *   ))}
 * </RevealGroup>
 */
export const RevealGroup: React.FC<{
  className?: string;
  children: React.ReactNode;
  delay?: number;
  stagger?: number;
  amount?: number;
}> = ({ className = '', children, delay = 0, stagger = 0.06, amount = 0.15 }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount }}
    transition={{ staggerChildren: stagger, delayChildren: delay }}
  >
    {children}
  </motion.div>
);

export { viewportOnce };
