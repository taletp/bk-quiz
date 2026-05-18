import 'dotenv/config';
import { Browser } from 'playwright';
import { launchBrowser } from './browser.js';
import {
  promptForQuizUrl,
  promptForReviewUrl,
  promptForAnswerFile,
  isQuizAttemptPage,
  findNextButton,
  navigateToNextPage,
  PageTracker,
} from './navigation.js';
import { scrapeQuestions, ScrapedQuestion } from './scraper.js';
import {
  analyzeQuestion,
  validateApiKey,
  AnswerResult,
  getFailedQuestions,
  getProviderInfo,
} from './gpt-provider.js';
import { applyHighlights, HighlightData } from './overlay.js';
import {
  waitForEnter,
  createSeparator,
  formatText,
  printSection,
  printSuccess,
  printWarning,
  printError,
} from './utils.js';
import { exportAnswers, type ExportedAnswer } from './export-answers.js';
import { runReviewMode } from './mode-review.js';
import { runAutoMode } from './mode-auto.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_QUESTIONS = parseInt(process.env.MAX_QUESTIONS || '500', 10);

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseCliArgs(): { mode: 'solve' | 'review' | 'auto'; arg?: string } {
  const args = process.argv.slice(2);

  if (args.includes('--review') || args.includes('-r')) {
    const idx = args.findIndex((a) => a === '--review' || a === '-r');
    return { mode: 'review', arg: args[idx + 1] };
  }

  if (args.includes('--auto') || args.includes('-a')) {
    const idx = args.findIndex((a) => a === '--auto' || a === '-a');
    return { mode: 'auto', arg: args[idx + 1] };
  }

  return { mode: 'solve' };
}

// ============================================================================
// Utility Functions
// ============================================================================

async function exitWithError(browser: Browser, message: string): Promise<never> {
  printError(message);
  console.log('\n👉 Press Enter to close browser and exit.');
  await waitForEnter('');
  await browser.close();
  process.exit(1);
}

function printFormattedAnswer(
  question: ScrapedQuestion,
  result: AnswerResult | null,
  questionNumber: number
): void {
  console.log(createSeparator(80));
  console.log(`Question ${questionNumber}/${MAX_QUESTIONS}`);
  const questionText = formatText(question.questionText, 100);
  console.log(questionText);
  console.log('');
  console.log('Options:');
  question.options.forEach((opt) => {
    console.log(`  ${opt.label}. ${opt.text}`);
  });
  console.log('');
  if (result && result.suggestedAnswer !== 'UNKNOWN') {
    console.log(`🎯 Suggested Answer: ${result.suggestedAnswer}`);
    console.log(`📝 Explanation: ${result.explanation}`);
  } else {
    printWarning('Could not determine answer');
  }
  console.log(createSeparator(80));
  console.log('');
}

// ============================================================================
// Shared Flow Helpers
// ============================================================================

async function getQuizUrlInteractive(): Promise<string> {
  console.log('📋 Paste the quiz URL from your browser address bar.');
  console.log('   Example: https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345');
  return promptForQuizUrl();
}

