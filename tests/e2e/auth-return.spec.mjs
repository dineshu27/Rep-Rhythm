import { test, expect } from '@playwright/test';
test('email fragment return becomes a server session and offers Watch setup', async ({ page }) => {
 let signedIn = false; let completed = 0;
 await page.route('**/api/auth', route => route.fulfill({ json: { configured: true, email: signedIn ? 'test@example.test' : null } }));
 await page.route('**/api/auth/complete', async route => { completed++; expect(new URL(page.url()).hash).toBe(''); expect(route.request().postDataJSON()).toEqual({ access_token: 'fake-access', refresh_token: 'fake-refresh' }); signedIn = true; await route.fulfill({ json: { signedIn: true } }); });
 await page.goto('/auth#access_token=fake-access&refresh_token=fake-refresh&type=magiclink');
 await expect(page.getByRole('heading', { name: 'Signed in as test@example.test' })).toBeVisible();
 await expect(page.getByRole('link', { name: 'Connect Apple Watch & steps →' })).toBeVisible();
 expect(completed).toBe(1); expect(new URL(page.url()).hash).toBe('');
 expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fake-access');
});
test('default site URL also consumes an email session return', async ({ page }) => {
 await page.route('**/api/auth', route => route.fulfill({ json: { configured: true, email: 'test@example.test' } }));
 await page.route('**/api/auth/complete', route => route.fulfill({ json: { signedIn: true } }));
 await page.goto('/#access_token=fake-access&refresh_token=fake-refresh');
 await expect(page).toHaveURL(/auth\?connected=1$/);
 await expect(page.getByRole('heading', { name: 'Signed in as test@example.test' })).toBeVisible();
});
test('failed email return displays recovery instructions and removes tokens', async ({ page }) => {
 await page.route('**/api/auth', route => route.fulfill({ json: { configured: true, email: null } }));
 await page.route('**/api/auth/complete', route => route.fulfill({ status: 401, json: { error: 'expired' } }));
 await page.goto('/auth#access_token=fake-access&refresh_token=fake-refresh');
 await expect(page.locator('p[role="status"]')).toContainText('It may have expired');
 expect(new URL(page.url()).hash).toBe('');
});
test('rejected magic link shows a visible error instead of an unexplained email form', async ({ page }) => {
 await page.route('**/api/auth', route => route.fulfill({ json: { configured: true, email: null } }));
 await page.goto('/auth?error=callback#error=access_denied&error_code=otp_expired&error_description=private-value');
 await expect(page.locator('p[role="status"]')).toContainText('Request a new link below');
 expect(page.url()).not.toContain('private-value');
});
