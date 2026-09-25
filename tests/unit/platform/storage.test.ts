import { describe, expect, it } from "vitest";

import { createWebStorageAdapter } from "@/lib/platform/storage";

describe("web storage adapter", () => {
  it("preserves browser localStorage behavior", async () => {
    const values = new Map<string, string>();
    const storage = createWebStorageAdapter({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    } as Storage);

    await storage.set("favorite", "A12");
    await expect(storage.get("favorite")).resolves.toBe("A12");
    await storage.remove("favorite");
    await expect(storage.get("favorite")).resolves.toBeNull();
  });
});
