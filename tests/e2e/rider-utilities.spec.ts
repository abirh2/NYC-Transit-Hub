import { expect, test, type Page } from "playwright/test";

async function mockBoard(page: Page) {
  await page.route("**/api/stations?id=D15", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { stations: [{
      id: "D15",
      name: "47-50 Sts-Rockefeller Ctr",
      latitude: 40.75866,
      longitude: -73.98133,
      routeIds: ["B", "D", "F", "M"],
      allPlatforms: { north: ["D15N"], south: ["D15S"] },
    }] } }),
  }));
  await page.route("**/api/trains/realtime?**", (route) => {
    const northbound = new URL(route.request().url()).searchParams.get("stationId") === "D15N";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { arrivals: northbound ? [{
        tripId: "073850_D..N03R",
        routeId: "D",
        direction: "N",
        headsign: "Norwood-205 St",
        stopId: "D15N",
        stationName: "47-50 Sts-Rockefeller Ctr",
        arrivalTime: new Date(Date.now() + 4 * 60_000).toISOString(),
        departureTime: null,
        delay: 0,
        isAssigned: true,
        minutesAway: 4,
      }] : [] } }),
    });
  });
  await page.route("**/api/elevators?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { equipment: [] } }),
  }));
}

test("station context reaches exact train detail and adjacent rider tools", async ({ page }) => {
  await mockBoard(page);
  await page.goto("/board?station=D15");

  await expect(page.getByRole("heading", { name: "47-50 Sts-Rockefeller Ctr" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan from here" })).toHaveAttribute("href", /fromStation=D15/);
  const train = page.getByRole("link", { name: /D train to Norwood-205 St in 4 minutes/i });
  await expect(train).toHaveAttribute("href", /trip=073850_D..N03R/);
  await train.click();
  await expect(page).toHaveURL(/\/realtime\?.*trip=073850_D..N03R/, { timeout: 15_000 });
});

test("Plan reloads known context and exposes the accessible preference", async ({ page }) => {
  await page.goto("/routes?from=Rockefeller+Center&fromLat=40.75866&fromLon=-73.98133&fromStation=D15&accessible=true");
  await expect(page.getByRole("combobox", { name: "Where from?" })).toHaveValue("Rockefeller Center");
  await expect(page.getByRole("checkbox", { name: "Step-free routes only" })).toBeChecked();
});

for (const width of [375, 393, 430, 768, 1280]) {
  test(`Plan has no blocking horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/routes");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });
}
