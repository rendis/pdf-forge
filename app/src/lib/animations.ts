import type { Variants, Transition } from 'framer-motion';

/**
 * Common animation variants for reuse across components
 */

// Fade with vertical slide
export const fadeSlideDown: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

// Fade with height collapse
export const fadeHeight: Variants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: 'auto', marginBottom: 8 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
};

// Simple fade
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale with fade (for icons, checks)
export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

// Common transition configs
export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

export const smoothTransition: Transition = {
  duration: 0.2,
  ease: 'easeInOut',
};

// Stagger children helper
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

// Dialog animations
export const dialogBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dialogContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
};

// Slide left with fade (for list rows exit animation)
export const slideLeftFade: Variants = {
  initial: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Stagger container for table rows (exit animation)
export const rowStaggerContainer: Variants = {
  initial: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05, // 50ms between each row
      staggerDirection: -1, // Animate from top to bottom
    },
  },
};
