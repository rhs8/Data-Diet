import { test, expect } from '@playwright/test';

test.describe('Data & Diet', () => {
  test('loads with title, header brand, and primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Data & Diet/i);
    await expect(page.getByRole('banner')).toContainText('Data');
    await expect(page.getByRole('button', { name: /Breakdown/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /3D Landscape/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Footprint/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /logbook/i })).toBeVisible();
  });

  test('Breakdown view is active by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#v1.view-panel.active')).toBeVisible();
    await expect(page.locator('button.nav-btn.active[data-view="v1"]')).toBeVisible();
  });

  test('switches to 3D Landscape view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /3D Landscape/i }).click();
    await expect(page.locator('#v2.view-panel.active')).toBeVisible();
    await expect(page.locator('#v1.view-panel.active')).toHaveCount(0);
  });

  test('switches to Footprint view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Footprint$/i }).click();
    await expect(page.locator('#v3.view-panel.active')).toBeVisible();
  });

  test('switches to My logbook view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /logbook/i }).click();
    await expect(page.locator('#v4.view-panel.active')).toBeVisible();
    await expect(page.locator('#account-mount')).toBeVisible();
  });

  test('renders food list with default selections', async ({ page }) => {
    await page.goto('/');
    const foodList = page.locator('#food-list');
    await expect(foodList.locator('.food-item').first()).toBeVisible();
    const active = await foodList.locator('.food-item.active').count();
    expect(active).toBeGreaterThanOrEqual(3);
    await expect(page.locator('#fi-beef-beef-herd.active')).toBeVisible();
  });

  test('Select all adds many foods to selection', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('#food-list .food-item.active').count();
    await page.locator('#food-bulk-all').click();
    const after = await page.locator('#food-list .food-item.active').count();
    expect(after).toBeGreaterThan(before);
  });

  test('Deselect all clears selected-food rows', async ({ page }) => {
    await page.goto('/');
    await page.locator('#food-bulk-none').click();
    await expect(page.locator('.sidebar-selected-empty')).toContainText(/No foods selected/i);
  });

  test('parallel sets SVG renders in Breakdown', async ({ page }) => {
    await page.goto('/');
    const svg = page.locator('#stacked-svg');
    await expect(svg).toBeVisible();
    await expect(svg.locator('path, line, rect').first()).toBeAttached({ timeout: 15_000 });
  });

  test('impact type filters are present and toggleable', async ({ page }) => {
    await page.goto('/');
    const filters = page.locator('#metric-filters .food-item');
    await expect(filters.first()).toBeVisible();
    const firstKey = await filters.first().getAttribute('id');
    expect(firstKey).toMatch(/^mf-/);
    await filters.first().click();
    await expect(page.locator(`#${firstKey}`)).not.toHaveClass(/active/);
    await filters.first().click();
    await expect(page.locator(`#${firstKey}`)).toHaveClass(/active/);
  });
});
