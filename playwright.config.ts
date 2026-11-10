import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1500, height: 900 },
    // optional: reuse an already-installed Chromium (set PW_CHROMIUM=path/to/chrome.exe); otherwise run `npx playwright install chromium`
    // (the browser build is tied to the Playwright version: run it again after upgrading @playwright/test)
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    // A server left running on this port would serve OLD code and make the tests pass/fail for the wrong reason, so by default the
    // run stops with an error instead. Set PW_REUSE_SERVER=1 to deliberately test against a server you started yourself.
    reuseExistingServer: !!process.env.PW_REUSE_SERVER,
    timeout: 120000,
  },
});
