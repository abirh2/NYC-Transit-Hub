import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocationSearchField } from "@/components/ui/LocationSearchField";

describe("LocationSearchField", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("searches the internal endpoint and selects the keyboard-highlighted result", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
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
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LocationSearchField
        label="Where from?"
        value={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Where from?" });
    await user.type(input, "Bryant");
    await screen.findByRole("option", { name: /47-50 Sts-Rockefeller Ctr/i });
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/locations?query=Bryant&limit=8",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: "place:node:4242",
      name: "Bryant Park",
    }));
    expect(input).toHaveValue("Bryant Park");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("announces unavailable search and clears a stale selected value on edit", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      <LocationSearchField
        label="Where to?"
        value={{
          id: "place:node:4242",
          kind: "place",
          name: "Bryant Park",
          description: "Midtown South, Manhattan",
          latitude: 40.7535965,
          longitude: -73.9832326,
        }}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Where to?" });
    await user.type(input, " West");

    expect(onSelect).toHaveBeenCalledWith(null);
    expect(await screen.findByText("Search unavailable. Try again.")).toBeVisible();
  });

  it("accepts the best matching street address with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        locations: [{
          id: "place:way:34633854",
          kind: "place",
          name: "350 5th Avenue",
          description: "Midtown South, Manhattan · 10118",
          latitude: 40.74844,
          longitude: -73.98566,
        }],
      },
    }), { status: 200 })));

    render(<LocationSearchField label="Where from?" value={null} onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "Where from?" });
    await user.type(input, "350 5th Avenue");
    await screen.findByRole("option", { name: /350 5th Avenue, Place/i });
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      kind: "place",
      name: "350 5th Avenue",
    }));
    expect(input).toHaveValue("350 5th Avenue");
  });
});
