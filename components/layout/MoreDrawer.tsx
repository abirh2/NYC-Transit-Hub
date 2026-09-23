"use client";

/**
 * MoreDrawer
 *
 * Mobile "More" sheet opened from the `BottomNav` More slot. It exposes every
 * navigation destination that is NOT one of the five BottomNav slots
 * (Home `/`, Nearby `/nearby`, Map `/realtime`, Plan `/routes`, More), plus
 * authentication.
 *
 * Non-slot destinations exposed here:
 * - Station Board `/board`
 * - Reliability `/reliability`
 * - Accessibility `/accessibility`
 * - Crowding `/crowding`
 * - Incidents `/incidents`
 * - Commute `/commute`
 * - About `/about`
 *
 * Implemented with HeroUI's `Drawer` sheet, which natively traps focus while
 * open and restores focus to the trigger on close (Requirement 14.2). The
 * sheet-open animation is driven by framer-motion under HeroUI and respects
 * the root `MotionConfig reducedMotion="user"` set by the motion foundation,
 * so no custom motion (and therefore no `useMotionSafe` call) is needed here
 * (Requirement 10.2).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
} from "@heroui/react";
import {
  TrainFront,
  TrendingUp,
  Accessibility,
  Users,
  AlertTriangle,
  Clock,
  Info,
} from "lucide-react";
import { isRouteActive } from "@/lib/navigation/active-route";
import { AuthButton } from "@/components/auth";

interface MoreDrawerItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Destinations not covered by the five BottomNav slots. Kept in one array so
 * the "more drawer completeness" invariant (design Property 6) is easy to
 * verify against the slot mapping.
 */
const MORE_DESTINATIONS: MoreDrawerItem[] = [
  { href: "/board", label: "Station Board", icon: <TrainFront className="h-5 w-5" /> },
  { href: "/reliability", label: "Reliability", icon: <TrendingUp className="h-5 w-5" /> },
  { href: "/accessibility", label: "Accessibility", icon: <Accessibility className="h-5 w-5" /> },
  { href: "/crowding", label: "Crowding", icon: <Users className="h-5 w-5" /> },
  { href: "/incidents", label: "Service Changes", icon: <AlertTriangle className="h-5 w-5" /> },
  { href: "/commute", label: "Commute", icon: <Clock className="h-5 w-5" /> },
  { href: "/about", label: "About", icon: <Info className="h-5 w-5" /> },
];

export interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreDrawer({ isOpen, onClose }: MoreDrawerProps) {
  const pathname = usePathname();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom"
      // The BottomNav is only shown below `lg`, so the drawer is mobile-only too.
      className="lg:hidden"
    >
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1">
          <span
            className="text-foreground"
            style={{ font: "var(--text-section-title)" }}
          >
            More
          </span>
        </DrawerHeader>

        <DrawerBody className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <nav aria-label="More destinations">
            <ul className="flex flex-col gap-1">
              {MORE_DESTINATIONS.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`
                        flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition-colors
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-focus focus-visible:ring-inset
                        ${
                          active
                            ? "bg-surface-selected text-state-selected"
                            : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                        }
                      `}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-4">
            <span className="text-sm text-foreground/60">Account</span>
            <AuthButton />
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
