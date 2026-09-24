import { useCallback, useSyncExternalStore } from "react";

const NAVIGATION_EVENT = "native:navigation";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATION_EVENT, onChange);
  };
}

function getLocationSnapshot(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function getServerSnapshot(): string {
  return "/";
}

function navigate(href: string, replace: boolean): void {
  const url = new URL(href, window.location.href);
  const nextLocation = `${url.pathname}${url.search}${url.hash}`;
  window.history[replace ? "replaceState" : "pushState"]({}, "", nextLocation);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getLocationSnapshot, getServerSnapshot)
    .split("?")[0];
}

export function useSearchParams(): URLSearchParams {
  const location = useSyncExternalStore(subscribe, getLocationSnapshot, getServerSnapshot);
  return new URLSearchParams(location.includes("?") ? location.slice(location.indexOf("?") + 1) : "");
}

export function useRouter() {
  return {
    back: useCallback(() => window.history.back(), []),
    push: useCallback((href: string) => navigate(href, false), []),
    replace: useCallback((href: string) => navigate(href, true), []),
    refresh: useCallback(() => window.location.reload(), []),
    prefetch: useCallback(async () => undefined, []),
  };
}
