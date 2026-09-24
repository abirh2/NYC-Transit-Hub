import { lazy } from "react";
import { usePathname } from "next/navigation";

const HomePage = lazy(() => import("@/app/page"));
const NearbyPage = lazy(() => import("@/app/nearby/page"));
const RealtimePage = lazy(() => import("@/app/realtime/page"));
const RoutesPage = lazy(() => import("@/app/routes/page"));
const BoardPage = lazy(() => import("@/app/board/page"));
const AccessibilityPage = lazy(() => import("@/app/accessibility/page"));
const ReliabilityPage = lazy(() => import("@/app/reliability/page"));
const IncidentsPage = lazy(() => import("@/app/incidents/page"));
const AboutPage = lazy(() => import("@/app/about/page"));
const OfflinePage = lazy(() => import("@/app/offline/page"));
const NativeCrowdingPage = lazy(() => import("./pages/NativeCrowdingPage"));

const ROUTES: Record<string, React.ComponentType> = {
  "/": HomePage,
  "/about": AboutPage,
  "/accessibility": AccessibilityPage,
  "/board": BoardPage,
  "/crowding": NativeCrowdingPage,
  "/incidents": IncidentsPage,
  "/nearby": NearbyPage,
  "/offline": OfflinePage,
  "/realtime": RealtimePage,
  "/reliability": ReliabilityPage,
  "/routes": RoutesPage,
};

export function NativeRoutes() {
  const pathname = usePathname();
  const Page = ROUTES[pathname] ?? HomePage;

  return <Page />;
}