async function navigateToQuizPage(
  page: any,
  url: string,
  browser: Browser
): Promise<void> {
  try {
    await page.goto(url);
    await page.waitForSelector('.que', { timeout: 10000 });
    printSuccess('Quiz page loaded\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await exitWithError(browser, `❌ Failed to load quiz page: ${message}`);
  }
}

// ============================================================================
// Mode: SOLVE
// ============================================================================

async function runSolveMode(browser: any, page: any): Promise<void> {
  // Step 1: Quiz URL
  console.log('Step 1: Navigate to quiz');
  let quizUrl = '';
  try {
    quizUrl = await getQuizUrlInteractive();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid URL provided';
    await exitWithError(browser, `❌ ${message}`);
  }

  await navigateToQuizPage(page, quizUrl, browser);

  // Step 2: Validate API key
  console.log('Step 2: Validating LLM provider...');
  const providerInfo = await getProviderInfo();
  console.log(`   Using: ${providerInfo.name}${providerInfo.endpoint ? ` (${providerInfo.endpoint})` : ''}`);
  const isValidKey = await validateApiKey();
  if (!isValidKey) {
    const errorMsg =
      providerInfo.name === 'OpenAI'
        ? 'Invalid OPENAI_API_KEY. Please check your .env file and ensure it contains a valid OpenAI API key.'
        : `Invalid ${providerInfo.name} configuration. Please check your environment variables.`;
    await exitWithError(browser, errorMsg);
  }
  printSuccess('LLM provider validated\n');

  // Step 3: Process quiz
  console.log('Step 3: Processing quiz questions...\n');
  const pageTracker = new PageTracker();
  let totalProcessed = 0;
  const collectedAnswers: ExportedAnswer[] = [];

  while (true) {
    const currentUrl = page.url();
    if (pageTracker.hasProcessed(page)) {
      printWarning('Already processed this page, stopping');
      break;
    }
    pageTracker.markAsProcessed(page);

    console.log(`📄 Processing page ${pageTracker.getProcessedCount()}...`);
    const questions = await scrapeQuestions(page);
    console.log(`   Found ${questions.length} valid questions\n`);

    const highlights: HighlightData[] = [];

    for (const question of questions) {
      if (totalProcessed >= MAX_QUESTIONS) {
        printWarning(`Reached ${MAX_QUESTIONS} question limit. Stopping to prevent runaway costs.\n`);
        break;
      }

      totalProcessed++;
      const result = await analyzeQuestion(question, totalProcessed);
      printFormattedAnswer(question, result, totalProcessed);

      if (result) {
        collectedAnswers.push({
          questionNumber: totalProcessed,
          question: question.questionText,
          options: question.options.map((opt) => ({
            letter: opt.label,
            text: opt.text,
          })),
          suggestedAnswer: result.suggestedAnswer,
          explanation: result.explanation,
          confidence: result.confidence,
        });
      }

      if (result && result.suggestedAnswer !== 'UNKNOWN' && result.selector) {
        try {
          let clickSucceeded = false;
          try {
            await page.click(result.selector);
            clickSucceeded = true;
          } catch {
            if (result.selector.startsWith('#')) {
              const elementId = result.selector.substring(1);
              await page.evaluate((id: string) => {
                const elem = document.getElementById(id);
                if (elem instanceof HTMLInputElement) {
                  elem.checked = true;
                  elem.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, elementId);
              clickSucceeded = true;
            }
          }

          await page.waitForTimeout(100);

          const isChecked = await page.evaluate((selector: string) => {
            const elem = document.querySelector(selector);
            if (elem instanceof HTMLInputElement) {
              return elem.checked;
            }
            const radioId = elem?.getAttribute('for');
            if (radioId) {
              const radio = document.getElementById(radioId);
              return radio instanceof HTMLInputElement && radio.checked;
            }
            const radio = elem?.querySelector('input[type="radio"]');
            return radio instanceof HTMLInputElement && radio.checked;
          }, result.selector);

          if (isChecked) {
            console.log(`✅ Auto-selected: ${result.suggestedAnswer}\n`);
          } else {
            if (result.selector.startsWith('#')) {
              const elementId = result.selector.substring(1);
              await page.evaluate((id: string) => {
                const elem = document.getElementById(id);
                if (elem instanceof HTMLInputElement) {
                  elem.checked = true;
                  elem.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, elementId);
            } else {
              await page.evaluate((selector: string) => {
                const elem = document.querySelector(selector);
                if (elem instanceof HTMLInputElement) {
                  elem.checked = true;
                  elem.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  const radioId = elem?.getAttribute('for');
                  if (radioId) {
                    const radio = document.getElementById(radioId);
                    if (radio instanceof HTMLInputElement) {
                      radio.checked = true;
                      radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }
                }
              }, result.selector);
            }
            console.log(`✅ Auto-selected: ${result.suggestedAnswer}\n`);
          }
        } catch (error) {
          printWarning(
            `Could not auto-select answer for Q${totalProcessed}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        highlights.push({
          selector: result.selector,
          letter: result.suggestedAnswer,
        });
      }
    }

    if (highlights.length > 0) {
      await applyHighlights(page, highlights);
      printSuccess(`Applied ${highlights.length} highlights to page\n`);
    }

    if (totalProcessed >= MAX_QUESTIONS) break;

    const nextButton = await findNextButton(page);
    if (!nextButton) {
      printSuccess('No more pages (reached last page)\n');
      break;
    }

    console.log('⏭️  Navigating to next page...\n');
    const navigated = await navigateToNextPage(page);
    if (!navigated) {
      printWarning('Failed to navigate to next page\n');
      break;
    }
  }

  // Export answers
  let exportFilePath = '';
  if (collectedAnswers.length > 0) {
    exportFilePath = exportAnswers(collectedAnswers, quizUrl, {
      format: 'txt',
      includeExplanations: true,
      timestamp: true,
      outputDir: './quiz-answers',
    });
  }

  // Summary
  console.log(createSeparator(80));
  printSuccess('Quiz processing complete!');
  console.log(`   Questions answered: ${totalProcessed}`);
  const failedQuestions = getFailedQuestions();
  if (failedQuestions.length > 0) {
    console.log(`   Questions skipped (rate limited): Q${failedQuestions.join(', Q')}`);
  }
  if (exportFilePath) {
    console.log(`📄 Export file: ${exportFilePath}`);
  }
  console.log('🔍 Check browser for highlighted answers');
  console.log('');
  console.log('👉 Press Enter to close browser, or Ctrl+C to exit immediately.');
  console.log(createSeparator(80));

  await waitForEnter('');
  await browser.close();
  printSuccess('Browser closed. Goodbye!');
}

// ============================================================================
// Mode: REVIEW
// ============================================================================

async function runReviewModeCli(browser: any, page: any, reviewUrlArg?: string): Promise<void> {
  console.log('Step 1: Navigate to review page');
  let reviewUrl = '';
  if (reviewUrlArg) {
    reviewUrl = reviewUrlArg;
  } else {
    try {
      reviewUrl = await promptForReviewUrl();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid URL provided';
      await exitWithError(browser, `❌ ${message}`);
    }
  }

  try {
    await page.goto(reviewUrl);
    await page.waitForSelector('.que', { timeout: 10000 });
    printSuccess('Review page loaded\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await exitWithError(browser, `❌ Failed to load review page: ${message}`);
  }

  try {
    await runReviewMode(page, reviewUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await exitWithError(browser, `❌ Review mode failed: ${message}`);
  }

  console.log('\n👉 Press Enter to close browser.');
  await waitForEnter('');
  await browser.close();
}

// ============================================================================
// Mode: AUTO
// ============================================================================

async function runAutoModeCli(browser: any, page: any, answerFileArg?: string): Promise<void> {
  console.log('Step 1: Load answer bank');
  let answerFile = '';
  if (answerFileArg) {
    answerFile = answerFileArg;
  } else {
    try {
      answerFile = await promptForAnswerFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid file provided';
      await exitWithError(browser, `❌ ${message}`);
    }
  }

  console.log('Step 2: Navigate to quiz');
  let quizUrl = '';
  try {
    quizUrl = await getQuizUrlInteractive();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid URL provided';
    await exitWithError(browser, `❌ ${message}`);
  }

  await navigateToQuizPage(page, quizUrl, browser);

  try {
    await runAutoMode(page, quizUrl, answerFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await exitWithError(browser, `❌ Auto mode failed: ${message}`);
  }

  console.log('\n👉 Press Enter to close browser.');
  await waitForEnter('');
  await browser.close();
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const { mode, arg } = parseCliArgs();

  printSection('Quiz Solver starting');

  // Display provider info
  const providerInfo = await getProviderInfo();
  console.log(`📡 Using: ${providerInfo.name}${providerInfo.endpoint ? ` (${providerInfo.endpoint})` : ''}`);
  console.log('');

  // Launch browser and wait for login
  console.log('Launching browser...');
  const { browser, page } = await launchBrowser();
  printSuccess('Logged in to LMS\n');

  // Route to mode
  if (mode === 'review') {
    await runReviewModeCli(browser, page, arg);
  } else if (mode === 'auto') {
    await runAutoModeCli(browser, page, arg);
  } else {
    await runSolveMode(browser, page);
  }

  process.exit(0);
}

main().catch((error) => {
  printError(`Fatal error: ${error}`);
  process.exit(1);
});
