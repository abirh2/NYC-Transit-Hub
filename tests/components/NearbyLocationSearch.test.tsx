import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NearbyLocationSearch } from "@/components/nearby/NearbyLocationSearch";

describe("NearbyLocationSearch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("searches stations and places and selects exact coordinates", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        locations: [{
          id: "station:D15",
          kind: "station",
          name: "47-50 Sts-Rockefeller Ctr",
          description: "Subway station",
          latitude: 40.75866,
          longitude: -73.98133,
          stationId: "D15",
        }, {
          id: "place:node:4242",
          kind: "place",
          name: "Bryant Park",
          description: "Midtown South, Manhattan",
          latitude: 40.7535965,
          longitude: -73.9832326,
        }],
      },
    }), { status: 200 })));

    render(<NearbyLocationSearch onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "Search location or station" });
    await user.type(input, "Bryant");

    const place = await screen.findByRole("option", { name: /Bryant Park.*Place.*Midtown South, Manhattan/i });
    expect(screen.getByRole("option", { name: /47-50 Sts-Rockefeller Ctr.*Station/i })).toBeVisible();
    await user.click(place);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: "place:node:4242",
      latitude: 40.7535965,
      longitude: -73.9832326,
    }));
    expect(input).toHaveValue("Bryant Park");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows a useful empty state and closes it with Escape", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { locations: [] },
    }), { status: 200 })));

    render(<NearbyLocationSearch onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Search location or station" });
    await user.type(input, "Nowhere");
    expect(await screen.findByText("No NYC locations found")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("No NYC locations found")).not.toBeInTheDocument();
  });

  it("keeps the field usable when search is unavailable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<NearbyLocationSearch onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Search location or station" });
    await user.type(input, "Bryant");
    expect(await screen.findByText("Search unavailable. Try again.")).toBeVisible();
    await user.clear(input);
    await waitFor(() => expect(screen.queryByText("Search unavailable. Try again.")).not.toBeInTheDocument());
  });
});
