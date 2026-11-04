import { defineConfig, devices } from '@playwright/test';
const baseURL = 'http://127.0.0.1:3104';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION ? 'npm start -- --hostname 127.0.0.1 --port 3104' : 'npm run dev -- --hostname 127.0.0.1 --port 3104',
    url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120000,
  },
});
