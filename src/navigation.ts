import { Page } from 'playwright';
import * as readline from 'node:readline';
import { existsSync } from 'fs';
import { printWarning, printError, printSuccess } from './utils.js';
import { isValidQuizUrl, isValidReviewUrl, sanitizeInput } from './validation.js';
import { listReviewFiles } from './review-export.js';
import type { AppMode } from './types.js';

/**
 * Waits for user to input a quiz URL via readline
 * Uses same pattern as browser.ts for consistency
 *
 * @returns The quiz URL entered by the user
 * @throws Error if URL format is invalid
 */
export async function promptForQuizUrl(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('📋 Enter quiz URL: ', (answer) => {
      rl.close();
      
      const sanitized = sanitizeInput(answer);
      
      if (!isValidQuizUrl(sanitized)) {
        reject(new Error(
          'Invalid URL. Expected format: /mod/quiz/attempt.php?attempt=123\n' +
          'Please navigate to an active quiz attempt and try again.'
        ));
      }
      
      resolve(sanitized);
    });
  });
}

/**
 * Validates that a URL is a Moodle quiz attempt page
 * Uses the validation module's isValidQuizUrl function for consistency
 *
 * @param url - The URL to validate
 * @returns true if URL matches quiz attempt pattern, false otherwise
 */
export function isQuizAttemptPage(url: string): boolean {
  return isValidQuizUrl(url);
}

/**
 * Finds the Next button element on the quiz page
 * Uses an ordered priority list of selectors to handle different Moodle versions
 *
 * Priority order:
 * 1. Moodle 4.x navigation button
 * 2. Moodle 3.x navigation link
 * 3. Generic "Next page" input
 * 4. Generic button with "Next" text
 *
 * @param page - Playwright page object
 * @returns ElementHandle of the Next button, or null if not found
 */
export async function findNextButton(page: Page) {
  const NEXT_PAGE_SELECTORS = [
    'input[name="next"][type="submit"]', // Priority 1: Moodle 4.x
    'a.mod_quiz-next-nav',               // Priority 2: Moodle 3.x
    'input[value="Next page"]',          // Priority 3: Generic
    'button:has-text("Next")',           // Priority 4: Button fallback
  ];

  for (const selector of NEXT_PAGE_SELECTORS) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        return element;
      }
    } catch (error) {
      // Selector might not be valid - continue to next
      continue;
    }
  }

  return null; // No next button = last page
}

/**
 * Navigates to the next quiz page by clicking the Next button
 * Implements wait strategy to ensure page transition completes
 *
 * Wait strategy:
 * 1. Wait for URL to change (navigation started)
 * 2. Wait for .que selector to appear (questions loaded)
 *
 * @param page - Playwright page object
 * @returns true if navigation succeeded, false if no Next button found
 */
export async function navigateToNextPage(page: Page): Promise<boolean> {
  const nextButton = await findNextButton(page);
  if (!nextButton) return false; // No more pages

  const currentUrl = page.url();

  // Click the Next button
  await nextButton.click();

  // Wait for navigation to complete
  try {
    await page.waitForURL((url) => url.href !== currentUrl, { timeout: 10000 });
  } catch (error) {
    printWarning('URL did not change after clicking Next');
    return false;
  }

  // Wait for question content to load
  try {
    await page.waitForSelector('.que', { timeout: 10000 });
  } catch (error) {
    printWarning('Questions did not load after Next click');
    return false;
  }

  return true;
}

/**
 * Tracks processed pages to prevent infinite loops
 * Uses URL as the unique page identifier
 */
export class PageTracker {
  private processedPages: Set<string> = new Set();

  /**
   * Gets the unique identifier for the current page
   * Uses the full URL with query parameters for uniqueness
   *
   * @param page - Playwright page object
   * @returns The page URL as identifier
   */
  private getPageIdentifier(page: Page): string {
    return page.url();
  }

