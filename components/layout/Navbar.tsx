"use client";

import { Button } from "@heroui/react";
import { Menu, TrainFront } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { AuthButton } from "@/components/auth";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-divider bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            isIconOnly
            variant="light"
            className="lg:hidden"
            onPress={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - visible on mobile when sidebar is hidden */}
          <Link
            href="/"
            className="flex items-center gap-2 lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrainFront className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              NYC Transit
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

