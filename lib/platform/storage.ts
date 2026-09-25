import { Preferences } from "@capacitor/preferences";
import type { PreferencesPlugin } from "@capacitor/preferences";

import { platformRuntime } from "./runtime";

export interface StorageAdapter {
  get: (key: string) => Promise<string | null>;
  getSync?: (key: string) => string | null;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

const serverStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
} as unknown as Storage;

export function createWebStorageAdapter(
  browserStorage: Storage = typeof localStorage === "undefined" ? serverStorage : localStorage,
): StorageAdapter {
  return {
    get: async (key) => browserStorage.getItem(key),
    getSync: (key) => browserStorage.getItem(key),
    set: async (key, value) => browserStorage.setItem(key, value),
    remove: async (key) => browserStorage.removeItem(key),
  };
}

type NativePreferences = Pick<PreferencesPlugin, "get" | "set" | "remove">;

export function createNativeStorageAdapter(
  plugin: NativePreferences = Preferences,
  migrationSource: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): StorageAdapter {
  return {
    async get(key) {
      try {
        const stored = await plugin.get({ key });
        if (stored.value !== null || !migrationSource) return stored.value;
        const legacyValue = migrationSource.getItem(key);
        if (legacyValue !== null) await plugin.set({ key, value: legacyValue });
        return legacyValue;
      } catch {
        return migrationSource?.getItem(key) ?? null;
      }
    },
    async set(key, value) {
      try {
        await plugin.set({ key, value });
        migrationSource?.setItem(key, value);
      } catch {
        migrationSource?.setItem(key, value);
      }
    },
    async remove(key) {
      try {
        await plugin.remove({ key });
        migrationSource?.removeItem(key);
      } catch {
        migrationSource?.removeItem(key);
      }
    },
  };
}

let sharedPreferenceStorage: StorageAdapter | null = null;

export function getPreferenceStorage(): StorageAdapter {
  sharedPreferenceStorage ??= platformRuntime.isNative
    ? createNativeStorageAdapter()
    : createWebStorageAdapter();
  return sharedPreferenceStorage;
}
