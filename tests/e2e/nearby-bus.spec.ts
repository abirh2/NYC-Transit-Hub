import { expect, test, type Page } from "playwright/test";

const stop = {
  id: "400001",
  stationId: null,
  name: "5 AV/W 42 ST",
  mode: "bus",
  direction: "unknown",
  location: { latitude: 40.754, longitude: -73.9808 },
  platformCode: null,
  routeIds: ["M1", "M2"],
  distanceMiles: 0.1,
};

async function mockNearby(page: Page, discoveryDelayMs = 0) {
  const arrival = new Date(Date.now() + 5 * 60_000).toISOString();
  const trainArrival = new Date(Date.now() + 3 * 60_000).toISOString();
  const laterTrainArrival = new Date(Date.now() + 18 * 60_000).toISOString();
  const uptownTrainArrival = new Date(Date.now() + 8 * 60_000).toISOString();
  await page.route("**/api/stations?**", async (route) => {
    if (discoveryDelayMs) await new Promise((resolve) => setTimeout(resolve, discoveryDelayMs));
    await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { stations: [{
      id: "D15",
      sourceIds: ["D15"],
      name: "47-50 Sts-Rockefeller Ctr",
      mode: "subway",
      location: { latitude: 40.75866, longitude: -73.98133 },
      stops: [
        { id: "D15N", stationId: "D15", name: "47-50 Sts-Rockefeller Ctr", mode: "subway", direction: "northbound", location: null, platformCode: null, routeIds: ["B", "D"] },
        { id: "D15S", stationId: "D15", name: "47-50 Sts-Rockefeller Ctr", mode: "subway", direction: "southbound", location: null, platformCode: null, routeIds: ["B", "D"] },
      ],
      routeIds: ["B", "D", "F", "M"],
      distance: 0.2,
    }] } }),
  });
  });
  await page.route("**/api/buses/stops?**", async (route) => {
    if (discoveryDelayMs) await new Promise((resolve) => setTimeout(resolve, discoveryDelayMs));
    await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { groups: [{
      id: "bus-stop-group:400001",
      name: stop.name,
      mode: "bus",
      location: stop.location,
      distanceMiles: 0.1,
      routeIds: stop.routeIds,
      stops: [stop],
    }] } }),
  });
  });
  await page.route("**/api/buses/nearby?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { results: [{
      stopId: stop.id,
      sourceState: "ok",
      departures: [{
        id: "trip-1:400001",
        mode: "bus",
        tripId: "trip-1",
        routeId: "M1",
        stopId: stop.id,
        stationId: null,
        direction: "inbound",
        destination: "East Village",
        predictedArrival: arrival,
        predictedDeparture: arrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 5,
        progressText: "2 stops away",
        stopsAway: 2,
      }],
      trips: [],
      vehicles: [],
      feedTimestamp: new Date().toISOString(),
      error: null,
    }] } }),
  }));
  await page.route("**/api/trains/realtime?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: {
      departures: [{
        id: "053500_D..S14R:D15S",
        mode: "subway",
        tripId: "053500_D..S14R",
        routeId: "D",
        stopId: "D15S",
        stationId: "D15",
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        predictedArrival: trainArrival,
        predictedDeparture: trainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 3,
      }, {
        id: "train-trip-d-later:D15S",
        mode: "subway",
        tripId: "train-trip-d-later",
        routeId: "D",
        stopId: "D15S",
        stationId: "D15",
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        predictedArrival: laterTrainArrival,
        predictedDeparture: laterTrainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 18,
      }, {
        id: "train-trip-2:D15S",
        mode: "subway",
        tripId: "train-trip-2",
        routeId: "F",
        stopId: "D15S",
        stationId: "D15",
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        predictedArrival: laterTrainArrival,
        predictedDeparture: laterTrainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 18,
      }, {
        id: "train-trip-d-north:D15N",
        mode: "subway",
        tripId: "train-trip-d-north",
        routeId: "D",
        stopId: "D15N",
        stationId: "D15",
        direction: "northbound",
        destination: "Norwood-205 St",
        predictedArrival: uptownTrainArrival,
        predictedDeparture: uptownTrainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 8,
      }, {
        id: "train-trip-3:D15N",
        mode: "subway",
        tripId: "train-trip-3",
        routeId: "B",
        stopId: "D15N",
        stationId: "D15",
        direction: "northbound",
        destination: "Bedford Park Blvd",
        predictedArrival: uptownTrainArrival,
        predictedDeparture: uptownTrainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 8,
      }],
      trips: [{
        id: "053500_D..S14R",
        mode: "subway",
        route: { id: "D", displayName: "D", longName: "6 Avenue Express", mode: "subway", color: "#FF6319", textColor: "#FFFFFF", agencyId: "MTA NYCT" },
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        startDate: "20260918",
        startTime: "08:55:00",
        scheduleRelationship: "scheduled",
        stopTimeUpdates: ["D14S", "D15S", "D16S"].map((stopId, index) => ({
          stopId,
          stationId: stopId.slice(0, -1),
          sequence: index + 1,
          arrivalTime: new Date(Date.now() + index * 60_000).toISOString(),
          departureTime: new Date(Date.now() + index * 60_000).toISOString(),
          delaySeconds: 0,
          scheduleRelationship: "scheduled",
        })),
        progress: { state: "between-stops", source: "vehicle", previousStopId: "D14S", nextStopId: "D15S", progressRatio: 0.72, timestamp: new Date().toISOString() },
        vehicleId: "D-selected",
        updatedAt: new Date().toISOString(),
        isAssigned: true,
      }, {
        id: "052850_D..S14R",
        mode: "subway",
        route: { id: "D", displayName: "D", longName: "6 Avenue Express", mode: "subway", color: "#FF6319", textColor: "#FFFFFF", agencyId: "MTA NYCT" },
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        startDate: "20260918",
        startTime: "08:48:30",
        scheduleRelationship: "scheduled",
        stopTimeUpdates: ["D14S", "D15S", "D16S"].map((stopId, index) => ({
          stopId,
          stationId: stopId.slice(0, -1),
          sequence: index + 1,
          arrivalTime: new Date(Date.now() + (index + 3) * 60_000).toISOString(),
          departureTime: new Date(Date.now() + (index + 3) * 60_000).toISOString(),
          delaySeconds: 0,
          scheduleRelationship: "scheduled",
        })),
        progress: { state: "between-stops", source: "vehicle", previousStopId: "D15S", nextStopId: "D16S", progressRatio: 0.28, timestamp: new Date().toISOString() },
        vehicleId: "D-peer",
        updatedAt: new Date().toISOString(),
        isAssigned: true,
      }], sourceState: "ok", lastUpdated: new Date().toISOString(),
    } }),
  }));
}

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.758, longitude: -73.9855 });
  await mockNearby(page);
});

