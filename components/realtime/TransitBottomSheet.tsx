"use client";

/**
 * TransitBottomSheet
 *
 * Shared mobile detail surface for the Realtime page. Built on HeroUI's
 * `Drawer`, following the pattern already proven by `MoreDrawer`: the drawer
 * natively traps focus while open and restores it to the trigger on close, and
 * its transition runs under the root `MotionConfig reducedMotion="user"`, so
 * reduced-motion is respected without custom motion code here.
 *
 * Replaces the hand-rolled `Modal placement="bottom"` blocks that
 * `LineDiagram` and `RailDiagram` each duplicated.
 */

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/react";

export interface TransitBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the sheet. Rendered visibly when `showTitle`. */
  title: string;
  /** Detail content usually carries its own heading, so the title is hidden. */
  showTitle?: boolean;
  children: React.ReactNode;
}

export function TransitBottomSheet({
  isOpen,
  onClose,
  title,
  showTitle = false,
  children,
}: TransitBottomSheetProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom"
      size="sm"
      aria-label={title}
      classNames={{
        // Cap the height so the map stays visible behind the sheet, which is
        // what keeps the interaction feeling map-first rather than modal.
        base: "max-h-[75dvh] rounded-t-lg",
      }}
    >
      <DrawerContent>
        {showTitle ? (
          <DrawerHeader className="flex flex-col gap-1">
            <span
              className="text-foreground"
              style={{ font: "var(--text-section-title)" }}
            >
              {title}
            </span>
          </DrawerHeader>
        ) : (
          <DrawerHeader className="sr-only">{title}</DrawerHeader>
        )}

        {/* Bottom padding clears the home indicator in standalone PWA mode. */}
        <DrawerBody className="px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0">
          {children}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
