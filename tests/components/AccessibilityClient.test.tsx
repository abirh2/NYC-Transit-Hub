import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccessibilityClient } from "@/app/accessibility/AccessibilityClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/accessibility",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("station=14+St-Union+Sq"),
}));

vi.mock("@/lib/hooks/useStationPreferences", () => ({
  useStationPreferences: () => ({ favorites: [] }),
}));

const response = (success: boolean, equipment: unknown[] = [], error?: string) =>
  Promise.resolve(new Response(JSON.stringify({ success, data: success ? { equipment } : undefined, error }), {
    status: success ? 200 : 503,
  }));

describe("AccessibilityClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("hydrates station context and keeps the canonical step-free Plan action", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response(true)));
    render(<AccessibilityClient />);

    expect(screen.getByRole("textbox", { name: "Station" })).toHaveValue("14 St-Union Sq");
    expect(screen.getByRole("link", { name: /Plan a step-free trip/i })).toHaveAttribute("href", "/routes?accessible=true");
    expect(await screen.findByText("No current outages match these filters.")).toBeVisible();
  });

  it("does not present a failed feed as an all-clear", async () => {
    vi.stubGlobal("fetch", vi.fn(() => response(false, [], "MTA feed timed out")));
    render(<AccessibilityClient />);

    expect(await screen.findByText("Accessibility status is unavailable")).toBeVisible();
    expect(screen.queryByText(/operating normally/i)).not.toBeInTheDocument();
  });
});
