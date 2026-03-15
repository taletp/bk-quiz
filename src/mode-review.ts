/**
 * Review Mode Orchestrator
 * Extracts correct answers from a completed quiz review page
 */

import type { Page } from 'playwright';
import type { ReviewData } from './types.js';
import { scrapeFullReview } from './review-scraper.js';
import { saveReviewData } from './review-export.js';
import { printSuccess, printWarning, printSection, createSeparator } from './utils.js';

/**
 * Orchestrates the review mode flow:
 * 1. Navigate to review URL (already loaded in browser)
 * 2. Scrape all questions + correct answers from review page(s)
 * 3. Print summary to console
 * 4. Save ReviewData to file
 * 5. Return ReviewData + file path
 *
 * @param page - Playwright page object (already on review.php)
 * @param reviewUrl - The review page URL
 * @returns Object with ReviewData and filepath
 */
export async function runReviewMode(
  page: Page,
  reviewUrl: string
): Promise<{ data: ReviewData; filepath: string }> {
  printSection('Review Mode: Extracting correct answers');

  // Scrape the review page(s)
  const reviewData = await scrapeFullReview(page);

  // Print summary
  console.log('');
  console.log(createSeparator(80));
  console.log('EXTRACTED ANSWERS');
  console.log(createSeparator(80));

  for (const answer of reviewData.answers) {
    const qNum = reviewData.answers.indexOf(answer) + 1;
    if (answer.correctAnswer) {
      console.log(`Q${qNum}: ${answer.questionText.substring(0, 60)}${answer.questionText.length > 60 ? '...' : ''}`);
      console.log(`   ✅ Correct: ${answer.correctAnswer.substring(0, 80)}`);
    } else {
      console.log(`Q${qNum}: ${answer.questionText.substring(0, 60)}${answer.questionText.length > 60 ? '...' : ''}`);
      printWarning('   ⚠️ Answer not found (review may not show answer)');
    }
  }

  console.log('');
  console.log(createSeparator(80));

  // Save to file
  const filepath = saveReviewData(reviewData);

  // Print completion message
  console.log('');
  printSuccess('Review extraction complete!');
  console.log(`   Total questions: ${reviewData.totalQuestions}`);
  console.log(`   Answers found: ${reviewData.answers.filter(a => a.correctAnswer).length}`);
  console.log(`   Missing answers: ${reviewData.answers.filter(a => !a.correctAnswer).length}`);
  console.log('');
  console.log('💾 Use this file in auto mode to auto-answer future attempts.');

  return { data: reviewData, filepath };
}
