import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('primary tracking and account pages pass automated WCAG checks', async ({ page }) => {
  for (const route of ['/food', '/meals', '/workouts', '/workouts/active', '/progress', '/settings', '/auth']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Wait for the browser store, not just the static loading shell.
    if (route === '/settings') { await page.getByText('Profile & nutrition targets',{exact:true}).click(); await page.getByLabel('Profile name',{exact:true}).waitFor(); }
    if (route === '/workouts') await page.getByRole('button', { name: 'Start Upper A', exact: false }).waitFor();
    if (route === '/food') await page.getByRole('region', { name: 'Quick food logging', exact: true }).waitFor();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations, `${route}: ${result.violations.map(item => item.id + ': ' + item.help).join(', ')}`).toEqual([]);
  }
});
