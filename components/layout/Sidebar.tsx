"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  LayoutDashboard,
  TrendingUp,
  Accessibility,
  Clock,
  Users,
  AlertTriangle,
  X,
  TrainFront,
  Navigation,
  Info,
} from "lucide-react";
import { Button } from "@heroui/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: "/realtime",
    label: "Realtime",
    icon: <Radio className="h-5 w-5" />,
  },
  {
    href: "/board",
    label: "Station Board",
    icon: <TrainFront className="h-5 w-5" />,
  },
  {
    href: "/routes",
    label: "Route Finder",
    icon: <Navigation className="h-5 w-5" />,
  },
  {
    href: "/reliability",
    label: "Reliability",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    href: "/accessibility",
    label: "Accessibility",
    icon: <Accessibility className="h-5 w-5" />,
  },
  {
    href: "/commute",
    label: "Commute",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    href: "/crowding",
    label: "Crowding",
    icon: <Users className="h-5 w-5" />,
  },
  {
    href: "/incidents",
    label: "Incidents",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-64 
          flex flex-col
          bg-content1 border-r border-divider
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-divider">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrainFront className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              NYC Transit
            </span>
          </Link>
          <Button
            isIconOnly
            variant="light"
            className="lg:hidden"
            onPress={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - grows to fill available space */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5
                    text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:bg-default-100 hover:text-foreground"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - stays at bottom */}
        <div className="shrink-0 p-4 border-t border-divider space-y-3">
          <Link
            href="/about"
            onClick={onClose}
            className={`
              flex items-center justify-center gap-2 rounded-lg px-3 py-2
              text-sm font-medium transition-colors
              ${
                pathname === "/about"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-default-100 hover:text-foreground"
              }
            `}
          >
            <Info className="h-4 w-4" />
            About
          </Link>
          <p className="text-xs text-foreground/50 text-center">
            Data from MTA GTFS feeds
          </p>
        </div>
      </aside>
    </>
  );
}
