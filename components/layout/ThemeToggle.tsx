"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

// Subscribe to nothing - just need this for the hook pattern
const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  // Use useSyncExternalStore to safely check if we're on the client
  // This avoids the hydration mismatch without using useEffect + setState
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = theme === "dark";

  // Show a placeholder during SSR
  if (!isClient) {
    return (
      <Button
        isIconOnly
        variant="light"
        aria-label="Toggle theme"
        className="text-foreground"
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      isIconOnly
      variant="light"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onPress={() => setTheme(isDark ? "light" : "dark")}
      className="text-foreground"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
