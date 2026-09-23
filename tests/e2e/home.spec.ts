import { test, expect } from 'playwright/test';

async function usesMobileNavigation(page: import('playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Primary mobile navigation' }).isVisible();
}

async function openDestination(
  page: import('playwright/test').Page,
  label: string,
  path: string,
) {
  let destination: import('playwright/test').Locator;
  if (await usesMobileNavigation(page)) {
    if (label === 'Realtime') {
      destination = page.getByRole('link', { name: 'Map', exact: true });
    } else {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      destination = page.getByRole('navigation', { name: 'More destinations' })
        .getByRole('link', { name: label, exact: true });
    }
  } else {
    const primaryLabels = new Set(['Realtime', 'Station Board', 'Accessibility']);
    const navigation = page.getByRole('navigation', {
      name: primaryLabels.has(label) ? 'Primary' : 'Exploration & intelligence',
    });
    destination = navigation.getByRole('link', { name: label, exact: true });
  }

  await destination.click();
  await expect(page).toHaveURL(path, { timeout: 15_000 });
}

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/NYC Transit Hub/);
  });

  test('displays main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your next ride' })).toBeVisible();
  });

  test('prioritizes rider information before system intelligence', async ({ page }) => {
    const nearYou = page.getByRole('heading', { name: 'Near you' });
    const service = page.getByRole('heading', { name: 'Service on your routes' });
    const saved = page.getByRole('heading', { name: 'Saved transit' });
    const intelligence = page.getByRole('heading', { name: 'Transit intelligence' });

    await expect(nearYou).toBeVisible();
    await expect(page.getByRole('link', { name: /Where to/i })).toHaveAttribute('href', '/routes');
    await expect(service).toBeVisible();
    await expect(saved).toBeVisible();
    await expect(intelligence).toBeVisible();

    const nearBox = await nearYou.boundingBox();
    const intelligenceBox = await intelligence.boundingBox();
    expect(nearBox?.y).toBeLessThan(intelligenceBox?.y ?? Infinity);
  });

  test('displays responsive primary navigation', async ({ page }) => {
    if (await usesMobileNavigation(page)) {
      await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Map', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'More', exact: true })).toBeVisible();
      return;
    }

    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Realtime', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Station Board', exact: true })).toBeVisible();
  });

  test('navigates to station board page', async ({ page }) => {
    await openDestination(page, 'Station Board', '/board');
  });

  test('navigates to realtime page', async ({ page }) => {
    await openDestination(page, 'Realtime', '/realtime');
  });
});

test.describe('Navigation', () => {
  test('sidebar links work correctly', async ({ page }) => {
    await page.goto('/');

    const navLinks = [
      { name: 'Reliability', url: '/reliability' },
      { name: 'Accessibility', url: '/accessibility' },
      { name: 'Commute', url: '/commute' },
      { name: 'Crowding', url: '/crowding' },
      { name: 'Service Changes', url: '/incidents' },
    ];

    for (const link of navLinks) {
      await openDestination(page, link.name, link.url);
      await page.goto('/');
    }
  });
});

test.describe('Theme Toggle', () => {
  test('toggles between dark and light mode', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');

    // Find and click theme toggle
    const themeToggle = page.getByRole('button', { name: /switch to/i });
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const initialClass = await html.getAttribute('class');

    // Click toggle
    await themeToggle.click();

    // Wait for theme to change
    await page.waitForTimeout(500);

    // Check that class changed
    const newClass = await html.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });
});

test.describe('Responsive Design', () => {
  test('keeps the rider decision in the first mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Your next ride' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Where to/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Near you' })).toBeVisible();

    const intelligence = await page.getByRole('heading', { name: 'Transit intelligence' }).boundingBox();
    expect(intelligence?.y).toBeGreaterThan(844);
  });

  test('mobile more drawer works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const moreButton = page.getByRole('button', { name: 'More', exact: true });
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.getByRole('navigation', { name: 'More destinations' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Station Board', exact: true })).toBeVisible();
  });
});
