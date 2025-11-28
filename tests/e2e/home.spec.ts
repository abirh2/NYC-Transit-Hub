import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/NYC Transit Hub/);
  });

  test('displays main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'NYC Transit Hub' })).toBeVisible();
  });

  test('displays dashboard cards', async ({ page }) => {
    await expect(page.getByText('Your Station')).toBeVisible();
    await expect(page.getByText('Service Alerts')).toBeVisible();
    await expect(page.getByText('Live Tracker')).toBeVisible();
    await expect(page.getByText('Commute Assistant')).toBeVisible();
  });

  test('displays sidebar navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /realtime/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /station board/i })).toBeVisible();
  });

  test('navigates to station board page', async ({ page }) => {
    await page.getByRole('link', { name: /station board/i }).click();
    await expect(page).toHaveURL('/board');
  });

  test('navigates to realtime page', async ({ page }) => {
    await page.getByRole('link', { name: /realtime/i }).click();
    await expect(page).toHaveURL('/realtime');
  });
});

test.describe('Navigation', () => {
  test('sidebar links work correctly', async ({ page }) => {
    await page.goto('/');

    // Test each navigation link
    const navLinks = [
      { name: /reliability/i, url: '/reliability' },
      { name: /accessibility/i, url: '/accessibility' },
      { name: /commute/i, url: '/commute' },
      { name: /crowding/i, url: '/crowding' },
      { name: /incidents/i, url: '/incidents' },
    ];

    for (const link of navLinks) {
      await page.getByRole('link', { name: link.name }).click();
      await expect(page).toHaveURL(link.url);
      await page.goto('/'); // Go back to home
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
  test('mobile menu works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('aside');

    // Find and click hamburger menu
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    // Sidebar should now be visible
    await expect(sidebar).toBeVisible();
  });
});

