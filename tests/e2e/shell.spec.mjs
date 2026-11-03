import { test, expect } from '@playwright/test';
test('dashboard, navigation, and responsive layout', async ({page,isMobile}) => {
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Your space to make progress.'})).toBeVisible();
  const nav = page.getByRole('navigation',{name:isMobile?'Mobile navigation':'Main navigation',exact:true});
  await nav.getByRole('link',{name:'Food diary',exact:true}).click();
  await expect(page).toHaveURL(/\/food$/);
  await expect(page.getByRole('heading',{name:'Food diary',exact:true})).toBeVisible();
  await expect(nav.getByRole('link',{name:'Food diary',exact:true})).toHaveAttribute('aria-current','page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Food diary',exact:true})).toBeVisible();
});
test('theme choice survives a reload', async ({page}) => {
  await page.goto('/');
  const initial = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button',{name:'Toggle light and dark theme'}).click();
  const next = initial === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme',next);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme',next);
});
test('all routes render without pretending tracking is implemented', async ({page}) => {
  for (const route of ['/meals','/workouts','/workouts/active','/progress','/settings','/onboarding','/auth']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.goto('/food');
  await expect(page.getByText('Planned · Phase 3')).toBeVisible();
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading',{name:'Let’s get you back on track.'})).toBeVisible();
});
