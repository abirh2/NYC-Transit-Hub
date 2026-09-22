import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeSections } from "@/components/dashboard/HomeSections";
import type { HomeCommuteSummary, SavedStationSnapshot } from "@/components/dashboard/home-types";
import type { NearbyService } from "@/lib/transit/nearby";
import type { ServiceAlert, ServiceStatus } from "@/types/transit";

vi.mock("@/components/dashboard/ReliabilityCard", () => ({
  ReliabilityCard: () => <div>Reliability metric preview</div>,
}));
vi.mock("@/components/dashboard/IncidentsCard", () => ({
  IncidentsCard: () => <div>Incident metric preview</div>,
}));
vi.mock("@/components/dashboard/CrowdingCard", () => ({
  CrowdingCard: () => <div>Crowding metric preview</div>,
}));

const now = new Date("2026-09-22T12:00:00.000Z");
const nearbyService: NearbyService = {
  id: "subway:D15:D:southbound",
  mode: "subway",
  locationId: "subway:D15",
  locationName: "47-50 Sts-Rockefeller Ctr",
  distanceMiles: 0.12,
  sourceState: "ok",
  departure: {
    id: "departure-1",
    mode: "subway",
    tripId: "trip-1",
    routeId: "D",
    stopId: "D15S",
    stationId: "D15",
    direction: "southbound",
    destination: "Coney Island-Stillwell Av",
    predictedArrival: new Date("2026-09-22T12:04:00.000Z"),
    predictedDeparture: null,
    delaySeconds: 0,
    status: "realtime",
    minutesAway: 4,
  },
  relatedDepartures: [],
};

const savedStation: SavedStationSnapshot = {
  stationId: "D15",
  stationName: "47-50 Sts-Rockefeller Ctr",
  services: [nearbyService],
  routeIds: ["D", "F"],
  stopIds: ["D15N", "D15S"],
  sourceState: "ok",
  error: null,
};

const configuredCommute: HomeCommuteSummary = {
  isAuthenticated: true,
  isConfigured: true,
  leaveIn: "12 min",
  arriveBy: "8:45 AM",
  duration: 31,
  route: "D → F",
  status: "on_time",
  delayMinutes: 0,
  isPastWindow: false,
  error: null,
};

const relevantAlert: ServiceAlert = {
  id: "alert-1",
  affectedRoutes: ["D"],
  affectedStops: ["D15S"],
  headerText: "[D] trains are delayed near 36 St",
  descriptionText: null,
  severity: "WARNING",
  alertType: "DELAY",
  activePeriodStart: null,
  activePeriodEnd: null,
};

const statuses: ServiceStatus[] = [{
  routeId: "D",
  status: "delays",
  updatedAt: now,
  alertIds: ["alert-1"],
}];

function renderHome(overrides: Partial<React.ComponentProps<typeof HomeSections>> = {}) {
  return render(
    <HomeSections
      now={now}
      nearbyServices={[nearbyService]}
      nearbyLoading={false}
      nearbyError={null}
      locationError={null}
      locationPermission="granted"
      locationLoading={false}
      onRequestLocation={vi.fn()}
      favoritesLoaded
      savedStations={[]}
      commute={null}
      commuteLoading={false}
      commuteError={null}
      alerts={[]}
      alertsLoading={false}
      alertsError={null}
      routeStatuses={statuses}
      {...overrides}
    />,
  );
}

describe("HomeSections", () => {
  it("leads with nearby realtime and an exact-trip planning path", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: "Near you" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Where to/i })).toHaveAttribute(
      "href",
      "/routes",
    );
    expect(screen.getByRole("link", {
      name: /D train to Coney Island-Stillwell Av in 4 minutes/i,
    })).toHaveAttribute("href", expect.stringContaining("trip=trip-1"));
    expect(screen.getByRole("heading", { name: "Transit intelligence" })).toBeVisible();
  });

  it("keeps saved transit and commute useful when location is unavailable", () => {
    renderHome({
      nearbyServices: [],
      locationPermission: "denied",
      savedStations: [savedStation],
      commute: configuredCommute,
    });

    expect(screen.getByRole("heading", { name: "Saved transit" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "47-50 Sts-Rockefeller Ctr" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Morning commute" })).toBeVisible();
    expect(screen.getByText("Leave in 12 min")).toBeVisible();
    expect(screen.getByRole("button", { name: /Try location again/i })).toBeVisible();
  });

  it("shows relevant alerts and a readable route service overview", () => {
    renderHome({ alerts: [relevantAlert] });

    expect(screen.getByRole("heading", { name: "Service on your routes" })).toBeVisible();
    expect(screen.getByText("Delays")).toBeVisible();
    expect(screen.getByRole("heading", { name: "What to know" })).toBeVisible();
    expect(screen.getByText(/trains are delayed near 36 St/)).toBeVisible();
  });

  it("uses compact empty and failure states", () => {
    renderHome({
      nearbyServices: [],
      nearbyError: "Realtime subway departures are unavailable.",
      routeStatuses: [],
      locationPermission: "granted",
    });

    expect(screen.getByText("Realtime is temporarily unavailable")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open Nearby/i })).toBeVisible();
    expect(screen.getByText("No saved stations yet")).toBeVisible();
    expect(screen.getByText("No active alerts for your routes")).toBeVisible();
  });

  it("keeps location and upstream failures truthful", () => {
    renderHome({
      nearbyServices: [],
      locationError: "Location request timed out.",
      locationPermission: "granted",
      alertsError: "Service alerts are temporarily unavailable.",
      commuteError: "Commute information is temporarily unavailable.",
      routeStatuses: statuses,
    });

    expect(screen.getByText("We couldn’t get your location")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try location again" })).toBeVisible();
    expect(screen.getByText("Service alerts are temporarily unavailable.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Commute unavailable" })).toBeVisible();
    expect(screen.queryByText("Good service")).not.toBeInTheDocument();
  });
});
