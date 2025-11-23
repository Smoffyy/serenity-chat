import type { Transition, Variants } from "framer-motion";

export const getTransition = (enabled: boolean, speed: number): Transition => {
  if (!enabled) {
    return { duration: 0 };
  }

  const baseStiffness = 400;
  const baseDamping = 25;

  const effectiveSpeed = Math.max(0.5, Math.min(speed, 2));

  return {
    type: "spring",
    stiffness: baseStiffness * effectiveSpeed,
    damping: baseDamping / effectiveSpeed,
  };
};

export const layoutSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
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