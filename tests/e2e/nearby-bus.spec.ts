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

async function mockNearby(page: Page) {
  const arrival = new Date(Date.now() + 5 * 60_000).toISOString();
  const trainArrival = new Date(Date.now() + 3 * 60_000).toISOString();
  const laterTrainArrival = new Date(Date.now() + 18 * 60_000).toISOString();
  const uptownTrainArrival = new Date(Date.now() + 8 * 60_000).toISOString();
  await page.route("**/api/stations?**", (route) => route.fulfill({
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
  }));
  await page.route("**/api/buses/stops?**", (route) => route.fulfill({
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
  }));
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
  await expect(page.getByRole("link", { name: "Plan a trip" })).toHaveAttribute("href", "/routes");
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
  await expect(page.getByRole("heading", { name: "47-50 Sts-Rockefeller Ctr" })).toBeVisible();

  const downtownTab = page.getByRole("tab", { name: "Downtown / Brooklyn" });
  const uptownTab = page.getByRole("tab", { name: "Uptown / Bronx" });
  await expect(downtownTab).toHaveAttribute("aria-selected", "true");

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

  const nav = page.getByRole("navigation", { name: "Primary mobile navigation" });
  const heroBox = await hero.boundingBox();
  const navBox = await nav.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(Math.min(heroBox!.y + heroBox!.height, navBox!.y) - heroBox!.y).toBeGreaterThan(180);
  if (process.env.IMPECCABLE_CAPTURE === "1") {
    await page.screenshot({ path: ".impeccable/review/expanded-mobile.png", fullPage: true });
  }

  await page.getByRole("button", { name: "Show 1 more departure" }).click();
  await expect(page.getByRole("link", { name: /F train in 18 minutes/i })).toHaveAttribute(
    "href",
    /mode=subway.*route=F.*trip=train-trip-2/,
  );

  await uptownTab.click();
  await expect(page.getByRole("button", { name: /Select B train to Bedford Park Blvd/i })).toBeVisible();
  await downtownTab.click();
  await expect(page.getByRole("link", { name: /F train in 18 minutes/i })).toBeVisible();

  await page.getByRole("button", { name: "Collapse train map" }).click();
  await expect(map).toHaveAttribute("data-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
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
  await expect(page.getByRole("button", { name: /select M1 bus to East Village/i }).getByText("5 AV/W 42 ST")).toBeVisible();
  await expect(page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i })).toHaveCount(0);
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
