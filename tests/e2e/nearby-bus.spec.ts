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
  await page.route("**/api/stations?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { stations: [{
      id: "127",
      sourceIds: ["127"],
      name: "Times Sq-42 St",
      mode: "subway",
      location: { latitude: 40.7553, longitude: -73.9875 },
      stops: [{ id: "127N", stationId: "127", name: "Times Sq-42 St", mode: "subway", direction: "northbound", location: null, platformCode: null, routeIds: ["1"] }],
      routeIds: ["1", "2", "3"],
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
        id: "train-trip-1:127S",
        mode: "subway",
        tripId: "train-trip-1",
        routeId: "D",
        stopId: "127S",
        stationId: "127",
        direction: "southbound",
        destination: "Coney Island-Stillwell Av",
        predictedArrival: trainArrival,
        predictedDeparture: trainArrival,
        delaySeconds: 0,
        status: "realtime",
        minutesAway: 3,
      }],
      trips: [], sourceState: "ok", lastUpdated: new Date().toISOString(),
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
  await expect(page.getByText("Times Sq-42 St").first()).toBeVisible();
  const trainSelect = page.getByRole("button", { name: /select D train to Coney Island-Stillwell Av/i });
  await expect(trainSelect).toBeVisible();
  const stationMarker = page.getByRole("button", { name: "Select Times Sq-42 St subway station" });
  await stationMarker.focus();
  await stationMarker.press("Enter");
  await expect(trainSelect).toHaveAttribute("aria-pressed", "true");
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
