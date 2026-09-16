/**
 * Active-route detection
 *
 * Pure, framework-free helper mapping a current pathname and a navigation
 * destination href to an active/selected state. Shared by the app shell's
 * `Sidebar` and `BottomNav` (both drive active state via `usePathname()`).
 *
 * Matching rules:
 * - The root "/" matches only on an exact pathname equality (it is the prefix
 *   of every route, so a prefix match would mark it active everywhere).
 * - Every other href matches when the pathname equals it OR is nested under it
 *   (`pathname === href || pathname.startsWith(href + "/")`), so sub-routes
 *   highlight their parent destination.
 */

/**
 * Determine whether a navigation destination is active for the current pathname.
 *
 * @param pathname - The current route pathname (e.g. from `usePathname()`)
 * @param href - The navigation destination href to test
 * @returns `true` if the destination should render as active/selected
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(href + "/");
}
