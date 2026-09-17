import { describe, it, expect } from "vitest";
import {
  buildBusMarkerHtml,
  buildRailMarkerHtml,
  buildSubwayMarkerHtml,
  compassPoint,
  getBearingDegrees,
  getMarkerStatus,
} from "@/components/realtime/map/markerIcons";
import { SUBWAY_ROUTE_COLORS } from "@/lib/transit/route-colors";

describe("subway marker colors", () => {
  // Asserted against the canonical map, not a local copy, so a divergent
  // hardcoded palette in the map layer cannot slip back in.
  it.each(Object.entries(SUBWAY_ROUTE_COLORS))(
    "uses the canonical %s color",
    (routeId, expectedColor) => {
      const { html } = buildSubwayMarkerHtml({
        routeId,
        directionLabel: "Northbound",
        bearingDegrees: 0,
        status: "normal",
        isSelected: false,
      });

      expect(html).toContain(`background:${expectedColor}`);
    },
  );

  it("picks official MTA bullet text colors, not pure WCAG", () => {
    // Yellow Broadway routes keep black text.
    expect(
      buildSubwayMarkerHtml({
        routeId: "N",
        directionLabel: "Northbound",
        bearingDegrees: null,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain("color:#000000");

    // Orange Sixth Avenue routes use white — the printed-map identity —
    // even though WCAG would prefer black on #FF6319.
    expect(
      buildSubwayMarkerHtml({
        routeId: "D",
        directionLabel: "Northbound",
        bearingDegrees: null,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain("color:#ffffff");

    expect(
      buildSubwayMarkerHtml({
        routeId: "A",
        directionLabel: "Northbound",
        bearingDegrees: null,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain("color:#ffffff");
  });

  it("normalizes express and shuttle variants onto their family color", () => {
    expect(
      buildSubwayMarkerHtml({
        routeId: "6X",
        directionLabel: "Southbound",
        bearingDegrees: null,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain(`background:${SUBWAY_ROUTE_COLORS["6"]}`);
  });
});

describe("marker direction encoding", () => {
  it("carries direction as chevron rotation, not color", () => {
    const north = buildSubwayMarkerHtml({
      routeId: "A",
      directionLabel: "Northbound",
      bearingDegrees: 0,
      status: "normal",
      isSelected: false,
    }).html;
    const south = buildSubwayMarkerHtml({
      routeId: "A",
      directionLabel: "Southbound",
      bearingDegrees: 180,
      status: "normal",
      isSelected: false,
    }).html;

    expect(north).toContain("rotate(0deg)");
    expect(south).toContain("rotate(180deg)");

    // Neither direction introduces a semantic-state class.
    for (const html of [north, south]) {
      expect(html).not.toContain("rt-marker--delay");
      expect(html).not.toContain("rt-marker--severe");
    }
  });

  it("omits the chevron when no bearing is available", () => {
    const { html } = buildSubwayMarkerHtml({
      routeId: "A",
      directionLabel: "Direction unavailable",
      bearingDegrees: null,
      status: "normal",
      isSelected: false,
    });

    expect(html).not.toContain("rt-marker__chevron");
  });

  it("announces direction in text so color is never the only cue", () => {
    const { html } = buildSubwayMarkerHtml({
      routeId: "A",
      directionLabel: "Northbound",
      bearingDegrees: 0,
      status: "normal",
      isSelected: false,
      accessibleSuffix: "to Inwood-207 St",
    });

    expect(html).toContain("A train, Northbound, to Inwood-207 St");
  });

  it("normalizes out-of-range bearings", () => {
    expect(
      buildSubwayMarkerHtml({
        routeId: "A",
        directionLabel: "Southbound",
        bearingDegrees: 400,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain("rotate(40deg)");

    expect(
      buildSubwayMarkerHtml({
        routeId: "A",
        directionLabel: "Southbound",
        bearingDegrees: -90,
        status: "normal",
        isSelected: false,
      }).html,
    ).toContain("rotate(270deg)");
  });
});

describe("getMarkerStatus", () => {
  it("reserves condition states for service condition", () => {
    expect(getMarkerStatus({ minutesAway: 8, delaySeconds: 0 })).toBe("normal");
    expect(getMarkerStatus({ minutesAway: 1, delaySeconds: 0 })).toBe("arriving");
    expect(getMarkerStatus({ minutesAway: 8, delaySeconds: 180 })).toBe("delay");
    expect(getMarkerStatus({ minutesAway: 8, delaySeconds: 900 })).toBe("severe");
  });

  it("lets staleness win over a confident delay figure", () => {
    expect(
      getMarkerStatus({ minutesAway: 8, delaySeconds: 900, isStale: true }),
    ).toBe("stale");
  });

  it("treats a missing ETA as normal rather than arriving", () => {
    expect(getMarkerStatus({ minutesAway: null })).toBe("normal");
  });
});

describe("getBearingDegrees", () => {
  it("returns north for a due-north step", () => {
    expect(getBearingDegrees(40.7, -74, 40.8, -74)).toBeCloseTo(0, 1);
  });

  it("returns south for a due-south step", () => {
    expect(getBearingDegrees(40.8, -74, 40.7, -74)).toBeCloseTo(180, 1);
  });

  it("returns east for a due-east step", () => {
    expect(getBearingDegrees(40.7, -74, 40.7, -73.9)).toBeCloseTo(90, 1);
  });

  it("always returns a value in [0, 360)", () => {
    const bearing = getBearingDegrees(40.7, -74, 40.7, -74.1);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
    expect(bearing).toBeCloseTo(270, 1);
  });
});

describe("compassPoint", () => {
  it("maps bearings onto spoken compass points", () => {
    expect(compassPoint(0)).toBe("north");
    expect(compassPoint(90)).toBe("east");
    expect(compassPoint(180)).toBe("south");
    expect(compassPoint(270)).toBe("west");
    expect(compassPoint(360)).toBe("north");
  });
});

describe("bus and rail markers", () => {
  it("derives bus text contrast from the supplied route color", () => {
    const { html } = buildBusMarkerHtml({
      routeId: "M15",
      routeColor: "#0039A6",
      bearingDegrees: 45,
      status: "normal",
      isSelected: false,
    });

    expect(html).toContain("background:#0039A6");
    expect(html).toContain("color:#ffffff");
    expect(html).toContain("rotate(45deg)");
    expect(html).toContain("heading northeast");
  });

  it("reports an unavailable bus heading rather than inventing one", () => {
    const { html } = buildBusMarkerHtml({
      routeId: "M15",
      routeColor: "#0039A6",
      bearingDegrees: null,
      status: "normal",
      isSelected: false,
    });

    expect(html).toContain("heading unavailable");
  });

  it("labels rail markers with the train number when present", () => {
    const withId = buildRailMarkerHtml({
      trainId: "1234",
      routeColor: "#0039A6",
      directionLabel: "Inbound",
      bearingDegrees: null,
      status: "normal",
      isSelected: false,
    });
    expect(withId.html).toContain("Train 1234");

    // The feed uses "---" as a placeholder, which must not be rendered.
    const placeholder = buildRailMarkerHtml({
      trainId: "---",
      routeColor: "#0039A6",
      directionLabel: "Inbound",
      bearingDegrees: null,
      status: "normal",
      isSelected: false,
    });
    expect(placeholder.html).not.toContain("---");
  });
});

describe("marker escaping", () => {
  it("escapes text interpolated into marker HTML", () => {
    const { html } = buildBusMarkerHtml({
      routeId: "M15",
      routeColor: "#0039A6",
      bearingDegrees: null,
      status: "normal",
      isSelected: false,
      accessibleSuffix: 'to <script>alert("x")</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("selected marker state", () => {
  it("marks the selected vehicle distinctly", () => {
    expect(
      buildSubwayMarkerHtml({
        routeId: "A",
        directionLabel: "Northbound",
        bearingDegrees: 0,
        status: "normal",
        isSelected: true,
      }).html,
    ).toContain("rt-marker--selected");
  });
});
