import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function search(page, query) {
  const region = page.getByRole('region', { name: 'Food search', exact: true });
  await region.getByLabel('Search foods', { exact: true }).fill(query);
  await region.getByRole('button', { name: 'Search foods', exact: true }).click();
  await expect(region.getByRole('status', { name: 'Food search status', exact: true })).toContainText('matches for');
  return region;
}

test('search finds new foods and dishes, then logs their gram-based nutrition', async ({ page }) => {
  await page.goto('/food');
  const region = await search(page, 'bananas raw');
  const banana = region.locator('[data-food-id="usda-173944"]');
  await expect(banana).toContainText('Bananas, raw');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await banana.getByRole('button', { name: 'Add and log food', exact: true }).click();
  const entry = page.getByRole('form', { name: 'Food entry', exact: true });
  await expect(entry.getByLabel('Food', { exact: true })).toHaveValue('usda-173944');
  await entry.getByLabel('Portion (g)', { exact: true }).fill('150');
  await expect(page.getByRole('status', { name: 'Calculated portion nutrition', exact: true })).toContainText('133.5 kcal');
  await entry.getByRole('button', { name: 'Log food', exact: true }).click();
  await expect(page.locator('.feature-totals')).toContainText('133.5 kcal');
  await search(page, 'biryani chicken');
  await expect(region.locator('.food-search-results')).toContainText('Biryani with chicken');
  await page.reload();
  await expect(page.locator('.feature-totals')).toContainText('133.5 kcal');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('pagination and repeated selection preserve edited saved food values', async ({ page }) => {
  await page.goto('/food');
  const region = await search(page, 'rice');
  const firstId = await region.locator('[data-food-id]').first().getAttribute('data-food-id');
  await region.getByRole('button', { name: 'Next results', exact: true }).click();
  await expect(region.getByRole('status', { name: 'Food search status', exact: true })).toContainText('Showing 21–');
  expect(await region.locator('[data-food-id]').first().getAttribute('data-food-id')).not.toBe(firstId);
  await search(page, 'rice white long grain regular enriched cooked');
  const rice = region.locator('[data-food-id="usda-168878"]');
  await rice.getByRole('button', { name: 'Add and log food', exact: true }).click();
  await page.getByRole('button', { name: 'Edit food', exact: true }).click();
  const edit = page.getByRole('form', { name: 'Edit food', exact: true });
  await edit.getByLabel('Energy (kcal) per 100 g', { exact: true }).fill('200');
  await edit.getByRole('button', { name: 'Save food', exact: true }).click();
  // Switch away in the entry form, then select the same search result again.
  await page.getByLabel('Starter food', { exact: true }).selectOption('usda-171077');
  await page.getByRole('button', { name: 'Add selected starter food', exact: true }).click();
  const entry = page.getByRole('form', { name: 'Food entry', exact: true });
  await entry.getByLabel('Food', { exact: true }).selectOption('usda-171077');
  await search(page, 'rice white long grain regular enriched cooked');
  await rice.getByRole('button', { name: 'Use saved food', exact: true }).click();
  await expect(entry.getByLabel('Food', { exact: true })).toHaveValue('usda-168878');
  await entry.getByLabel('Portion (g)', { exact: true }).fill('150');
  await expect(page.getByRole('status', { name: 'Calculated portion nutrition', exact: true })).toContainText('300 kcal');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fittrack-workspace-v1')).foods.length)).toBe(2);
});

test('failed search keeps saved-food tracking available and can be retried', async ({ page }) => {
  await page.goto('/food');
  await page.getByLabel('Starter food', { exact: true }).selectOption('usda-168878');
  await page.getByRole('button', { name: 'Add selected starter food', exact: true }).click();
  await page.route('**/api/foods/search?*', route => route.abort('internetdisconnected'));
  const region = page.getByRole('region', { name: 'Food search', exact: true });
  await region.getByLabel('Search foods', { exact: true }).fill('banana');
  await region.getByRole('button', { name: 'Search foods', exact: true }).click();
  await expect(region.getByRole('alert')).toContainText('saved foods are still available');
  await expect(region.getByRole('button', { name: 'Search foods', exact: true })).toBeEnabled();
  await page.getByRole('form', { name: 'Food entry', exact: true }).getByRole('button', { name: 'Log food', exact: true }).click();
  await expect(page.locator('.feature-totals')).toContainText('130 kcal');
  await page.unroute('**/api/foods/search?*');
  await search(page, 'banana');
  await expect(region.locator('[data-food-id]').first()).toBeVisible();
});

test('food search API returns bounded results and rejects malformed requests', async ({ request }) => {
  const response = await request.get('/api/foods/search?q=banana');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.catalogueSize).toBeGreaterThan(13000); expect(data.foods.length).toBeLessThanOrEqual(20);
  for (const query of ['q=a', 'q=rice&page=0', 'q=rice&page=NaN', 'q=' + 'a'.repeat(101)]) expect((await request.get('/api/foods/search?' + query)).status()).toBe(400);
  const missing = await request.get('/api/foods/search?q=zzzznonexistentfoodzzzz');
  expect((await missing.json()).foods).toEqual([]);
});
