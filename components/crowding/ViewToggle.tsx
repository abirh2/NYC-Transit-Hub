"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { List, Map } from "lucide-react";

interface ViewToggleProps {
  view: "list" | "diagram";
  onViewChange: (view: "list" | "diagram") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <ButtonGroup size="sm" variant="flat">
      <Button
        isIconOnly
        onPress={() => onViewChange("list")}
        color={view === "list" ? "primary" : "default"}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        isIconOnly
        onPress={() => onViewChange("diagram")}
        color={view === "diagram" ? "primary" : "default"}
        aria-label="Diagram view"
      >
        <Map className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  );
}

