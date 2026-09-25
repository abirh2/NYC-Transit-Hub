import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import type { PluginListenerHandle } from "@capacitor/core";

interface NativeKeyboard {
  addListener(
    eventName: "keyboardWillShow" | "keyboardWillHide",
    listener: () => void,
  ): Promise<PluginListenerHandle>;
  setStyle(options: { style: KeyboardStyle }): Promise<void>;
}

export interface KeyboardAdapter {
  subscribe(onVisibilityChange: (visible: boolean) => void): () => void;
  syncTheme(theme: string | undefined): Promise<void>;
}

export function getNativeKeyboardStyle(theme: string | undefined): KeyboardStyle {
  if (theme === "light") return KeyboardStyle.Light;
  if (theme === "dark") return KeyboardStyle.Dark;
  return KeyboardStyle.Default;
}

export function createNativeKeyboardAdapter(
  plugin: NativeKeyboard = Keyboard,
): KeyboardAdapter {
  return {
    subscribe(onVisibilityChange) {
      const handles: PluginListenerHandle[] = [];
      let disposed = false;

      void Promise.all([
        plugin.addListener("keyboardWillShow", () => onVisibilityChange(true)),
        plugin.addListener("keyboardWillHide", () => onVisibilityChange(false)),
      ]).then((nextHandles) => {
        if (disposed) {
          nextHandles.forEach((handle) => { void handle.remove(); });
        } else {
          handles.push(...nextHandles);
        }
      }).catch(() => undefined);

      return () => {
        disposed = true;
        handles.forEach((handle) => { void handle.remove(); });
      };
    },

    async syncTheme(theme) {
      try {
        await plugin.setStyle({ style: getNativeKeyboardStyle(theme) });
      } catch {
        // Keyboard theming is optional; form input must remain usable without it.
      }
    },
  };
}

export const nativeKeyboard = createNativeKeyboardAdapter();
