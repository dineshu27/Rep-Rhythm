import { test, expect } from '@playwright/test';

test('edit a plan, log and amend sets, resume, finish, and restore a backup', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/workouts');
  const plan = page.locator('.workout-plan-grid > section').nth(1);
  await plan.getByText('Edit plan', { exact: true }).click();
  await plan.getByLabel('Plan name', { exact: true }).fill('My lower day');
  const firstExercise = plan.locator('fieldset').first();
  await firstExercise.getByLabel('Exercise name', { exact: true }).fill('Front squat');
  await plan.getByRole('button', { name: 'Save plan', exact: true }).click();
  await expect(plan.getByRole('heading', { name: 'My lower day', exact: true })).toBeVisible();
  await plan.getByRole('button', { name: 'Start My lower day', exact: false }).click();
  await expect(page).toHaveURL(/\/workouts\/active$/);
  const logger = page.getByRole('form', { name: 'Log set for Front squat', exact: true });
  await logger.getByLabel('Front squat reps', { exact: true }).fill('10');
  await logger.getByLabel('Front squat weight in kg', { exact: true }).fill('20');
  await logger.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(page.getByText('1 / 14 planned sets', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toContainText('Take a breath.');
  await logger.getByLabel('Front squat reps', { exact: true }).fill('12');
  await logger.getByLabel('Front squat weight in kg', { exact: true }).fill('25');
  await logger.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByRole('button', { name: 'Edit set 1 of Front squat', exact: true }).click();
  const editor = page.getByRole('form', { name: 'Edit set for Front squat', exact: true });
  await editor.getByLabel('Front squat reps', { exact: true }).fill('11');
  await editor.getByRole('button', { name: 'Save set changes', exact: true }).click();
  await page.reload();
  await expect(page.getByText('2 / 14 planned sets', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toContainText('Take a breath.');
  await page.getByRole('button', { name: 'Skip rest', exact: true }).click();
  await page.getByRole('link', { name: 'Back to planner', exact: true }).click();
  await page.getByRole('link', { name: 'Resume workout', exact: false }).click();
  const plank = page.getByRole('form', { name: 'Log set for Plank', exact: true });
  await plank.getByLabel('Plank seconds', { exact: true }).fill('35');
  await plank.getByRole('button', { name: 'Log set', exact: true }).click();
  await page.getByLabel('Session notes', { exact: true }).fill('Solid session. Easy walk afterwards.');
  await page.getByRole('button', { name: 'Finish workout', exact: false }).click();
  await expect(page).toHaveURL(/\/workouts#workout-history$/);
  const history = page.locator('#workout-history');
  await expect(history).toContainText('3 sets · 520 kg rep volume');
  await history.locator('summary').click();
  await expect(history.getByLabel('Session notes', { exact: true })).toHaveValue('Solid session. Easy walk afterwards.');
  await history.getByRole('button', { name: 'Edit set 1 of Front squat', exact: true }).click();
  await history.getByRole('form', { name: 'Edit set for Front squat', exact: true }).getByLabel('Front squat reps', { exact: true }).fill('12');
  await history.getByRole('button', { name: 'Save set changes', exact: true }).click();
  await expect(history).toContainText('3 sets · 540 kg rep volume');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workout backup', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString()).history).toHaveLength(1);
  await history.getByRole('button', { name: 'Delete session', exact: false }).click();
  await expect(history).toContainText('0 completed');
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await expect(history).toContainText('3 sets · 540 kg rep volume');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('timed holds and rest expiry use elapsed time', async ({ page }) => {
  await page.clock.install();
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Start Lower A', exact: false }).click();
  const plank = page.getByRole('form', { name: 'Log set for Plank', exact: true });
  await plank.getByRole('button', { name: 'Start hold timer', exact: false }).click();
  await page.clock.fastForward(3500);
  await plank.getByRole('button', { name: 'Stop hold', exact: false }).click();
  await expect(plank.getByLabel('Plank seconds', { exact: true })).toHaveValue('3');
  await plank.getByRole('button', { name: 'Log set', exact: true }).click();
  const rest = page.getByRole('region', { name: 'Rest timer' });
  await expect(rest).toContainText('Take a breath.');
  await page.clock.fastForward(91000);
  await expect(rest).toContainText('Rest complete');
  await expect(rest).toContainText('0:00');
});

test('corrupt storage is preserved and invalid imports cannot replace data', async ({ page }) => {
  await page.goto('/workouts');
  await page.evaluate(() => localStorage.setItem('fittrack-workouts-v1', '{broken-json'));
  await page.reload();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export recovery copy', exact: true })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Invalid workout backup');
  expect(await page.evaluate(() => localStorage.getItem('fittrack-workouts-v1'))).toBe('{broken-json');
});

test('blocked storage never reports a logged set as saved', async ({ page }) => {
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Start Upper A', exact: false }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  const logger = page.getByRole('form', { name: 'Log set for Dumbbell bench press', exact: true });
  await logger.getByLabel('Dumbbell bench press reps', { exact: true }).fill('10');
  await logger.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Could not save');
  await expect(page.getByText('0 / 18 planned sets', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 / 18 planned sets', { exact: false })).toBeVisible();
});


test('workout changes synchronize between open tabs', async ({ page, context, isMobile }) => {
  await page.goto('/workouts');
  const second = await context.newPage();
  await second.goto('/workouts');
  await page.getByRole('button', { name: 'Start Upper A', exact: false }).click();
  await second.getByRole('link', { name: 'Resume workout', exact: false }).click();
  const firstLogger = page.getByRole('form', { name: 'Log set for Dumbbell bench press', exact: true });
  await firstLogger.getByLabel('Dumbbell bench press reps', { exact: true }).fill('10');
  await firstLogger.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(second.getByText('1 / 18 planned sets', { exact: false })).toBeVisible();
  const secondLogger = second.getByRole('form', { name: 'Log set for Dumbbell bench press', exact: true });
  await secondLogger.getByLabel('Dumbbell bench press reps', { exact: true }).fill('12');
  await secondLogger.getByRole('button', { name: 'Log set', exact: true }).click();
  await expect(page.getByText('2 / 18 planned sets', { exact: false })).toBeVisible();
  const nav = page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation', exact: true });
  await nav.getByRole('link', { name: 'Food diary', exact: true }).click();
  await expect(page).toHaveURL(/\/food$/);
  await secondLogger.getByLabel('Dumbbell bench press reps', { exact: true }).fill('8');
  await secondLogger.getByRole('button', { name: 'Log set', exact: true }).click();
  await nav.getByRole('link', { name: isMobile ? 'Workouts' : 'Workout planner', exact: true }).click();
  await page.getByRole('link', { name: 'Resume workout', exact: false }).click();
  await expect(page.getByText('3 / 18 planned sets', { exact: false })).toBeVisible();
  await second.close();
});


test('rescheduling Monday to Tuesday updates the saved header, coverage, other tabs and reloads', async ({page, context}) => {
 await page.goto('/workouts');
 const other = await context.newPage(); await other.goto('/workouts');
 const card = page.locator('.workout-plan-card').first();
 await expect(card.locator('.workout-card-heading')).toHaveText('Monday');
 await card.getByText('Edit plan', {exact:true}).click();
 await card.getByLabel('Training day', {exact:true}).selectOption('Tuesday');
 await card.getByRole('button', {name:'Save plan',exact:true}).click();
 await expect(card.locator('.workout-card-heading')).toHaveText('Tuesday');
 await expect(card.getByRole('status')).toContainText('Plan saved for Tuesday');
 await expect(card.locator('details')).not.toHaveAttribute('open');
 await expect(page.getByLabel('Chest, Monday: not planned',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Chest, Tuesday: planned',{exact:true})).toBeVisible();
 await expect(other.locator('.workout-plan-card').first().locator('.workout-card-heading')).toHaveText('Tuesday');
 await page.reload();
 await expect(card.locator('.workout-card-heading')).toHaveText('Tuesday');
 await card.getByText('Edit plan',{exact:true}).click();
 await expect(card.getByLabel('Training day',{exact:true})).toHaveValue('Tuesday');
 await other.close();
});