test("shows a distance-ranked mixed feed and links the exact bus trip", async ({ page }) => {
  await page.goto("/nearby");
  const map = page.getByRole("region", { name: "Nearby map" });
  await expect(map).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search location or station" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan a trip" })).toHaveCount(0);
  await expect(page.getByText("47-50 Sts-Rockefeller Ctr").first()).toBeVisible();
  const trainSelect = page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i });
  await expect(trainSelect).toBeVisible();
  const stationMarker = page.getByRole("button", { name: "Select 47-50 Sts-Rockefeller Ctr subway station" });
  await stationMarker.focus();
  await stationMarker.press("Enter");
  await expect(trainSelect).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("01", { exact: true })).toHaveCount(0);

  const busSelect = page.getByRole("button", { name: /select M1 bus to East Village/i });
  await expect(busSelect.getByText("5 AV/W 42 ST")).toBeVisible();
  await trainSelect.click();
  await expect(trainSelect).toHaveAttribute("aria-pressed", "true");
  await busSelect.click();
  await expect(busSelect).toHaveAttribute("aria-pressed", "true");

  const busLink = page.getByRole("link", { name: /view M1 bus details/i });
  await expect(busLink).toBeVisible();
  await expect(busLink).toHaveAttribute("href", /mode=bus.*route=M1.*stop=400001.*trip=trip-1/);

  expect(await page.evaluate(() => {
    const mapElement = document.querySelector('[aria-label="Nearby map"]');
    const row = document.querySelector('[aria-label^="Select M1 bus"]');
    return Boolean(mapElement && row && (mapElement.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);

  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true });
  }
});

