"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Radio,
  LayoutDashboard,
  TrendingUp,
  Accessibility,
  Clock,
  Users,
  AlertTriangle,
  TrainFront,
  Navigation,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Tooltip } from "@heroui/react";
import { isRouteActive } from "@/lib/navigation/active-route";
import { useMotionSafe } from "@/components/motion";

/**
 * Sidebar — desktop primary navigation (Requirement 2).
 *
 * A persistent, collapsible left column shown at `lg+` (hidden below `lg`,
 * where `BottomNav` + `MoreDrawer` take over). The flat 9-item list is
 * reorganized into two labeled groups (Requirement 2.1):
 *
 *   - Primary rider: Dashboard, Realtime, Station Board, Route Finder,
 *     Accessibility.
 *   - Exploration & intelligence: Reliability, Crowding, Incidents, Commute,
 *     About.
 *
 * Expanded renders icon + label; collapsed renders icons only, each with an
 * `aria-label` and a HeroUI tooltip (Requirement 2.2/14.3). The collapse
 * boolean persists to `localStorage` so it survives navigation, read in an
 * effect to stay SSR-safe (Requirement 2.3). Active state is driven by
 * `isRouteActive` against `usePathname()` and rendered with the
 * `--state-selected` token (Requirement 2.4). The collapse width transition is
 * gated through the reduced-motion helper (Requirement 10.2).
 *
 * The component self-manages its collapse state and takes no required props,
 * so `AppShell` can render `<Sidebar />` directly. The mobile overlay pattern
 * (previously `isOpen`/`onClose`) is removed — it is superseded by `BottomNav`.
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  /** Accessible label for the group's `<nav>` landmark and heading. */
  label: string;
  items: NavItem[];
}

const ICON_CLASS = "h-5 w-5 shrink-0";

const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Primary",
    items: [
      { href: "/", label: "Dashboard", icon: <LayoutDashboard className={ICON_CLASS} /> },
      { href: "/realtime", label: "Realtime", icon: <Radio className={ICON_CLASS} /> },
      { href: "/board", label: "Station Board", icon: <TrainFront className={ICON_CLASS} /> },
      { href: "/routes", label: "Plan", icon: <Navigation className={ICON_CLASS} /> },
      {
        href: "/accessibility",
        label: "Accessibility",
        icon: <Accessibility className={ICON_CLASS} />,
      },
    ],
  },
  {
    label: "Exploration & intelligence",
    items: [
      { href: "/reliability", label: "Reliability", icon: <TrendingUp className={ICON_CLASS} /> },
      { href: "/crowding", label: "Crowding", icon: <Users className={ICON_CLASS} /> },
      { href: "/incidents", label: "Service Changes", icon: <AlertTriangle className={ICON_CLASS} /> },
      { href: "/commute", label: "Commute", icon: <Clock className={ICON_CLASS} /> },
      { href: "/about", label: "About", icon: <Info className={ICON_CLASS} /> },
    ],
  },
] as const;

const STORAGE_KEY = "sidebar:collapsed";

const EXPANDED_WIDTH = "16rem"; // w-64
const COLLAPSED_WIDTH = "4.5rem";

/**
 * `useSyncExternalStore`-backed subscription to the persisted collapse flag.
 *
 * This is the idiomatic React way to read an external store (`localStorage`)
 * without a state-syncing effect: it is SSR-safe via `getServerSnapshot`
 * (always expanded on the server / first paint) and re-renders when other
 * tabs update the value through the `storage` event.
 */
function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function useCollapsedState(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeToStorage,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  const toggle = useCallback(() => {
    const next = !getCollapsedSnapshot();
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore storage failures (private mode, disabled storage).
    }
    // `storage` does not fire in the tab that made the change, so notify the
    // store's subscribers manually to trigger a re-render.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return [collapsed, toggle];
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}

function SidebarLink({ item, collapsed, active }: SidebarLinkProps) {
  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5
        text-sm font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-focus focus-visible:ring-inset
        ${collapsed ? "justify-center" : ""}
        ${
          active
            ? "bg-surface-selected text-state-selected"
            : "text-foreground/70 hover:bg-surface-hover hover:text-foreground"
        }
      `}
    >
      {item.icon}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.label} placement="right">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { transition } = useMotionSafe();
  const [collapsed, toggleCollapsed] = useCollapsedState();

  return (
    <motion.aside
      // Animate the collapse width; the helper collapses this to instant when
      // reduced motion is active. `initial={false}` skips the mount animation
      // so the persisted width does not animate in on first paint.
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      initial={false}
      transition={transition({ duration: 0.2 })}
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      className="hidden h-screen shrink-0 flex-col border-r border-border-subtle bg-surface-panel lg:sticky lg:top-0 lg:flex"
    >
      {/* Header: brand + collapse toggle */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <Link
          href="/"
          aria-label="NYC Transit home"
          className="flex items-center gap-2 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <TrainFront className="h-5 w-5 text-white" />
          </span>
          {!collapsed && (
            <span className="truncate text-lg font-semibold text-foreground">
              NYC Transit
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Grouped navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {NAV_GROUPS.map((group) => (
          <nav
            key={group.label}
            aria-label={group.label}
            className="mb-4 flex flex-col gap-1 last:mb-0"
          >
            {!collapsed && (
              <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                {group.label}
              </h2>
            )}
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isRouteActive(pathname, item.href)}
              />
            ))}
          </nav>
        ))}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 border-t border-border-subtle p-4">
          <p className="text-center text-xs text-foreground/50">
            Data from MTA GTFS feeds
          </p>
        </div>
      )}
    </motion.aside>
  );
}
