import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StationSearch } from "@/components/board/StationSearch";

const station = {
  id: "D15",
  name: "47-50 Sts-Rockefeller Ctr",
  latitude: 40.75866,
  longitude: -73.98133,
  routeIds: ["B", "D", "F", "M"],
  allIds: ["D15"],
  allPlatforms: { north: ["D15N"], south: ["D15S"] },
};

describe("StationSearch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows saved stations before typing and selects them", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <StationSearch
        onSelect={onSelect}
        savedStations={[{ id: "D15", name: station.name }]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Search stations" }));
    expect(screen.getByText("Saved stations")).toBeVisible();
    await user.click(screen.getByRole("option", { name: /47-50 Sts-Rockefeller Ctr.*saved station/i }));

    expect(onSelect).toHaveBeenCalledWith("D15", station.name, undefined, undefined);
  });

  it("shows route identity and selects a station with the keyboard", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { stations: [station] },
    }), { status: 200 })));

    render(<StationSearch onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "Search stations" });
    await user.type(input, "Rockefeller");
    await screen.findByRole("option", { name: /47-50 Sts-Rockefeller Ctr.*B.*D.*F.*M/i });
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(
      "D15",
      station.name,
      station.allPlatforms,
      { latitude: station.latitude, longitude: station.longitude },
    );
    expect(input).toHaveValue(station.name);
  });

  it("keeps unavailable search distinct from no matching stations", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<StationSearch onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox", { name: "Search stations" }), "Rockefeller");

    expect(await screen.findByText("Station search is unavailable. Try again.")).toBeVisible();
  });
});
