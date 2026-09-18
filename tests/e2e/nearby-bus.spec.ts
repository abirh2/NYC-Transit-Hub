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
      departures: [], trips: [], sourceState: "empty", lastUpdated: new Date().toISOString(),
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
  await expect(page.getByRole("heading", { name: "Nearby transit" })).toBeVisible();
  await expect(page.getByText("5 AV/W 42 ST")).toBeVisible();
  await expect(page.getByText("Times Sq-42 St").first()).toBeVisible();

  const busLink = page.getByRole("link", { name: /M1 bus to East Village, 5 min/i });
  await expect(busLink).toBeVisible();
  await expect(busLink).toHaveAttribute("href", /mode=bus.*route=M1.*stop=400001.*trip=trip-1/);
});

test("filters to bus mode without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nearby");
  await page.getByRole("button", { name: "bus", exact: true }).click();
  await expect(page.getByText("5 AV/W 42 ST")).toBeVisible();
  await expect(page.getByText("Times Sq-42 St")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
