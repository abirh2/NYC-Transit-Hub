import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrowdingList } from "@/components/crowding/CrowdingList";
import type { RouteCrowding } from "@/types/mta";

const data: RouteCrowding[] = [
  {
    routeId: "A",
    crowdingLevel: "HIGH",
    avgHeadwayMin: 14,
    timestamp: "2026-09-23T16:00:00.000Z",
  },
  {
    routeId: "L",
    crowdingLevel: "LOW",
    avgHeadwayMin: 4,
    timestamp: "2026-09-23T16:00:00.000Z",
  },
];

describe("CrowdingList", () => {
  it("labels the experience as an estimate rather than measured occupancy", () => {
    render(<CrowdingList data={data} />);

    expect(
      screen.getByRole("heading", { name: "Estimated crowding conditions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Estimated")).toBeInTheDocument();
    expect(screen.getByText(/not measured passenger counts/i)).toBeInTheDocument();
  });

  it("groups relative line conditions in a named analytics region", () => {
    render(<CrowdingList data={data} />);

    expect(
      screen.getByRole("region", { name: "Relative conditions by line" }),
    ).toBeInTheDocument();
    expect(screen.getByText("~14 min gaps")).toBeInTheDocument();
    expect(screen.getByText("~4 min gaps")).toBeInTheDocument();
  });
});