test("pages directional subway service and expands the exact selected train on the map", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nearby");

  const map = page.getByRole("region", { name: "Nearby map" });
  await expect(map).toHaveAttribute("data-expanded", "false");
  await expect(page.getByRole("heading", { name: "D train departures" })).toBeAttached();
  await expect(page.getByText("47-50 Sts-Rockefeller Ctr").first()).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /show .*more departure/i })).toHaveCount(0);

  const directionRail = page.getByTestId("subway-route-D-pages");
  await expect(directionRail).toHaveAttribute("aria-label", /Downtown \/ Brooklyn/i);
  await directionRail.focus();
  await page.keyboard.press("ArrowRight");
  await expect(directionRail).toHaveAttribute("aria-label", /Uptown \/ Bronx/i);
  await expect(page.getByRole("button", { name: /Select D train to Norwood-205 St/i })).toBeVisible();
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.screenshot({ path: ".impeccable/review/opposite-direction-390.png", fullPage: false });
  }
  await directionRail.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(directionRail).toHaveAttribute("aria-label", /Downtown \/ Brooklyn/i);

  const hero = page.getByRole("button", {
    name: /Select D train to Coney Island-Stillwell Av, 3 minutes/i,
  });
  await hero.click();
  await expect(map).toHaveAttribute("data-expanded", "true");
  await expect(page.getByRole("link", { name: "View D train details" })).toHaveAttribute(
    "href",
    /mode=subway.*route=D.*trip=053500_D..S14R/,
  );
  await expect(page.locator(".rt-marker--subway.rt-marker--selected")).toBeVisible();
  await expect(page.locator(".rt-marker--subway:not(.rt-marker--selected)")).toBeVisible();
  await expect(page.locator(".nearby-selected-route")).toBeVisible();

  const firstDeparture = page.getByRole("button", {
    name: /Select D train in 3 minutes to Coney Island-Stillwell Av/i,
  });
  await expect(firstDeparture).toHaveAttribute("aria-pressed", "true");
  await expect(firstDeparture).toHaveCSS("border-top-color", "rgb(255, 99, 25)");

  const nav = page.getByRole("navigation", { name: "Primary mobile navigation" });
  const heroBox = await hero.boundingBox();
  const navBox = await nav.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(Math.min(heroBox!.y + heroBox!.height, navBox!.y) - heroBox!.y).toBeGreaterThan(80);
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.screenshot({ path: ".impeccable/review/expanded-mobile.png", fullPage: true });
  }

  const laterDeparture = page.getByRole("button", {
    name: /Select D train in 18 minutes to Coney Island-Stillwell Av/i,
  });
  await expect(laterDeparture).toBeVisible();
  await laterDeparture.click();
  await expect(laterDeparture).toHaveAttribute("aria-pressed", "true");
  await expect(firstDeparture).toHaveAttribute("aria-pressed", "false");
  await expect(laterDeparture).toHaveCSS("border-top-color", "rgb(255, 99, 25)");
  await expect(firstDeparture).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.08)");
  await expect(page.getByRole("link", { name: "View D train details" })).toHaveAttribute(
    "href",
    /mode=subway.*route=D.*trip=train-trip-d-later/,
  );
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.screenshot({ path: ".impeccable/review/expanded-departures-390.png", fullPage: false });
  }

  await page.getByRole("button", { name: "Collapse train map" }).click();
  await expect(map).toHaveAttribute("data-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("uses the dragged map center for nearby discovery and restores device location", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const stationOrigins: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/stations" && url.searchParams.has("near")) {
      stationOrigins.push(url.searchParams.get("near") ?? "");
    }
  });

  await page.goto("/nearby");
  await expect.poll(() => stationOrigins.at(-1)).toBe("40.758,-73.9855");
  await expect(page.getByTestId("nearby-search-origin-pin")).toBeVisible();

  const mapCanvas = page.locator(".leaflet-container");
  const mapBox = await mapCanvas.boundingBox();
  expect(mapBox).not.toBeNull();
  const startX = mapBox!.x + mapBox!.width * 0.7;
  const startY = mapBox!.y + mapBox!.height * 0.4;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 90, startY + 30, { steps: 8 });
  await page.mouse.up();

  await expect.poll(() => stationOrigins.length).toBeGreaterThan(1);
  await expect.poll(() => stationOrigins.at(-1)).not.toBe("40.758,-73.9855");
  await expect(page.getByText("Map area", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Use my location" }).click();
  await expect.poll(() => stationOrigins.at(-1)).toBe("40.758,-73.9855");
});

