"use client";

import { HeroUIProvider } from "@heroui/react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/components/auth";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme={undefined}
      enableSystem={false}
      storageKey="nyc-transit-theme"
      disableTransitionOnChange
    >
      <HeroUIProvider navigate={router.push}>
        {/*
          MotionConfig sits at the root of the client tree so framer-motion's
          reduced-motion preference is read once and shared. `reducedMotion="user"`
          honors `prefers-reduced-motion: reduce`; primitives read the preference
          through the `useMotionSafe` helper rather than re-checking individually.
        */}
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            {children}
          </AuthProvider>
        </MotionConfig>
      </HeroUIProvider>
    </NextThemesProvider>
  );
}
