import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Fade + rise entrance. Honors prefers-reduced-motion (renders a plain div,
 *  no animation). `index` staggers siblings by 50ms each. */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1], delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}
