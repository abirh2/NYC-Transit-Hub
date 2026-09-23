import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StationBoard } from "@/components/board/StationBoard";

const replace = vi.fn();
let search = "station=D15";

vi.mock("next/navigation", () => ({
  usePathname: () => "/board",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/lib/hooks/useStationPreferences", () => ({
  useStationPreferences: () => ({
    primaryStation: null,
    favorites: [],
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: () => false,
  }),
}));

const selectedStation = {
  id: "D15",
  name: "47-50 Sts-Rockefeller Ctr",
  routeIds: ["B", "D", "F", "M"],
  allPlatforms: { north: ["D15N"], south: ["D15S"] },
};

function json(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
}

describe("StationBoard", () => {
  beforeEach(() => {
    search = "station=D15";
    replace.mockReset();
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/stations?id=D15") {
        return json({ success: true, data: { stations: [selectedStation] } });
      }
      if (url.startsWith("/api/trains/realtime")) {
        return json({ success: true, data: { arrivals: [] } });
      }
      if (url.includes("search=Times")) {
        return json({
          success: true,
          data: {
            stations: [{
              ...selectedStation,
              id: "127",
              name: "Times Sq-42 St",
              routeIds: ["1", "2", "3", "7", "N", "Q", "R", "W", "S"],
            }],
          },
        });
      }
      return json({ success: false, data: null });
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("hydrates station selection from the URL and leads with station identity", async () => {
    render(<StationBoard autoRefresh={false} />);

    expect(await screen.findByRole("heading", { name: selectedStation.name })).toBeVisible();
    expect(screen.getByLabelText("Routes served")).toContainElement(screen.getByAltText("B train"));
    expect(screen.getByRole("button", { name: "Save station" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh departures" })).toBeVisible();
  });

  it("writes a newly selected station to reload-safe URL state", async () => {
    const user = userEvent.setup();
    search = "";
    render(<StationBoard autoRefresh={false} />);

    await user.type(screen.getByRole("combobox", { name: "Search stations" }), "Times");
    await user.click(await screen.findByRole("option", { name: /Times Sq-42 St/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/board?station=127", { scroll: false }));
  });

  it("fetches every represented platform and deduplicates exact trips", async () => {
    const arrival = {
      tripId: "trip-shared",
      routeId: "D",
      direction: "N",
      headsign: "Norwood-205 St",
      stopId: "D15N",
      stationName: selectedStation.name,
      arrivalTime: "2026-09-22T18:20:00.000Z",
      departureTime: null,
      delay: 0,
      isAssigned: true,
      minutesAway: 4,
    };
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/stations?id=D15") {
        return json({
          success: true,
          data: { stations: [{
            ...selectedStation,
            allPlatforms: { north: ["D15N", "D16N"], south: ["D15S"] },
          }] },
        });
      }
      if (url.startsWith("/api/elevators")) {
        return json({ success: true, data: { equipment: [] } });
      }
      if (url.includes("stationId=D15N") || url.includes("stationId=D16N")) {
        return json({ success: true, data: { arrivals: [arrival] } });
      }
      return json({ success: true, data: { arrivals: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StationBoard autoRefresh={false} />);

    expect(await screen.findByText("Norwood-205 St")).toBeVisible();
    expect(screen.getAllByText("Norwood-205 St")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/trains/realtime?stationId=D16N&limit=10");
  });
});
