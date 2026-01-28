import { chromium, Browser, Page } from 'playwright';
import * as readline from 'node:readline';

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
 * Waits for Enter keypress using Node.js readline
 * Prompts user with the given message and blocks until Enter is pressed
 */
async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Launches a visible Chromium browser, navigates to HCMUT LMS login page,
 * and waits for user to complete login by pressing Enter
 *
 * @returns Object with browser and page instances for use in other modules
 */
export async function launchBrowser(): Promise<{ browser: Browser; page: Page }> {
  // Launch browser in headed mode (visible window)
  const browser = await chromium.launch({
    headless: false,
  });

  browserRef = browser;

  // Create a new page
  const page = await browser.newPage();

  // Navigate to HCMUT LMS login page
  await page.goto('https://lms.hcmut.edu.vn/');

  // Display console message
  console.log('Please login to LMS. Press Enter when done...');

  // Wait for user to press Enter
  await waitForEnter('');

  // Return browser and page objects for use in other modules
  return { browser, page };
}
