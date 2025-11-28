import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrivalsList } from "@/components/board/ArrivalsList";
import type { TrainArrival } from "@/types/mta";

// Mock SubwayBullet component
vi.mock("@/components/ui", () => ({
  SubwayBullet: ({ line }: { line: string }) => (
    <span data-testid={`bullet-${line}`}>{line}</span>
  ),
}));

const mockArrivals: TrainArrival[] = [
  {
    tripId: "trip-1",
    routeId: "A",
    direction: "N",
    headsign: "Inwood-207 St",
    stopId: "A15N",
    stationName: "West 4 St",
    arrivalTime: new Date(Date.now() + 180000), // 3 min
    departureTime: null,
    delay: 0,
    isAssigned: true,
    minutesAway: 3,
  },
  {
    tripId: "trip-2",
    routeId: "F",
    direction: "N",
    headsign: "Jamaica-179 St",
    stopId: "A15N",
    stationName: "West 4 St",
    arrivalTime: new Date(Date.now() + 480000), // 8 min
    departureTime: null,
    delay: 0,
    isAssigned: true,
    minutesAway: 8,
  },
];

describe("ArrivalsList", () => {
  it("should render arrivals", () => {
    render(<ArrivalsList arrivals={mockArrivals} />);

    expect(screen.getByText("Inwood-207 St")).toBeInTheDocument();
    expect(screen.getByText("Jamaica-179 St")).toBeInTheDocument();
    expect(screen.getByText("3 min")).toBeInTheDocument();
    expect(screen.getByText("8 min")).toBeInTheDocument();
  });

  it("should render subway bullets", () => {
    render(<ArrivalsList arrivals={mockArrivals} />);

    expect(screen.getByTestId("bullet-A")).toBeInTheDocument();
    expect(screen.getByTestId("bullet-F")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<ArrivalsList arrivals={[]} isLoading={true} />);

    // Spinner should be present (HeroUI Spinner renders with role="status")
    expect(document.querySelector(".animate-spinner-linear-spin")).toBeInTheDocument();
  });

  it("should show error state", () => {
    render(<ArrivalsList arrivals={[]} error="Failed to load" />);

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("should show empty state when no arrivals", () => {
    render(<ArrivalsList arrivals={[]} />);

    expect(screen.getByText("No upcoming trains")).toBeInTheDocument();
  });

  it("should show direction label", () => {
    render(
      <ArrivalsList arrivals={mockArrivals} directionLabel="Uptown & The Bronx" />
    );

    expect(screen.getByText("Uptown & The Bronx")).toBeInTheDocument();
  });

  it("should limit arrivals to maxArrivals", () => {
    const manyArrivals = [...mockArrivals, ...mockArrivals, ...mockArrivals];
    render(<ArrivalsList arrivals={manyArrivals} maxArrivals={2} />);

    // Should only show 2 arrivals
    const bullets = screen.getAllByTestId(/^bullet-/);
    expect(bullets.length).toBe(2);
  });

  it("should show 'Now' for immediate arrivals", () => {
    const immediateArrival: TrainArrival = {
      ...mockArrivals[0],
      minutesAway: 0,
    };
    render(<ArrivalsList arrivals={[immediateArrival]} />);

    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("should show delay chip for delayed trains", () => {
    const delayedArrival: TrainArrival = {
      ...mockArrivals[0],
      delay: 180, // 3 minutes delay
    };
    render(<ArrivalsList arrivals={[delayedArrival]} />);

    expect(screen.getByText("+3 min")).toBeInTheDocument();
  });
});