test("searches a station or place and uses its exact coordinates without moving the user marker", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const stationOrigins: string[] = [];
  const busOrigins: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/stations" && url.searchParams.has("near")) {
      stationOrigins.push(url.searchParams.get("near") ?? "");
    }
    if (url.pathname === "/api/buses/stops" && url.searchParams.has("near")) {
      busOrigins.push(url.searchParams.get("near") ?? "");
    }
  });
  await page.route("**/api/locations?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        locations: [{
          id: "place:node:4242",
          kind: "place",
          name: "Bryant Park",
          description: "Midtown South, Manhattan",
          latitude: 40.7535965,
          longitude: -73.9832326,
        }],
      },
    }),
  }));

  await page.goto("/nearby");
  await expect.poll(() => stationOrigins.at(-1)).toBe("40.758,-73.9855");
  const userMarker = page.locator(".rt-user-location");
  await expect(userMarker).toBeVisible();

  const search = page.getByRole("combobox", { name: "Search location or station" });
  await search.fill("Bryant Park");
  await page.getByRole("option", { name: /Bryant Park.*Place.*Midtown South, Manhattan/i }).click();

  await expect.poll(() => stationOrigins.at(-1)).toBe("40.7535965,-73.9832326");
  await expect.poll(() => busOrigins.at(-1)).toBe("40.7535965,-73.9832326");
  await expect(page.getByText("Bryant Park", { exact: true }).first()).toBeVisible();
  await expect(userMarker).toBeVisible();
  await expect(search).toHaveValue("Bryant Park");
  await expect(page).toHaveURL(/\/nearby$/);

  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await search.fill("Bryant");
    await expect(page.getByRole("listbox", { name: "Location search results" })).toBeVisible();
    await page.screenshot({ path: ".impeccable/review/location-search-390.png", fullPage: false });
  }
});

test("filters to bus mode without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nearby");
  await expect(page.getByRole("region", { name: "Nearby map" })).toBeVisible();
  await expect(page.getByRole("button", { name: /select M1 bus to East Village/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toBeVisible();
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/mobile.png", fullPage: true });
  }
  await page.getByRole("button", { name: "bus", exact: true }).click();
  const bus = page.getByRole("button", { name: /select M1 bus to East Village/i });
  await expect(bus.getByText("5 AV/W 42 ST")).toBeVisible();
  await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toHaveCount(0);
  await bus.click();
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/selected-bus-390.png", fullPage: false });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("surfaces feed-level partial realtime failures", async ({ page }) => {
  await page.route("**/api/buses/nearby?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { results: [{
      stopId: stop.id,
      sourceState: "unavailable",
      departures: [],
      trips: [],
      vehicles: [],
      feedTimestamp: null,
      error: "Realtime unavailable",
    }] } }),
  }));

  await page.goto("/nearby");
  await expect(page.getByText("Partial", { exact: true })).toBeVisible();
  await expect(page.getByText(/Bus updates are unavailable/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toBeVisible();
});

test("keeps the initial hierarchy intact across target viewports and light mode", async ({ page }) => {
  const viewports = [
    { width: 375, height: 812 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/nearby");
    await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toBeVisible();
    await expect(page.locator("img.leaflet-tile-loaded").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    if (process.env.IMPECCABLE_CAPTURE === "1") {
      await page.screenshot({ path: `.impeccable/review/initial-${viewport.width}.png`, fullPage: false });
    }
  }

  await page.setViewportSize({ width: 393, height: 852 });
  if (!(await page.locator("html").getAttribute("class"))?.includes("light")) {
    await page.getByRole("button", { name: "Switch to light mode" }).click();
  }
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator("img.leaflet-tile-loaded[src*='World_Light_Gray_Base']").first()).toBeVisible();
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/light-393.png", fullPage: false });
  }
});

test("keeps loading and location-denied recovery compact", async ({ context, page }) => {
  await page.unroute("**/api/stations?**");
  await page.unroute("**/api/buses/stops?**");
  await page.unroute("**/api/buses/nearby?**");
  await page.unroute("**/api/trains/realtime?**");
  await mockNearby(page, 1_000);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/nearby");
  await expect(page.getByLabel("Loading nearby departures")).toBeVisible();
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/loading-393.png", fullPage: false });
  }
  await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toBeVisible();

  await context.clearPermissions();
  await page.addInitScript(() => {
    Object.defineProperty(navigator.permissions, "query", {
      configurable: true,
      value: async () => ({
        state: "denied",
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      }),
    });
  });
  await page.goto("/nearby");
  await expect(page.getByRole("heading", { name: "Location access is off" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try location again" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search location or station" })).toBeVisible();
  await expect(page.getByTestId("nearby-search-origin-pin")).toBeVisible();
  await expect(page.locator(".rt-user-location")).toHaveCount(0);
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/location-denied-393.png", fullPage: false });
  }
});
