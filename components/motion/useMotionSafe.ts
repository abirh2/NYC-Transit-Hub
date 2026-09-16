"use client";

/**
 * Reduced-motion helper.
 *
 * Centralizes the `prefers-reduced-motion: reduce` decision so shared
 * primitives and the shell do not each call framer-motion's
 * `useReducedMotion()` independently. See the design's Motion Strategy.
 *
 * Rules:
 * - When reduced motion is active, non-essential animation collapses to
 *   instant or opacity-only. Movement (x/y/scale/rotate) is dropped.
 * - Essential feedback (focus ring, semantic state color) is NEVER gated on
 *   motion. Do not use these helpers to hide such feedback.
 */

import { useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";

export interface MotionSafeState {
  /**
   * `true` when `prefers-reduced-motion: reduce` is active (or not yet
   * resolved on the server / first paint, where framer-motion returns `null`).
   * Treating the unresolved case as "reduced" keeps the safest default.
   */
  reduced: boolean;
  /**
   * Convenience inverse of `reduced` for readability at call sites that
   * enable motion only when it is allowed.
   */
  animate: boolean;
  /**
   * A transition that collapses to instant when reduced motion is active,
   * otherwise returns the supplied transition (or framer-motion's default
   * when none is given). Use for non-essential entrance/movement.
   */
  transition: (transition?: Transition) => Transition | undefined;
  /**
   * Picks between a full (motion) value and a reduced (instant / opacity-only)
   * value. Use for variants, initial/animate props, etc.
   */
  pick: <T>(full: T, whenReduced: T) => T;
}

const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * Hook form. Reads framer-motion's reduced-motion preference once and returns
 * helpers primitives can use to make motion decisions consistently.
 */
export function useMotionSafe(): MotionSafeState {
  // `useReducedMotion` returns `boolean | null`; `null` before it resolves.
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced ?? false;

  return {
    reduced,
    animate: !reduced,
    transition: (transition) => (reduced ? INSTANT_TRANSITION : transition),
    pick: (full, whenReduced) => (reduced ? whenReduced : full),
  };
}
