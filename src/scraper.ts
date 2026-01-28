import type { Page } from 'playwright';

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
 */
export async function scrapeQuestions(page: Page): Promise<ScrapedQuestion[]> {
  // Extract raw question data from the DOM
  const rawQuestions = await page.evaluate(() => {
    // Helper: Extract question ID from container
    function getQuestionId(container: Element): string {
      const id = container.id; // e.g., "question-12345-67890"
      if (id && id.startsWith('question-')) {
        return id; // Use full ID for uniqueness
      }
      // Fallback: generate from index
      const index = Array.from(document.querySelectorAll('.que')).indexOf(container);
      return `que-index-${index}`;
    }

    // Helper: Check if question is multi-select (skip these)
    function isMultiSelect(container: Element): boolean {
      return container.classList.contains('multianswer') ||
             container.querySelector('input[type="checkbox"]') !== null;
    }

    const questionContainers = Array.from(
      document.querySelectorAll('.que.multichoice')
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
      
      // Extract question text
      const qtextElement = container.querySelector('.qtext');
      const questionText = qtextElement?.textContent?.trim() || '';

      // Check for images in question
      const hasImage = qtextElement?.querySelector('img') !== null;

      // Extract option texts
      const labels = Array.from(container.querySelectorAll('.answer label'));
      const optionTexts = labels.map(label => label.textContent?.trim() || '');

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
          console.warn(
            `⚠️ Q${raw.index + 1}, Option ${label}: Could not build stable selector`
          );
          selector = ''; // Mark as invalid
        }
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
        console.warn(
          `⚠️ Q${raw.index + 1}: Failed to capture screenshot - ${error}`
        );
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
