import type { Transition, Variants } from "framer-motion";

export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
};

export const layoutSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1.2,
};

export const inputGlowVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  focused: {
    opacity: 1,
    scale: 1.02,
    transition: {
      duration: 0.8,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    },
  },
  hover: { opacity: 0.8, scale: 1.01, transition: { duration: 0.2 } },
  unfocused: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } },
};