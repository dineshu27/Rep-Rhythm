import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('basic assistant is ready without keys; examples require review before saving', async ({ page }) => {
  await page.goto('/assistant');
  await expect(page.getByLabel('Chat provider', { exact: true })).toHaveValue('basic');
  await expect(page.getByText('Basic helper ready', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Try example (no AI call)' }).click();
  const draft = page.getByRole('region', { name: 'Review draft' });
  await expect(draft).toContainText('Example only');
  await expect(draft).toContainText('145.5 kcal');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fittrack-workspace-v1') || '{"logs":[]}').logs.length)).toBe(0);
  await draft.getByLabel('Grams for banana raw', { exact: true }).fill('');
  await draft.getByRole('button', { name: 'Save reviewed foods to diary' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('enter grams');
  await draft.getByLabel('Grams for banana raw', { exact: true }).fill('200');
  await draft.getByRole('button', { name: 'Save reviewed foods to diary' }).click();
  await expect(page.getByText('Reviewed foods saved to your diary.')).toBeVisible();
  await page.goto('/food'); await expect(page.locator('.day-toolbar')).toContainText('194 kcal');
});
test('workout suggestions replace a selected plan only after confirmation', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept()); await page.goto('/assistant?mode=workout');
  await page.getByRole('button', { name: 'Try example (no AI call)' }).click();
  await page.getByRole('button', { name: 'Save reviewed exercises to plan' }).click();
  await expect(page.getByText('Reviewed exercises saved to your plan.')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('fittrack-workouts-v1')));
  expect(state.plans[0].exercises).toHaveLength(3); expect(state.plans[1].exercises).toHaveLength(5); expect(state.history).toHaveLength(0);
});
test('meal ideas save as planned meals and examples are accessible', async ({ page }) => {
  await page.goto('/assistant?mode=meals'); await page.getByRole('button', { name: 'Try example (no AI call)' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Save reviewed meal to planner' }).click();
  await expect(page.getByText('Reviewed meal saved to your planner. Nothing was logged as eaten.')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('fittrack-workspace-v1'))); expect(state.meals).toHaveLength(1); expect(state.logs).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('weekly review exposes precisely the summary to share', async ({ page }) => { await page.goto('/assistant?mode=review'); await page.getByText('Review the summary that will be shared').click(); await expect(page.getByText('No food entries.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Try example (no AI call)' }).click(); await expect(page.getByRole('region', { name: 'Review draft' })).toContainText('has not analysed your records'); });
test('disabled API refuses real generation and rejects foreign origins', async ({ request, baseURL }) => { expect((await request.post('/api/ai', { headers: { origin: baseURL }, data: { mode: 'food', description: 'banana', consent: true, facts: [] } })).status()).toBe(503); expect((await request.post('/api/ai', { headers: { origin: 'https://other.example' }, data: {} })).status()).toBe(403); });
test('live workflow shares only consented text and leaves missing grams for review', async ({ page }) => {
  let submitted = null;
  await page.route('**/api/ai', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ready: true, reason: 'Test AI available' } });
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { message: 'Please weigh your portion.', foods: [{ query: 'banana', grams: null, note: 'No weight supplied.' }], exercises: [], tips: [], matches: [[]] } });
  });
  await page.goto('/assistant'); await page.getByLabel('Your request', { exact: true }).fill('I ate a banana');
  const generate = page.getByRole('button', { name: 'Send message', exact: true }); await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Send this request', exact: false }).check(); await generate.click();
  await expect(page.getByRole('log', { name: 'Assistant conversation' })).toContainText('Please weigh your portion.');
  expect(submitted).toEqual({ mode: 'food', description: 'I ate a banana', consent: true, facts: [] });
  await expect(page.getByLabel('Grams for banana', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Save reviewed foods to diary' }).click(); await expect(page.getByRole('main').getByRole('alert')).toContainText('Choose a matching food');
  expect(await page.evaluate(() => localStorage.getItem('fittrack-workspace-v1'))).toBeNull();
});