  /**
   * Checks if a page has already been processed
   * Returns true if the page URL has been seen before
   *
   * @param page - Playwright page object
   * @returns true if page already processed, false otherwise
   */
  hasProcessed(page: Page): boolean {
    return this.processedPages.has(this.getPageIdentifier(page));
  }

  /**
   * Marks a page as processed
   * Adds the page URL to the tracking set
   *
   * @param page - Playwright page object
   */
   markAsProcessed(page: Page): void {
     this.processedPages.add(this.getPageIdentifier(page));
   }

   /**
    * Gets the count of processed pages
    * Useful for debugging and logging
    *
    * @returns Number of unique pages processed
    */
   getProcessedCount(): number {
     return this.processedPages.size;
   }
}

/**
 * Interactive menu: "Select mode: 1) solve 2) review 3) auto"
 * Default is 'solve' (if user just presses Enter)
 * Validates input is 1, 2, 3 or name string
 * Returns 'solve' | 'review' | 'auto'
 */
export async function promptForMode(): Promise<AppMode> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const ask = () => {
      rl.question('Select mode: 1) solve 2) review 3) auto (default: solve): ', (answer) => {
        const trimmed = answer.trim().toLowerCase();
        
        // Default to solve if empty input
        if (trimmed === '') {
          rl.close();
          resolve('solve');
          return;
        }
        
        // Map numeric choices to mode strings
        if (trimmed === '1') {
          rl.close();
          resolve('solve');
          return;
        }
        
        if (trimmed === '2') {
          rl.close();
          resolve('review');
          return;
        }
        
        if (trimmed === '3') {
          rl.close();
          resolve('auto');
          return;
        }
        
        // Accept string names
        if (trimmed === 'solve' || trimmed === 'review' || trimmed === 'auto') {
          rl.close();
          resolve(trimmed as AppMode);
          return;
        }
        
        // Invalid input, ask again
        console.log('Invalid choice. Please enter 1, 2, 3, or mode name.');
        ask();
      });
    };
    
    ask();
  });
}

/**
 * Prompt: "Enter review page URL: "
 * Validate using isValidReviewUrl()
 * Loop until valid URL provided
 * Return URL
 */
export async function promptForReviewUrl(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    const ask = () => {
      rl.question('Enter review page URL: ', (answer) => {
        const sanitized = sanitizeInput(answer);
        
        if (isValidReviewUrl(sanitized)) {
          rl.close();
          resolve(sanitized);
          return;
        }
        
        console.log('Invalid review URL. Expected format: /mod/quiz/review.php?attempt=123');
        ask();
      });
    };
    
    ask();
  });
}

/**
 * Prompt: "Enter path to answer file (or leave blank to select from recent): "
 * If user provides path: validate file exists, return it
 * If user leaves blank: list recent files in ./quiz-answers/ (use listReviewFiles() from review-export.ts)
 * User selects from list (1, 2, 3, ...)
 * Return full filepath
 */
export async function promptForAnswerFile(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter path to answer file (or leave blank to select from recent): ', (answer) => {
      rl.close();
      
      const trimmed = answer.trim();
      
      // If user provided a path, validate it exists
      if (trimmed !== '') {
        if (existsSync(trimmed)) {
          resolve(trimmed);
        } else {
          reject(new Error(`File not found: ${trimmed}`));
        }
        return;
      }
      
      // User left blank, show recent files
      const recentFiles = listReviewFiles('./quiz-answers');
      
      if (recentFiles.length === 0) {
        reject(new Error('No answer files found in ./quiz-answers/'));
        return;
      }
      
      console.log('\nRecent answer files:');
      recentFiles.forEach((file, index) => {
        console.log(`${index + 1}) ${file}`);
      });
      
      // Ask user to select from the list
      const selectionRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      selectionRl.question('Select file number: ', (selectionAnswer) => {
        selectionRl.close();
        
        const selection = parseInt(selectionAnswer.trim(), 10);
        
        if (!isNaN(selection) && selection >= 1 && selection <= recentFiles.length) {
          resolve(recentFiles[selection - 1]);
        } else {
          reject(new Error('Invalid selection'));
        }
      });
     });
   });
}
