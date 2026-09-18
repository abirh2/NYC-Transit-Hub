import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NearbyDepartureRow } from "@/components/nearby/NearbyDepartureRow";
import type { NearbyService } from "@/lib/transit/nearby";

const now = new Date("2026-09-17T12:00:00.000Z");

const service: NearbyService = {
  id: "subway:D15:D:southbound:Coney Island-Stillwell Av",
  mode: "subway",
  locationId: "subway:D15",
  locationName: "47-50 Sts-Rockefeller Ctr",
  distanceMiles: 0.12,
  sourceState: "ok",
  departure: {
    id: "dep-1",
    mode: "subway",
    tripId: "exact-trip-1",
    routeId: "D",
    stopId: "D15S",
    stationId: "D15",
    direction: "southbound",
    destination: "Coney Island-Stillwell Av",
    predictedArrival: new Date("2026-09-17T12:06:00.000Z"),
    predictedDeparture: null,
    delaySeconds: 0,
    status: "realtime",
    minutesAway: 6,
  },
  relatedDepartures: [],
};

describe("NearbyDepartureRow", () => {
  it("selects in place while exposing an exact, separate trip-detail link", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <NearbyDepartureRow
        service={service}
        now={now}
        selected={false}
        onSelect={onSelect}
      />,
    );

    const selectButton = screen.getByRole("button", {
      name: /select D train to Coney Island-Stillwell Av/i,
    });
    expect(selectButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Downtown / Brooklyn")).toBeVisible();
    expect(screen.getByText("Coney Island-Stillwell Av")).toBeVisible();
    expect(screen.getByText("47-50 Sts-Rockefeller Ctr")).toBeVisible();
    expect(screen.getByLabelText("6 minutes")).toBeVisible();

    await user.click(selectButton);
    expect(onSelect).toHaveBeenCalledWith(service);

    expect(screen.getByRole("link", { name: /view D train details/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/mode=subway.*route=D.*trip=exact-trip-1/),
    );
  });
});
