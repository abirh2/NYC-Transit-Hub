"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, MapPin, Radio, Navigation, Menu } from "lucide-react";
import { isRouteActive } from "@/lib/navigation/active-route";
import { useMotionSafe } from "@/components/motion";

/**
 * BottomNav — mobile primary navigation (Requirement 3).
 *
 * Renders exactly five slots with a fixed mapping:
 *   Home → "/", Nearby → "/nearby", Map → "/realtime", Plan → "/routes",
 *   More → opens the MoreDrawer (does not navigate).
 *
 * Rendered as a `<nav>` landmark with a distinct `aria-label`. Fixed to the
 * bottom of the viewport and hidden at `lg+` (the desktop Sidebar takes over).
 * Active state is driven by `isRouteActive` against `usePathname()`. Each slot
 * is a ≥44×44px target. The active indicator's motion is gated through the
 * reduced-motion helper.
 *
 * `MoreDrawer` is NOT rendered here: the parent `AppShell` owns the drawer's
 * open state and passes `onMoreClick` to toggle it.
 */

interface BottomNavLink {
  type: "link";
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavAction {
  type: "action";
  label: string;
  icon: React.ReactNode;
}

type BottomNavSlot = BottomNavLink | BottomNavAction;

const ICON_CLASS = "h-5 w-5 shrink-0";

const NAV_SLOTS: readonly BottomNavSlot[] = [
  { type: "link", href: "/", label: "Home", icon: <Home className={ICON_CLASS} /> },
  {
    type: "link",
    href: "/nearby",
    label: "Nearby",
    icon: <MapPin className={ICON_CLASS} />,
  },
  {
    type: "link",
    href: "/realtime",
    label: "Map",
    icon: <Radio className={ICON_CLASS} />,
  },
  {
    type: "link",
    href: "/routes",
    label: "Plan",
    icon: <Navigation className={ICON_CLASS} />,
  },
  { type: "action", label: "More", icon: <Menu className={ICON_CLASS} /> },
] as const;

export interface BottomNavProps {
  /** Called when the "More" slot is activated so the parent can open MoreDrawer. */
  onMoreClick: () => void;
}

const SLOT_CLASS =
  "relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center " +
  "justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-focus focus-visible:ring-inset";

function ActiveIndicator({ animate }: { animate: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={animate ? "bottom-nav-active" : undefined}
      className="pointer-events-none absolute inset-x-3 top-0 h-0.5 rounded-pill bg-state-selected"
    />
  );
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname();
  const { animate } = useMotionSafe();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border-subtle bg-surface-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_SLOTS.map((slot) => {
        if (slot.type === "action") {
          return (
            <button
              key={slot.label}
              type="button"
              onClick={onMoreClick}
              aria-label={slot.label}
              className={`${SLOT_CLASS} text-foreground/60 hover:text-foreground`}
            >
              {slot.icon}
              <span>{slot.label}</span>
            </button>
          );
        }

        const active = isRouteActive(pathname, slot.href);

        return (
          <Link
            key={slot.href}
            href={slot.href}
            aria-label={slot.label}
            aria-current={active ? "page" : undefined}
            className={`${SLOT_CLASS} ${
              active
                ? "text-state-selected"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {active && <ActiveIndicator animate={animate} />}
            {slot.icon}
            <span>{slot.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
