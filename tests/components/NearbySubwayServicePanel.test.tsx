import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NearbySubwayServicePanel } from "@/components/nearby/NearbySubwayServicePanel";
import type { Departure } from "@/types/transit";

const now = new Date("2026-09-18T12:00:00.000Z");
function departure({ id, tripId, routeId, direction, destination, minutes }: { id: string; tripId: string; routeId: string; direction: Departure["direction"]; destination: string; minutes: number; }): Departure {
  const predictedArrival = new Date(now.getTime() + minutes * 60_000);
  return { id, mode: "subway", tripId, routeId, stopId: direction === "southbound" ? "D15S" : "D15N", stationId: "D15", direction, destination, predictedArrival, predictedDeparture: predictedArrival, delaySeconds: 0, status: "realtime", minutesAway: minutes };
}
const departures = [
  departure({ id: "d-south-1", tripId: "d-south-1", routeId: "D", direction: "southbound", destination: "Coney Island-Stillwell Av", minutes: 6 }),
  departure({ id: "d-north-1", tripId: "d-north-1", routeId: "D", direction: "northbound", destination: "Norwood-205 St", minutes: 7 }),
  departure({ id: "f-south-1", tripId: "f-south-1", routeId: "F", direction: "southbound", destination: "Coney Island-Stillwell Av", minutes: 4 }),
  departure({ id: "f-south-2", tripId: "f-south-2", routeId: "F", direction: "southbound", destination: "Jamaica-179 St", minutes: 18 }),
  departure({ id: "b-north-1", tripId: "b-north-1", routeId: "B", direction: "northbound", destination: "Bedford Park Blvd", minutes: 3 }),
];

describe("NearbySubwayServicePanel", () => {
  it("renders one independent card per route", () => {
    render(<NearbySubwayServicePanel stationName="47-50 Sts-Rockefeller Ctr" departures={departures} now={now} selectedTripId={null} onSelectDeparture={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "47-50 Sts-Rockefeller Ctr" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "D train departures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "F train departures" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "B train departures" })).toBeInTheDocument();
    expect(screen.getAllByRole("tablist")).toHaveLength(3);
    expect(screen.queryByText("d-south-1")).not.toBeInTheDocument();
  });

  it("keeps swiping and keyboard direction switching inside each route card", async () => {
    const user = userEvent.setup();
    render(<NearbySubwayServicePanel stationName="47-50 Sts-Rockefeller Ctr" departures={departures} now={now} selectedTripId={null} onSelectDeparture={vi.fn()} />);
    const dCard = screen.getByRole("heading", { name: "D train departures" }).closest("article");
    expect(dCard).not.toBeNull();
    const downtown = within(dCard!).getByRole("tab", { name: "D Downtown / Brooklyn" });
    downtown.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(dCard!).getByRole("tab", { name: "D Uptown / Bronx" })).toHaveFocus();
    expect(within(dCard!).getByRole("button", { name: /Select D train to Norwood-205 St/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Select F train to Coney Island-Stillwell Av/i })).toBeVisible();
  });

  it("expands only the selected route direction and preserves exact links", async () => {
    const user = userEvent.setup();
    render(<NearbySubwayServicePanel stationName="47-50 Sts-Rockefeller Ctr" departures={departures} now={now} selectedTripId="f-south-1" onSelectDeparture={vi.fn()} />);
    const fCard = screen.getByRole("heading", { name: "F train departures" }).closest("article");
    expect(fCard).not.toBeNull();
    expect(within(fCard!).queryByRole("link", { name: /F train in 18 minutes/i })).not.toBeInTheDocument();
    await user.click(within(fCard!).getByRole("button", { name: /Select F train to Coney Island-Stillwell Av/i }));
    expect(within(fCard!).getByRole("link", { name: /F train in 18 minutes to Jamaica-179 St/i })).toHaveAttribute("href", expect.stringMatching(/trip=f-south-2/));
    expect(within(fCard!).getByRole("link", { name: "View F train details" })).toHaveAttribute("href", expect.stringMatching(/trip=f-south-1/));
    expect(screen.getByRole("heading", { name: "D train departures" }).closest("article")).not.toContainHTML("f-south-2");
  });

  it("selects the exact hero departure without exposing implementation IDs", async () => {
    const user = userEvent.setup();
    const onSelectDeparture = vi.fn();
    render(<NearbySubwayServicePanel stationName="47-50 Sts-Rockefeller Ctr" departures={departures} now={now} selectedTripId={null} onSelectDeparture={onSelectDeparture} />);
    const hero = screen.getByRole("button", { name: "Select D train to Coney Island-Stillwell Av, 6 minutes" });
    expect(within(hero).getByText("6")).toBeVisible();
    await user.click(hero);
    expect(onSelectDeparture).toHaveBeenCalledWith(departures[0]);
  });
});
