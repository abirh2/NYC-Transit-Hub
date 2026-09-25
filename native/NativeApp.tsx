import { Suspense } from "react";
import { HeroUIProvider, Spinner } from "@heroui/react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout";
import { NativeRoutes } from "./NativeRoutes";
import { NativePlatformEffects } from "./NativePlatformEffects";

export function NativeApp() {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="nyc-transit-theme"
      disableTransitionOnChange
    >
      <HeroUIProvider navigate={router.push}>
        <MotionConfig reducedMotion="user">
          <AppShell>
            <Suspense
              fallback={(
                <div className="flex min-h-[50dvh] items-center justify-center">
                  <Spinner label="Loading NYC Transit Hub" />
                </div>
              )}
            >
              <NativePlatformEffects />
              <NativeRoutes />
            </Suspense>
          </AppShell>
        </MotionConfig>
      </HeroUIProvider>
    </ThemeProvider>
  );
}
