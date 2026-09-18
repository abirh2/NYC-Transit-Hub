import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LineDiagram } from "@/components/realtime/LineDiagram";
import type { Departure, SubwayTrip, TransitRoute } from "@/types/transit";

const route: TransitRoute = {
  id: "A",
  displayName: "A",
  longName: "8 Avenue Express",
  mode: "subway",
  color: "#0039A6",
  textColor: "#FFFFFF",
  agencyId: "MTA NYCT",
};

function trip(id: string, direction: SubwayTrip["direction"], stopId: string): SubwayTrip {
  return {
    id,
    mode: "subway",
    route,
    direction,
    destination: direction === "northbound" ? "Inwood-207 St" : "Far Rockaway",
    startDate: "20260916",
    startTime: "12:00:00",
    scheduleRelationship: "scheduled",
    stopTimeUpdates: [{
      stopId,
      stationId: stopId.replace(/[NS]$/, ""),
      sequence: 1,
      arrivalTime: new Date("2026-09-16T16:05:00Z"),
      departureTime: null,
      delaySeconds: 0,
      scheduleRelationship: "scheduled",
    }],
    progress: { state: "at-stop", source: "vehicle", stopId, timestamp: new Date("2026-09-16T16:04:00Z") },
    vehicleId: id,
    updatedAt: new Date("2026-09-16T16:04:00Z"),
    isAssigned: true,
  };
}

const trips = [trip("trip-1", "northbound", "A15N"), trip("trip-2", "southbound", "A14S")];
const departures: Departure[] = trips.map((item, index) => ({
  id: `${item.id}:departure`,
  mode: "subway",
  tripId: item.id,
  routeId: "A",
  stopId: item.stopTimeUpdates[0].stopId,
  stationId: item.stopTimeUpdates[0].stationId,
  direction: item.direction,
  destination: item.destination,
  predictedArrival: new Date("2026-09-16T16:05:00Z"),
  predictedDeparture: null,
  delaySeconds: 0,
  status: "realtime",
  minutesAway: index + 2,
}));

describe("LineDiagram", () => {
  it("shows empty, loading, error, and no-trip states", () => {
    const { rerender } = render(<LineDiagram selectedLine={null} trips={[]} departures={[]} />);
    expect(screen.getByText(/Choose a subway route/)).toBeInTheDocument();

    rerender(<LineDiagram selectedLine="A" trips={[]} departures={[]} isLoading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    rerender(<LineDiagram selectedLine="A" trips={[]} departures={[]} error="Feed failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Feed failed");

    rerender(<LineDiagram selectedLine="A" trips={[]} departures={[]} />);
    expect(screen.getByText(/No A trains reporting/)).toBeInTheDocument();
  });

  it("renders individual trips in direction lanes and selects by trip ID", () => {
    const onSelectTrip = vi.fn();
    render(
      <LineDiagram
        selectedLine="A"
        trips={trips}
        departures={departures}
        selectedTripId="trip-1"
        onSelectTrip={onSelectTrip}
      />,
    );

    expect(screen.getByText("North / westbound")).toBeInTheDocument();
    expect(screen.getByText("South / eastbound")).toBeInTheDocument();
    expect(screen.getByText("2 active trains")).toBeInTheDocument();

    const southbound = screen.getByRole("button", { name: /Far Rockaway/ });
    fireEvent.click(southbound);
    expect(onSelectTrip).toHaveBeenCalledWith("trip-2");
    expect(screen.getByRole("button", { name: /Inwood-207 St/ })).toHaveAttribute("aria-pressed", "true");
  });
});
