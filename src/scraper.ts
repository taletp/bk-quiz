import type { Page } from 'playwright';
import { printWarning, delay } from './utils.js';

/**
 * Represents a single answer option for a question.
 */
export interface Option {
  label: string;    // "A", "B", "C", etc. (assigned by DOM position)
  text: string;     // Option text content
  selector: string; // CSS selector: "#question-xxx .answer label:nth-child(N)"
}

/**
 * Represents a scraped Moodle quiz question with metadata.
 */
export interface ScrapedQuestion {
  index: number;        // 0-based index on current page
  questionId: string;   // Full Moodle ID: "question-{attemptId}-{questionId}"
  questionText: string;
  options: Option[];
  hasImage: boolean;
  imageBase64?: string; // Base64 PNG if hasImage
}

/**
 * Validates that a CSS selector exists on the page.
 */
async function validateSelector(page: Page, selector: string): Promise<boolean> {
  return page.$(selector).then(el => el !== null);
}

/**
 * Builds the primary CSS selector for an option.
 * Pattern: #question-xxx .answer label:nth-child(N)
 */
function buildOptionSelector(questionId: string, optionIndex: number): string {
  return `#${questionId} .answer label:nth-child(${optionIndex + 1})`;
}

/**
 * Builds fallback CSS selector using input radio buttons.
 * Pattern: #question-xxx input[type="radio"]:nth-of-type(N)
 */
function buildFallbackSelector(questionId: string, optionIndex: number): string {
  return `#${questionId} input[type="radio"]:nth-of-type(${optionIndex + 1})`;
}

/**
 * Captures a screenshot of the entire question container.
 * Returns base64-encoded PNG string.
 */
async function captureQuestionScreenshot(
  page: Page,
  questionId: string
): Promise<string> {
  const element = await page.$(`#${questionId}`);
  if (!element) {
    throw new Error(`Question container ${questionId} not found for screenshot`);
  }
  
  const screenshot = await element.screenshot({
    type: 'png',
  });
  
  return screenshot.toString('base64');
}

/**
 * Scrapes all single-choice MCQ questions from the current page.
 * Skips multi-select questions (checkboxes) and questions with <2 options.
 * Returns structured question data with stable CSS selectors.
 * 
 * @param page - Playwright page object
 * @returns Array of scraped questions (guaranteed to be an array)
 * @throws Error if page is not available
 */
