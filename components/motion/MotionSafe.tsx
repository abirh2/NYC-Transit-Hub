"use client";

/**
 * `MotionSafe` — render-prop wrapper around {@link useMotionSafe}.
 *
 * For primitives that are not themselves hooks-aware or that want to keep the
 * reduced-motion decision co-located with the animated markup. Prefer the
 * `useMotionSafe` hook in components that already run in a client scope.
 *
 * Essential feedback (focus ring, semantic state color) is never routed
 * through this wrapper.
 */

import type { ReactNode } from "react";
import { useMotionSafe, type MotionSafeState } from "./useMotionSafe";

export interface MotionSafeProps {
  children: (motion: MotionSafeState) => ReactNode;
}

export function MotionSafe({ children }: MotionSafeProps) {
  const motion = useMotionSafe();
  return <>{children(motion)}</>;
}
