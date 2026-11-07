"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

export const spring = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const;
export const softSpring = { type: "spring", stiffness: 140, damping: 22 } as const;

/** Fade-and-rise when scrolled into view. */
export function Reveal({ children, delay = 0, y = 18, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...softSpring, delay }}
    >
      {children}
    </motion.div>
  );
}

export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
export const item: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};