export async function scrapeQuestions(page: Page): Promise<ScrapedQuestion[]> {
  // Ensure page is available before proceeding
  if (!page) {
    throw new Error('Page is not available');
  }
  // Extract raw question data from the DOM
  const rawQuestions = await page.evaluate(() => {
    // Helper: Auto-detect the correct question container selector
    function detectQuestionSelector(): { selector: string; count: number } {
      const selectors = [
        '.que.multichoice',           // Standard Moodle (classic theme)
        '.que[class*="multichoice"]', // With additional classes
        '.qtype_multichoice',         // Type-based selector
        '.que',                        // Fallback: any .que
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Verify this selector actually contains question content
          for (const el of Array.from(elements)) {
            if (el.querySelector('.qtext, .question-content, [id^="question-"]')) {
              return { selector, count: elements.length };
            }
          }
        }
      }
      
      // Last resort: Look for any element with question-like structure
      const lastResort = document.querySelectorAll('.que, .question, .qtype_multichoice, [id^="question-"]');
      return { selector: '.que, .question, .qtype_multichoice, [id^="question-"]', count: lastResort.length };
    }

    // Helper: Extract question ID from container
    function getQuestionId(container: Element): string {
      const id = container.id; // e.g., "question-12345-67890"
      if (id && id.startsWith('question-')) {
        return id; // Use full ID for uniqueness
      }
      // Fallback: generate from index
      const index = Array.from(document.querySelectorAll('.que, .question, [id^="question-"]')).indexOf(container);
      return `que-index-${index}`;
    }

    // Helper: Check if question is multi-select (skip these)
    function isMultiSelect(container: Element): boolean {
      return container.classList.contains('multianswer') ||
             container.querySelector('input[type="checkbox"]') !== null;
    }

    const { selector: detectedSelector, count: selectorCount } = detectQuestionSelector();
    const questionContainers = Array.from(
      document.querySelectorAll(detectedSelector)
    );

    const results: Array<{
      index: number;
      questionId: string;
      questionText: string;
      optionCount: number;
      optionTexts: string[];
      hasImage: boolean;
      skipped: boolean;
      skipReason?: string;
    }> = [];

    // Return detection info for logging
    (results as any).detectedSelector = detectedSelector;
    (results as any).selectorCount = selectorCount;

    questionContainers.forEach((container, index) => {
      // Skip multi-select questions
      if (isMultiSelect(container)) {
        console.warn(`⚠️ Q${index + 1}: Multi-select detected - skipping`);
        results.push({
          index,
          questionId: '',
          questionText: '',
          optionCount: 0,
          optionTexts: [],
          hasImage: false,
          skipped: true,
          skipReason: 'multi-select'
        });
        return;
      }

       const questionId = getQuestionId(container);
       
       // Extract question text - try multiple selectors
       let qtextElement = container.querySelector('.qtext') ||
                         container.querySelector('.question-content') ||
                         container.querySelector('[class*="text"]');
       
       const questionText = qtextElement?.textContent?.trim() || '';

       // Check for images in question
       const hasImage = (qtextElement?.querySelector('img') || container.querySelector('img')) !== null;

       // Extract option texts - try multiple selectors for options
       let labels = Array.from(container.querySelectorAll('.answer label'));
       
       // Fallback: look for labels in common answer containers
       if (labels.length === 0) {
         labels = Array.from(container.querySelectorAll('label[for*="answer"]'));
       }
       
       // Fallback: look for any label near radio buttons
       if (labels.length === 0) {
         const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
         labels = radios.map(radio => {
           const label = radio.parentElement?.querySelector('label');
           return label || radio.nextElementSibling;
         }).filter((el): el is Element => el !== null && el !== undefined);
       }
       
       const optionTexts = labels.map(label => {
         if (label instanceof HTMLElement) {
           return label.textContent?.trim() || '';
         }
         return '';
       });

      // Skip questions with less than 2 options
      if (optionTexts.length < 2) {
        console.warn(`⚠️ Q${index + 1}: Less than 2 options - skipping`);
        results.push({
          index,
          questionId,
          questionText,
          optionCount: optionTexts.length,
          optionTexts: [],
          hasImage,
          skipped: true,
          skipReason: 'insufficient-options'
        });
        return;
      }

      results.push({
        index,
        questionId,
        questionText,
        optionCount: optionTexts.length,
        optionTexts,
        hasImage,
        skipped: false
      });
    });

    return results;
  });

  // Process raw questions and build stable selectors
  const scrapedQuestions: ScrapedQuestion[] = [];

  // Log detection results for debugging
  const detectedSelector = (rawQuestions as any).detectedSelector;
  const selectorCount = (rawQuestions as any).selectorCount;
  if (detectedSelector && selectorCount === 0) {
    printWarning(`No questions found with selector: ${detectedSelector}`);
    printWarning(`This might mean the Moodle HTML structure is different than expected.`);
    printWarning(`Try running: bun diagnose-selectors.js to analyze the page structure.`);
  }

  for (const raw of rawQuestions) {
    // Skip questions marked for skipping
    if (raw.skipped) {
      continue;
    }

     // Build options with validated selectors
     const options: Option[] = [];
     for (let i = 0; i < raw.optionTexts.length; i++) {
       const label = String.fromCharCode(65 + i); // 0→A, 1→B, 2→C, etc.
       
       // Try primary selector first
       let selector = buildOptionSelector(raw.questionId, i);
       if (!await validateSelector(page, selector)) {
         // Try fallback selector
         selector = buildFallbackSelector(raw.questionId, i);
         if (!await validateSelector(page, selector)) {
           printWarning(`Q${raw.index + 1}, Option ${label}: Could not build stable selector`);
           selector = ''; // Mark as invalid
         }
       }
       
       // Validate selector before adding option
       if (!selector) {
         printWarning(`Q${raw.index + 1}: Could not build selector for option ${label}`);
         continue;
       }

       options.push({
         label,
         text: raw.optionTexts[i],
         selector
       });
     }

    // Capture screenshot if question contains images
    let imageBase64: string | undefined;
    if (raw.hasImage) {
      try {
        imageBase64 = await captureQuestionScreenshot(page, raw.questionId);
      } catch (error) {
        printWarning(`Q${raw.index + 1}: Failed to capture screenshot - ${error}`);
      }
    }

    scrapedQuestions.push({
      index: raw.index,
      questionId: raw.questionId,
      questionText: raw.questionText,
      options,
      hasImage: raw.hasImage,
      imageBase64
    });
  }

  return scrapedQuestions;
}
