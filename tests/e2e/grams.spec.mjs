import { test, expect } from '@playwright/test';

test('grams immediately calculate all nutrients and preserve old fiber snapshots', async ({ page }) => {
  await page.goto('/food');
  await page.getByLabel('Search foods',{exact:true}).fill('rice white long grain regular enriched cooked');
  const row = page.locator('.quick-food-row[data-food-id="usda-168878"]');
  await row.getByRole('spinbutton').fill('150');
  await expect(row).toContainText('195 kcal');
  await expect(row).toContainText('P 4');
  await expect(row).toContainText('F 0.4');
  await expect(row).toContainText('C 42.3');
  await expect(row).toContainText('Fiber 0.6');
  await expect(page.locator('.diary-meals .diary-food-line')).toHaveCount(0);
  await row.getByRole('button',{name:'Add',exact:true}).click();
  await expect(page.locator('.day-toolbar')).toContainText('Fiber 0.6 g');
  await page.locator('.food-manager > summary').click();
  await page.getByRole('button',{name:'Edit food',exact:true}).click();
  const edit = page.getByRole('form',{name:'Edit food',exact:true});
  await edit.getByLabel('Fiber (g) per 100 g',{exact:true}).fill('3');
  await edit.getByRole('button',{name:'Save food',exact:true}).click();
  await expect(page.locator('.day-toolbar')).toContainText('Fiber 0.6 g');
  await page.reload();
  await expect(page.locator('.day-toolbar')).toContainText('195 kcal');
  // Simulate the previous release's records, which did not contain fiber at all.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('fittrack-workspace-v1'));
    for (const food of state.foods) delete food.per100g.fiber;
    for (const log of state.logs) delete log.food.per100g.fiber;
    localStorage.setItem('fittrack-workspace-v1', JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator('.day-toolbar')).toContainText('Fiber not recorded');
  await expect(page.locator('.day-toolbar')).toContainText('195 kcal');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('choose a predefined exercise and log completed reps and rounds', async ({ page }) => {
  await page.goto('/workouts');
  const plan = page.locator('.workout-plan-grid > section').first();
  await plan.getByText('Edit plan', { exact: true }).click();
  const first = plan.locator('fieldset').first();
  await first.getByLabel('Choose predefined exercise 1', { exact: true }).selectOption('incline-dumbbell-press');
  await expect(first.getByLabel('Exercise name', { exact: true })).toHaveValue('Incline dumbbell press');
  await first.getByLabel('Rounds (sets)', { exact: true }).fill('3');
  await first.getByLabel('Target reps / range', { exact: true }).fill('12');
  await plan.getByRole('button', { name: 'Save plan', exact: true }).click();
  await plan.getByRole('button', { name: 'Start Upper A', exact: false }).click();
  const log = page.getByRole('form', { name: 'Log set for Incline dumbbell press', exact: true });
  await log.getByLabel('Incline dumbbell press reps', { exact: true }).fill('12');
  await log.getByLabel('Incline dumbbell press weight in kg', { exact: true }).fill('20');
  await log.getByLabel('Incline dumbbell press completed rounds', { exact: true }).fill('3');
  await expect(log).toContainText('36 total reps · 720 kg rep volume');
  await log.getByRole('button', { name: 'Log 3 rounds', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Edit set 3 of Incline dumbbell press', exact: true })).toBeVisible();
  await expect(page.getByText('3 / 18 planned sets', { exact: false })).toContainText('720 kg rep volume');
  await page.reload();
  await expect(page.getByText('3 / 18 planned sets', { exact: false })).toContainText('720 kg rep volume');
});
