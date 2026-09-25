import { Browser } from "@capacitor/browser";
import type { BrowserPlugin } from "@capacitor/browser";

import { platformRuntime } from "./runtime";

type NativeBrowser = Pick<BrowserPlugin, "open">;

export async function openExternalUrl(
  value: string,
  plugin: NativeBrowser = Browser,
): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("External links must use http or https.");
  }

  if (platformRuntime.isNative) {
    try {
      await plugin.open({ url: url.toString(), presentationStyle: "popover" });
      return;
    } catch {
      // Fall through to the standard browser behavior when the plugin fails.
    }
  }
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

export function installNativeExternalLinkHandling(
  browserDocument: Document = document,
): () => void {
  if (!platformRuntime.isNative) return () => undefined;

  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;

    const url = new URL(anchor.href, window.location.href);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin === window.location.origin) {
      return;
    }

    event.preventDefault();
    void openExternalUrl(url.toString());
  };

  browserDocument.addEventListener("click", handleClick);
  return () => browserDocument.removeEventListener("click", handleClick);
}
