import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ChartSurface,
  ChartTooltip,
  EmptyChartState,
} from "@/components/analytics";
import { DataFreshness } from "@/components/ui";

describe("analytics primitives", () => {
  it("gives a chart a named region with concise supporting context", () => {
    render(
      <ChartSurface
        title="Incidents over time"
        description="Daily incidents in the selected period."
      >
        <div>chart content</div>
      </ChartSurface>,
    );

    expect(
      screen.getByRole("region", { name: "Incidents over time" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Daily incidents in the selected period.")).toBeInTheDocument();
  });

  it("explains why an empty chart has no values", () => {
    render(
      <EmptyChartState
        title="No trend data yet"
        description="Patterns appear after historical records accumulate."
      />,
    );

    expect(screen.getByText("No trend data yet")).toBeInTheDocument();
    expect(
      screen.getByText("Patterns appear after historical records accumulate."),
    ).toBeInTheDocument();
  });

  it("renders concise tooltip values with units", () => {
    render(
      <ChartTooltip
        label="Sep 23"
        items={[
          { label: "Incidents", value: 4 },
          { label: "Score", value: 82, unit: "/100" },
        ]}
      />,
    );

    expect(screen.getByText("Sep 23")).toBeInTheDocument();
    expect(screen.getByText("Incidents")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("82/100")).toBeInTheDocument();
  });
});

describe("DataFreshness", () => {
  const now = new Date("2026-09-23T16:00:00.000Z");

  it("does not over-label normally fresh data", () => {
    render(
      <DataFreshness
        updatedAt={new Date("2026-09-23T15:59:30.000Z")}
        now={now}
      />,
    );

    expect(screen.getByText("Updated now")).toBeInTheDocument();
    expect(screen.queryByText(/delayed/i)).not.toBeInTheDocument();
  });

  it("labels data that exceeds its freshness window", () => {
    render(
      <DataFreshness
        updatedAt={new Date("2026-09-23T15:55:00.000Z")}
        now={now}
        staleAfterMs={60_000}
      />,
    );

    expect(screen.getByText("Realtime delayed")).toBeInTheDocument();
  });

  it("takes offline state over an old timestamp", () => {
    render(
      <DataFreshness
        updatedAt={new Date("2026-09-23T15:55:00.000Z")}
        now={now}
        isOffline
      />,
    );

    expect(screen.getByText("Realtime unavailable offline")).toBeInTheDocument();
  });
});
