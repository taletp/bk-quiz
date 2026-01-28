import { Browser } from 'playwright';
import * as readline from 'node:readline';
import { launchBrowser } from './browser.js';
import { 
  promptForQuizUrl, 
  isQuizAttemptPage, 
  findNextButton, 
  navigateToNextPage, 
  PageTracker 
} from './navigation.js';
import { scrapeQuestions, ScrapedQuestion } from './scraper.js';
import { analyzeQuestion, validateApiKey, AnswerResult } from './gpt.js';
import { applyHighlights, HighlightData } from './overlay.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_QUESTIONS = 100;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Waits for Enter keypress using Node.js readline
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
 * Exits gracefully after an error, keeping browser open for user review
 */
async function exitWithError(browser: Browser, message: string): Promise<never> {
  console.error(message);
  console.log('\n👉 Press Enter to close browser and exit.');
  await waitForEnter('');
  await browser.close();
  process.exit(1);
}

/**
 * Prints formatted answer output to console
 */
function printFormattedAnswer(
  question: ScrapedQuestion, 
  result: AnswerResult | null,
  questionNumber: number
): void {
  console.log('━'.repeat(80));
  console.log(`Question ${questionNumber}/${MAX_QUESTIONS}`);
  
  // Truncate question text to 100 chars
  const questionText = question.questionText.length > 100 
    ? question.questionText.substring(0, 97) + '...'
    : question.questionText;
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
    console.log('⚠️ Could not determine answer');
  }
  
  console.log('━'.repeat(80));
  console.log('');
}

/**
 * Prints warning for multi-select questions
 */
function printMultiSelectWarning(questionNumber: number): void {
  console.log('━'.repeat(80));
  console.log(`Question ${questionNumber}/${MAX_QUESTIONS}`);
  console.log('[Multi-select question - SKIPPED]');
  console.log('⚠️ This tool only supports single-answer MCQ questions.');
  console.log('━'.repeat(80));
  console.log('');
}

// ============================================================================
// Main Flow
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 Quiz Solver starting...\n');

  // Step 1: Launch browser and wait for login
  console.log('Step 1: Launching browser...');
  const { browser, page } = await launchBrowser();
  console.log('✅ Logged in to LMS\n');

  // Step 2: Prompt for quiz URL
  console.log('Step 2: Navigate to quiz');
  const quizUrl = await promptForQuizUrl();
  
  // Validate quiz URL
  if (!isQuizAttemptPage(quizUrl)) {
    await exitWithError(
      browser,
      '❌ Invalid URL. Must be a quiz attempt page (/mod/quiz/attempt.php?attempt=...)'
    );
  }

  // Navigate to quiz
  try {
    await page.goto(quizUrl);
    await page.waitForSelector('.que', { timeout: 10000 });
    console.log('✅ Quiz page loaded\n');
  } catch (error) {
    await exitWithError(browser, '❌ Failed to load quiz page');
  }

  // Step 3: Validate API key
  console.log('Step 3: Validating OpenAI API key...');
  const isValidKey = await validateApiKey();
  if (!isValidKey) {
    await exitWithError(browser, '❌ Invalid OPENAI_API_KEY. Please check your .env file.');
  }
  console.log('✅ API key validated\n');

  // Step 4: Process quiz pages
  console.log('Step 4: Processing quiz questions...\n');
  const pageTracker = new PageTracker();
  let totalProcessed = 0;
  let totalSkipped = 0;

  while (true) {
    const currentUrl = page.url();
    
    // Check for infinite loop
    if (pageTracker.hasProcessed(page)) {
      console.warn('⚠️ Already processed this page, stopping');
      break;
    }
    pageTracker.markAsProcessed(page);
    
    // Scrape current page
    console.log(`📄 Processing page ${pageTracker.getProcessedCount()}...`);
    const questions = await scrapeQuestions(page);
    console.log(`   Found ${questions.length} valid questions\n`);
    
    const highlights: HighlightData[] = [];
    
    // Process each question
    for (const question of questions) {
      // Check 100-question cap
      if (totalProcessed >= MAX_QUESTIONS) {
        console.warn(`⚠️ Reached ${MAX_QUESTIONS} question limit. Stopping to prevent runaway costs.\n`);
        break;
      }
      
      totalProcessed++;
      
      // Send to GPT
      const result = await analyzeQuestion(question, totalProcessed);
      
      // Print formatted output
      printFormattedAnswer(question, result, totalProcessed);
      
      // Store highlight data
      if (result && result.suggestedAnswer !== 'UNKNOWN' && result.selector) {
        highlights.push({ 
          selector: result.selector, 
          letter: result.suggestedAnswer 
        });
      }
    }
    
    // Apply highlights to this page
    if (highlights.length > 0) {
      await applyHighlights(page, highlights);
      console.log(`✅ Applied ${highlights.length} highlights to page\n`);
    }
    
    // Check if we hit the limit
    if (totalProcessed >= MAX_QUESTIONS) {
      break;
    }
    
    // Check for Next button
    const nextButton = await findNextButton(page);
    if (!nextButton) {
      console.log('✅ No more pages (reached last page)\n');
      break; // Last page
    }
    
    // Navigate to next page
    console.log('⏭️  Navigating to next page...\n');
    const navigated = await navigateToNextPage(page);
    if (!navigated) {
      console.warn('⚠️ Failed to navigate to next page\n');
      break;
    }
  }

  // Step 5: Print final summary
  console.log('━'.repeat(80));
  console.log('✅ Quiz processing complete!');
  console.log(`   Questions answered: ${totalProcessed}`);
  console.log(`   Questions skipped: ${totalSkipped}`);
  console.log('🔍 Check browser for highlighted answers');
  console.log('');
  console.log('👉 Press Enter to close browser, or Ctrl+C to exit immediately.');
  console.log('━'.repeat(80));

  // Step 6: Wait for user to review
  await waitForEnter('');

  // Step 7: Clean up
  await browser.close();
  console.log('\n✅ Browser closed. Goodbye!');
  process.exit(0);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
