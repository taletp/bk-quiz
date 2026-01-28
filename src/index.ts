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
import { analyzeQuestion, validateApiKey, AnswerResult, getFailedQuestions, getProviderInfo } from './gpt-provider.js';
import { applyHighlights, HighlightData } from './overlay.js';
import { waitForEnter, createSeparator, formatText, printSection, printSuccess, printWarning, printError } from './utils.js';
import { exportAnswers, type ExportedAnswer } from './export-answers.js';

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
   
   // Display which provider is being used
   const providerInfo = await getProviderInfo();
   console.log(`📡 Using: ${providerInfo.name} ${providerInfo.endpoint ? `(${providerInfo.endpoint})` : ''}`);
   console.log('');

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
   console.log('Step 3: Validating LLM provider...');
   const providerInfoValidation = await getProviderInfo();
   console.log(`   Using: ${providerInfoValidation.name} ${providerInfoValidation.endpoint ? `(${providerInfoValidation.endpoint})` : ''}`);
   const isValidKey = await validateApiKey();
   if (!isValidKey) {
     const errorMsg = providerInfoValidation.name === 'OpenAI' 
       ? 'Invalid OPENAI_API_KEY. Please check your .env file and ensure it contains a valid OpenAI API key.'
       : `Invalid ${providerInfoValidation.name} configuration. Please check your environment variables.`;
     await exitWithError(browser, errorMsg);
   }
   printSuccess('LLM provider validated\n');

   // Step 4: Process quiz pages
   console.log('Step 4: Processing quiz questions...\n');
   const pageTracker = new PageTracker();
   let totalProcessed = 0;
   let totalSkipped = 0;
   
   // Collect all answers for export
   const collectedAnswers: ExportedAnswer[] = [];

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
       
       // Collect answer for export
       if (result) {
         collectedAnswers.push({
           questionNumber: totalProcessed,
           question: question.questionText,
           options: question.options.map(opt => ({
             letter: opt.label,
             text: opt.text
           })),
           suggestedAnswer: result.suggestedAnswer,
           explanation: result.explanation,
           confidence: result.confidence
         });
       }
       
        // Auto-select the answer in the browser (but don't submit)
        if (result && result.suggestedAnswer !== 'UNKNOWN' && result.selector) {
          try {
            // Click the radio button/label to select it
            await page.click(result.selector);
            
            // Wait a moment for the click to register
            await page.waitForTimeout(100);
            
            // Verify the radio button is actually checked
            const isChecked = await page.evaluate((selector) => {
              const elem = document.querySelector(selector);
              if (elem instanceof HTMLInputElement) {
                return elem.checked;
              }
              // If it's a label, check the associated radio button
              const radioId = elem?.getAttribute('for');
              if (radioId) {
                const radio = document.getElementById(radioId);
                return radio instanceof HTMLInputElement && radio.checked;
              }
              // Try to find radio button within the selector path
              const radio = elem?.querySelector('input[type="radio"]');
              return radio instanceof HTMLInputElement && radio.checked;
            }, result.selector);
            
            if (isChecked) {
              console.log(`✅ Auto-selected: ${result.suggestedAnswer}\n`);
            } else {
              // If click didn't work, try alternative: directly set the radio button
              await page.evaluate((selector) => {
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
              console.log(`✅ Auto-selected: ${result.suggestedAnswer}\n`);
            }
          } catch (error) {
            printWarning(`Could not auto-select answer for Q${totalProcessed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Store highlight data
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

   // Step 5: Export answers to file
    let exportFilePath = '';
    if (collectedAnswers.length > 0) {
      exportFilePath = exportAnswers(collectedAnswers, quizUrl, {
        format: 'txt',
        includeExplanations: true,
        timestamp: true,
        outputDir: './quiz-answers'
      });
    }

    // Step 6: Print final summary
    console.log(createSeparator(80));
    printSuccess('Quiz processing complete!');
    console.log(`   Questions answered: ${totalProcessed}`);
    console.log(`   Questions skipped: ${totalSkipped}`);
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

   // Step 7: Wait for user to review
   await waitForEnter('');

   // Step 8: Clean up
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
