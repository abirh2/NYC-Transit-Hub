import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RouteFinder } from "@/components/accessibility/RouteFinder";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/routes",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const from = {
  id: "station:D15",
  kind: "station",
  name: "47-50 Sts-Rockefeller Ctr",
  description: "Subway station",
  latitude: 40.75866,
  longitude: -73.98133,
  stationId: "D15",
};
const to = {
  id: "place:node:4242",
  kind: "place",
  name: "Bryant Park",
  description: "Midtown South, Manhattan",
  latitude: 40.7535965,
  longitude: -73.9832326,
};

function response(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status }));
}

describe("RouteFinder", () => {
  beforeEach(() => {
    search = "";
    replace.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("hydrates reload-safe context and swaps origin with destination", async () => {
    const user = userEvent.setup();
    search = new URLSearchParams({
      from: from.name,
      fromLat: String(from.latitude),
      fromLon: String(from.longitude),
      fromStation: from.stationId,
      to: to.name,
      toLat: String(to.latitude),
      toLon: String(to.longitude),
      accessible: "true",
    }).toString();

    render(<RouteFinder />);
    expect(screen.getByRole("combobox", { name: "Where from?" })).toHaveValue(from.name);
    expect(screen.getByRole("combobox", { name: "Where to?" })).toHaveValue(to.name);
    expect(screen.getByRole("checkbox", { name: "Step-free routes only" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Swap origin and destination" }));
    expect(screen.getByRole("combobox", { name: "Where from?" })).toHaveValue(to.name);
    expect(screen.getByRole("combobox", { name: "Where to?" })).toHaveValue(from.name);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("from=Bryant+Park"), { scroll: false });
  });

  it("plans with selected locations and presents rider decision details", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("/api/locations?query=Rockefeller")) {
        return response({ success: true, data: { locations: [from] } });
      }
      if (url.startsWith("/api/locations?query=Bryant")) {
        return response({ success: true, data: { locations: [to] } });
      }
      if (url.startsWith("/api/routes/trip?")) {
        return response({
          success: true,
          data: {
            from: { name: from.name },
            to: { name: to.name },
            wheelchair: false,
            itineraries: [{
              duration: 1320,
              startTimeFmt: "2026-09-22T18:00:00.000Z",
              endTimeFmt: "2026-09-22T18:22:00.000Z",
              walkTime: 240,
              transitTime: 900,
              waitingTime: 180,
              walkDistance: 420,
              transfers: 1,
              legs: [{
                startTime: 0,
                startTimeFmt: "2026-09-22T18:00:00.000Z",
                endTime: 0,
                endTimeFmt: "2026-09-22T18:04:00.000Z",
                mode: "WALK",
                duration: 240,
                distance: 420,
                from: { name: "Origin", lon: from.longitude, lat: from.latitude },
                to: { name: "47-50 Sts", lon: from.longitude, lat: from.latitude },
                transitLeg: false,
              }, {
                startTime: 0,
                startTimeFmt: "2026-09-22T18:07:00.000Z",
                endTime: 0,
                endTimeFmt: "2026-09-22T18:22:00.000Z",
                mode: "SUBWAY",
                route: "D",
                headsign: "Coney Island-Stillwell Av",
                duration: 900,
                distance: 2400,
                from: { name: "47-50 Sts", lon: from.longitude, lat: from.latitude },
                to: { name: "42 St-Bryant Pk", lon: to.longitude, lat: to.latitude },
                intermediateStops: [{ name: "42 St-Bryant Pk" }],
                transitLeg: true,
              }],
            }],
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }));

    render(<RouteFinder />);
    await user.type(screen.getByRole("combobox", { name: "Where from?" }), "Rockefeller");
    await user.click(await screen.findByRole("option", { name: /47-50 Sts-Rockefeller Ctr/i }));
    await user.type(screen.getByRole("combobox", { name: "Where to?" }), "Bryant");
    await user.click(await screen.findByRole("option", { name: /Bryant Park/i }));
    await user.click(screen.getByRole("button", { name: "Plan trip" }));

    expect(await screen.findByText("22 min")).toBeVisible();
    expect(screen.getByText("1 transfer")).toBeVisible();
    expect(screen.getAllByText(/Walk 0.3 mi/i)).toHaveLength(2);
    expect(screen.getByText("Coney Island-Stillwell Av")).toBeVisible();
    expect(screen.getAllByAltText("D train")).toHaveLength(2);
  });

  it("distinguishes no supported route from an unavailable planner", async () => {
    const user = userEvent.setup();
    search = new URLSearchParams({
      from: from.name,
      fromLat: String(from.latitude),
      fromLon: String(from.longitude),
      to: to.name,
      toLat: String(to.latitude),
      toLon: String(to.longitude),
    }).toString();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: false,
      noPath: true,
      error: "No routes found for this trip",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<RouteFinder />);
    await user.click(screen.getByRole("button", { name: "Plan trip" }));
    expect(await screen.findByText("No supported route found")).toBeVisible();

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    rerender(<RouteFinder />);
    await user.click(screen.getByRole("button", { name: "Plan trip" }));
    await waitFor(() => expect(screen.getByText("Trip planning is unavailable")).toBeVisible());
  });
});
