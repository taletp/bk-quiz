import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import { waitForEnter, printSuccess } from './utils.js';

// Global browser reference for SIGINT handler
let browserRef: Browser | null = null;

// Setup SIGINT handler for graceful cleanup
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupted.');
  if (browserRef) {
    await browserRef.close().catch(() => {});
  }
  process.exit(0);
});

/**
 * Launches a visible browser, prioritizing Edge on Windows for reliability
 * Falls back through: Chromium → Firefox → WebKit
 * Navigates to HCMUT LMS login page and waits for user to complete login
 *
 * @returns Object with browser and page instances for use in other modules
 */
export async function launchBrowser(): Promise<{ browser: Browser; page: Page }> {
  const isWindows = process.platform === 'win32';
  const browserAttempts: Array<{
    name: string;
    launcher: () => Promise<Browser>;
  }> = [];

  // On Windows, try Edge first (most reliable on Windows)
  if (isWindows) {
    browserAttempts.push(
      {
        name: 'Edge',
        launcher: () =>
          chromium.launch({
            channel: 'msedge',
            headless: false,
            timeout: 30000,
            args: [
              '--disable-web-resources',
              '--disable-component-update',
              '--disable-component-extensions-with-background-pages',
            ],
          }),
      },
      {
        name: 'Chromium',
        launcher: () =>
          chromium.launch({
            headless: false,
            timeout: 30000,
            args: [
              '--disable-web-resources',
              '--disable-component-update',
              '--single-process=false',
            ],
          }),
      },
      {
        name: 'Firefox',
        launcher: () =>
          firefox.launch({
            headless: false,
            timeout: 30000,
          }),
      }
    );
  } else {
    // On macOS/Linux, try Chromium first
    browserAttempts.push(
      {
        name: 'Chromium',
        launcher: () =>
          chromium.launch({
            headless: false,
            timeout: 30000,
          }),
      },
      {
        name: 'Firefox',
        launcher: () =>
          firefox.launch({
            headless: false,
            timeout: 30000,
          }),
      }
    );
  }

  let lastError: Error | null = null;

  // Try each browser in order
  for (const { name, launcher } of browserAttempts) {
    try {
      console.log(`🔍 Attempting to launch ${name}...`);
      const browser = await Promise.race([
        launcher(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} launch timeout after 30s`)), 35000)
        ),
      ]);

      browserRef = browser;
      const page = await browser.newPage();
      await page.goto('https://lms.hcmut.edu.vn/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      printSuccess(`Browser opened at LMS homepage (${name})`);
      console.log('👉 Please login manually, then press Enter when done.');
      await waitForEnter('');

      return { browser, page };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Browser launch failed');
      console.warn(`⚠️ ${name} launch failed: ${lastError.message}`);
    }
  }

  // All browsers failed
  console.error(
    `❌ Failed to launch any browser. Last error: ${lastError?.message || 'Unknown'}`
  );
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('');
  
  if (isWindows) {
    console.error('Windows-specific fixes (try in order):');
    console.error('');
    console.error('  1. Install/Update Edge Browser:');
    console.error('     Download from: https://www.microsoft.com/en-us/edge');
    console.error('     This tool prefers Edge on Windows for reliability');
    console.error('');
    console.error('  2. Reinstall Playwright browsers:');
    console.error('     bunx playwright install chromium firefox');
    console.error('');
    console.error('  3. Kill existing browser processes:');
    console.error('     Open Task Manager (Ctrl+Shift+Esc)');
    console.error('     Find and end: chrome.exe, msedge.exe, firefox.exe');
    console.error('');
    console.error('  4. Extend launch timeout via environment:');
    console.error('     set PLAYWRIGHT_LAUNCH_TIMEOUT=60000');
    console.error('     bun run start');
    console.error('');
    console.error('  5. Try running as Administrator:');
    console.error('     Right-click PowerShell → Run as Administrator');
    console.error('     cd path/to/bk-quiz');
    console.error('     bun run start');
    console.error('');
    console.error('  6. Check antivirus/firewall:');
    console.error('     Temporarily disable antivirus and retry');
    console.error('     Some antivirus blocks browser automation');
    console.error('');
  } else {
    console.error('macOS/Linux fixes (try in order):');
    console.error('');
    console.error('  1. Reinstall Playwright browsers:');
    console.error('     bunx playwright install chromium firefox');
    console.error('');
    console.error('  2. On Linux, install system dependencies:');
    console.error('     Ubuntu/Debian:');
    console.error('       sudo apt-get install -y libxss1 libappindicator1');
    console.error('');
    console.error('     Fedora/RHEL:');
    console.error('       sudo dnf install -y chromium');
    console.error('');
    console.error('  3. Kill existing browser processes:');
    console.error('     killall chrome chromium firefox');
    console.error('');
    console.error('  4. Check disk space:');
    console.error('     df -h  # Should have 500MB+ free');
    console.error('');
  }

  console.error('❓ Still not working?');
  console.error('   1. Check Node.js/Bun version: bun --version');
  console.error('   2. Verify internet connection');
  console.error('   3. Check OpenAI API key is valid');
  console.error('   4. Try with a fresh Bun cache: bun cache clean');

  process.exit(1);
}
