import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StationAccessibilityStatus } from "@/components/accessibility/StationAccessibilityStatus";

describe("StationAccessibilityStatus", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows matching current outages and a station-filtered detail link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        equipment: [{
          equipmentId: "EL123",
          stationName: "47-50 Sts-Rockefeller Ctr",
          borough: "M",
          equipmentType: "ELEVATOR",
          serving: "street to mezzanine",
          adaCompliant: true,
          isActive: false,
          outageReason: "Repair",
          outageStartTime: "2026-09-22T12:00:00.000Z",
          estimatedReturn: null,
          trainLines: ["B", "D", "F", "M"],
        }],
        lastUpdated: "2026-09-22T12:05:00.000Z",
      },
    }), { status: 200 })));

    render(<StationAccessibilityStatus stationName="47-50 Sts-Rockefeller Ctr" />);

    expect(await screen.findByText("1 current elevator outage")).toBeVisible();
    expect(screen.getByText(/street to mezzanine/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "View accessibility details" }))
      .toHaveAttribute("href", "/accessibility?station=47-50+Sts-Rockefeller+Ctr");
  });

  it("does not claim normal operation when the outage feed is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<StationAccessibilityStatus stationName="Times Sq-42 St" />);

    expect(await screen.findByText("Accessibility status unavailable")).toBeVisible();
    expect(screen.queryByText(/operating normally/i)).not.toBeInTheDocument();
  });
});
