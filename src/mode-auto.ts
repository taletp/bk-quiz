/**
 * Auto Mode Orchestrator
 * Uses answer bank to auto-click correct answers in a new quiz attempt
 */

import type { Page } from 'playwright';
import { AnswerBank } from './answer-bank.js';
import { loadReviewData, listReviewFiles } from './review-export.js';
import { scrapeQuestions } from './scraper.js';
import { autoSelectPage, type AutoSelectResult } from './auto-selector.js';
import { findNextButton, navigateToNextPage, PageTracker } from './navigation.js';
import { applyHighlights, type HighlightData } from './overlay.js';
import { printSuccess, printWarning, printSection, createSeparator, delay } from './utils.js';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Orchestrates the auto-answer mode flow:
 * 1. Load answer bank from file
 * 2. Navigate to quiz attempt URL
 * 3. For each page:
 *    a. Scrape questions
 *    b. Auto-select matching answers
 *    c. Apply visual highlights
 *    d. Navigate to next page
 * 4. Print summary
 *
 * @param page - Playwright page object (already on quiz attempt)
 * @param quizUrl - The quiz attempt URL
 * @param answerFilePath - Path to the answer bank JSON file
 * @returns Summary of auto-answer results
 */
export async function runAutoMode(
  page: Page,
  quizUrl: string,
  answerFilePath: string
): Promise<{
  totalQuestions: number;
  matched: number;
  unmatched: number;
  results: AutoSelectResult[];
}> {
  printSection('Auto Mode: Using known correct answers');

  // Load answer bank
  if (!existsSync(answerFilePath)) {
    throw new Error(`Answer file not found: ${answerFilePath}`);
  }

  const reviewData = loadReviewData(answerFilePath);
  const answerBank = new AnswerBank(reviewData);

  console.log(`📚 Loaded ${answerBank.size()} answers from: ${path.basename(answerFilePath)}`);
  console.log('');

  // Process pages
  const pageTracker = new PageTracker();
  let totalQuestions = 0;
  let totalMatched = 0;
  const allResults: AutoSelectResult[] = [];

  while (true) {
    // Check for page loop
    if (pageTracker.hasProcessed(page)) {
      printWarning('⚠️  Already processed this page, stopping');
      break;
    }

    // Mark page as processed
    pageTracker.markAsProcessed(page);

    // Scrape questions on current page
    let questions;
    try {
      questions = await scrapeQuestions(page);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scrape questions: ${msg}`);
    }

    if (questions.length === 0) {
      printWarning('⚠️  No questions found on this page');
      break;
    }

    console.log(`Page: ${questions.length} questions`);
    console.log(createSeparator(80));

    // Auto-select answers on this page
    const pageResults = await autoSelectPage(page, questions, answerBank, totalQuestions + 1);
    allResults.push(...pageResults);

    // Count matches
    const pageMatched = pageResults.filter(r => r.matched).length;
    const pageUnmatched = pageResults.filter(r => !r.matched).length;
    totalMatched += pageMatched;
    totalQuestions += questions.length;

    // Apply visual highlights for matched answers
    const highlights: HighlightData[] = pageResults
      .filter(r => r.matched && r.selector)
      .map(r => ({
        selector: r.selector!,
        letter: r.selectedLetter || 'UNKNOWN',
      }));

    if (highlights.length > 0) {
      await applyHighlights(page, highlights);
    }

    console.log('');
    console.log(`Page summary: ${pageMatched} matched, ${pageUnmatched} skipped`);
    console.log(createSeparator(80));
    console.log('');

    // Check for next button
    try {
      const nextButton = await findNextButton(page);
      if (!nextButton) {
        // No next button - end of quiz
        break;
      }

      // Navigate to next page
      await navigateToNextPage(page);
      await delay(1000); // Wait for page load
    } catch {
      // No next button found - end of quiz
      break;
    }
  }

  // Print final summary
  const totalUnmatched = totalQuestions - totalMatched;

  console.log(createSeparator(80));
  printSuccess('Auto-answer complete!');
  console.log(`   Total questions: ${totalQuestions}`);
  console.log(`   Matched & selected: ${totalMatched}`);
  console.log(`   Unmatched (not in answer bank): ${totalUnmatched}`);
  console.log('');
  console.log('⚠️  Please review all answers before submitting!');
  console.log(createSeparator(80));

  return {
    totalQuestions,
    matched: totalMatched,
    unmatched: totalUnmatched,
    results: allResults,
  };
}
