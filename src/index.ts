import { Browser } from 'playwright';
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
import { waitForEnter, createSeparator, formatText, printSection, printSuccess, printWarning, printError } from './utils.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_QUESTIONS = 100;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Exits gracefully after an error, keeping browser open for user review
 */
async function exitWithError(browser: Browser, message: string): Promise<never> {
  printError(message);
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
  console.log(createSeparator(80));
  console.log(`Question ${questionNumber}/${MAX_QUESTIONS}`);
  
  // Truncate question text to 100 chars
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

/**
 * Prints warning for multi-select questions
 */
function printMultiSelectWarning(questionNumber: number): void {
  console.log(createSeparator(80));
  console.log(`Question ${questionNumber}/${MAX_QUESTIONS}`);
  console.log('[Multi-select question - SKIPPED]');
  printWarning('This tool only supports single-answer MCQ questions.');
  console.log(createSeparator(80));
  console.log('');
}

// ============================================================================
// Main Flow
// ============================================================================

async function main(): Promise<void> {
  printSection('Quiz Solver starting');

  // Step 1: Launch browser and wait for login
  console.log('Step 1: Launching browser...');
  const { browser, page } = await launchBrowser();
  printSuccess('Logged in to LMS\n');

   // Step 2: Prompt for quiz URL
   console.log('Step 2: Navigate to quiz');
   let quizUrl = '';
   try {
     quizUrl = await promptForQuizUrl();
   } catch (error) {
     const message = error instanceof Error ? error.message : 'Invalid URL provided';
     await exitWithError(browser, `❌ ${message}`);
   }
   
   // Navigate to quiz
   try {
     await page.goto(quizUrl);
     await page.waitForSelector('.que', { timeout: 10000 });
     printSuccess('Quiz page loaded\n');
   } catch (error) {
     const message = error instanceof Error ? error.message : 'Unknown error';
     await exitWithError(browser, `❌ Failed to load quiz page: ${message}`);
   }

  // Step 3: Validate API key
  console.log('Step 3: Validating OpenAI API key...');
  const isValidKey = await validateApiKey();
  if (!isValidKey) {
    await exitWithError(browser, 'Invalid OPENAI_API_KEY. Please check your .env file and ensure it contains a valid OpenAI API key.');
  }
  printSuccess('API key validated\n');

  // Step 4: Process quiz pages
  console.log('Step 4: Processing quiz questions...\n');
  const pageTracker = new PageTracker();
  let totalProcessed = 0;
  let totalSkipped = 0;

  while (true) {
    const currentUrl = page.url();
    
    // Check for infinite loop
    if (pageTracker.hasProcessed(page)) {
      printWarning('Already processed this page, stopping');
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
        printWarning(`Reached ${MAX_QUESTIONS} question limit. Stopping to prevent runaway costs.\n`);
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
      printSuccess(`Applied ${highlights.length} highlights to page\n`);
    }
    
    // Check if we hit the limit
    if (totalProcessed >= MAX_QUESTIONS) {
      break;
    }
    
    // Check for Next button
    const nextButton = await findNextButton(page);
    if (!nextButton) {
      printSuccess('No more pages (reached last page)\n');
      break; // Last page
    }
    
    // Navigate to next page
    console.log('⏭️  Navigating to next page...\n');
    const navigated = await navigateToNextPage(page);
    if (!navigated) {
      printWarning('Failed to navigate to next page\n');
      break;
    }
  }

  // Step 5: Print final summary
  console.log(createSeparator(80));
  printSuccess('Quiz processing complete!');
  console.log(`   Questions answered: ${totalProcessed}`);
  console.log(`   Questions skipped: ${totalSkipped}`);
  console.log('🔍 Check browser for highlighted answers');
  console.log('');
  console.log('👉 Press Enter to close browser, or Ctrl+C to exit immediately.');
  console.log(createSeparator(80));

  // Step 6: Wait for user to review
  await waitForEnter('');

  // Step 7: Clean up
  await browser.close();
  printSuccess('Browser closed. Goodbye!');
  process.exit(0);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  printError(`Fatal error: ${error}`);
  process.exit(1);
});
