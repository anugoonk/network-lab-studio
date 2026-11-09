import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1500, height: 900 },
    // optional: reuse an already-installed Chromium (set PW_CHROMIUM=path	o\chrome.exe); otherwise run `npx playwright install chromium`
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
