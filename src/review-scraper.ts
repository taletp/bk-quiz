import type { Page } from 'playwright';
import type { ReviewedAnswer, ReviewData } from './types.js';
import { normalizeText, hashQuestion } from './normalize.js';
import { findNextButton, navigateToNextPage, PageTracker } from './navigation.js';
import { printWarning, printSuccess } from './utils.js';

/**
 * Scrapes a single review page for question/answer pairs.
 * Executed on a review.php page already loaded in browser.
 * Uses page.evaluate() to run DOM scraping in-browser.
 * Returns ReviewData with all extracted question/answer pairs from current page.
 * No pagination (single page only).
 */
export async function scrapeReviewPage(page: Page): Promise<ReviewData> {
  return await page.evaluate(() => {
    // Helper function to normalize text (matches normalize.ts)
    function normalizeText(text: string): string {
      return text
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/^[a-z]\.\s*/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }

    // Helper function to generate hash (matches normalize.ts)
    function hashQuestion(normalizedText: string): string {
      let hash = 5381;
      for (let i = 0; i < normalizedText.length; i++) {
        hash = ((hash << 5) + hash) ^ normalizedText.charCodeAt(i);
      }
      return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
    }

    const answers: ReviewedAnswer[] = [];
    
    // Find all .que containers
    const questionContainers = document.querySelectorAll('.que');
    
    questionContainers.forEach((container, index) => {
      try {
        // Extract .qtext text content
        const qtextElement = container.querySelector('.qtext');
        if (!qtextElement) {
          console.warn(`Question ${index + 1}: No .qtext element found`);
          return;
        }
        const questionText = qtextElement.textContent.trim();
        if (!questionText) {
          console.warn(`Question ${index + 1}: Empty question text`);
          return;
        }
        
        const normalizedQuestion = normalizeText(questionText);
        const questionHash = hashQuestion(normalizedQuestion);
        
        // Look for .correct class inside .answer container
        const answerContainer = container.querySelector('.answer');
        let correctAnswer = '';
        let correctLetter: string | undefined;
        
        if (answerContainer) {
          // Primary strategy: Look for .correct class
          const correctElement = answerContainer.querySelector('.correct');
          if (correctElement) {
            correctAnswer = correctElement.textContent.trim();
          } else {
            // Fallback 1: Check .state text = "Correct" + checked radio
            const stateElement = container.querySelector('.state');
            if (stateElement && stateElement.textContent.trim() === 'Correct') {
              const checkedRadio = container.querySelector('input[type="radio"]:checked');
              if (checkedRadio) {
                // Find the label associated with this radio
                const radioId = checkedRadio.id;
                if (radioId) {
                  const labelElement = document.querySelector(`label[for="${radioId}"]`);
                  if (labelElement) {
                    correctAnswer = labelElement.textContent.trim();
                    // Determine letter from label text or position
                    const labelText = labelElement.textContent.trim();
                    const letterMatch = labelText.match(/^([A-D])\./);
                    if (letterMatch) {
                      correctLetter = letterMatch[1];
                    }
                  }
                }
              }
            } else {
              // Fallback 2: Parse .rightanswer div ("The correct answer is: ...")
              const rightanswerDiv = container.querySelector('.rightanswer');
              if (rightanswerDiv) {
                const rightanswerText = rightanswerDiv.textContent.trim();
                const match = rightanswerText.match(/^The correct answer is:\s*(.+)$/i);
                if (match) {
                  correctAnswer = match[1].trim();
                }
              } else {
                // Fallback 3: Look for [data-region="answer-label"].correct (Moodle 4.x Boost)
                const boostCorrect = container.querySelector('[data-region="answer-label"].correct');
                if (boostCorrect) {
                  correctAnswer = boostCorrect.textContent.trim();
                  // Remove leading letter prefix if present
                  const cleanAnswer = correctAnswer.replace(/^[A-D]\.\s*/, '');
                  if (cleanAnswer) {
                    correctAnswer = cleanAnswer;
                  }
                }
              }
            }
          }
        }
        
        // Extract all option texts (for allOptions field)
        const allOptions: string[] = [];
        const optionElements = container.querySelectorAll('.answer [data-region="answer-label"], .answer label');
        optionElements.forEach(optionEl => {
          let optionText = optionEl.textContent.trim();
          // Remove leading letter prefix if present (e.g., "A. ")
          optionText = optionText.replace(/^[A-D]\.\s*/, '');
          if (optionText) {
            allOptions.push(optionText);
          }
        });
        
        // If we couldn't find options via the above method, try radio buttons
        if (allOptions.length === 0) {
          const radioButtons = container.querySelectorAll('input[type="radio"]');
          radioButtons.forEach(radio => {
            const labelId = radio.getAttribute('aria-labelledby');
            if (labelId) {
              const labelElement = document.getElementById(labelId);
              if (labelElement) {
                let optionText = labelElement.textContent.trim();
                optionText = optionText.replace(/^[A-D]\.\s*/, '');
                if (optionText) {
                  allOptions.push(optionText);
                }
              }
            }
          });
        }
        
        // Normalize the correct answer
        const normalizedAnswer = normalizeText(correctAnswer);
        
        answers.push({
          questionText,
          normalizedQuestion,
          correctAnswer,
          normalizedAnswer,
          correctLetter,
          allOptions,
          questionHash
        });
      } catch (error) {
        console.warn(`Error processing question ${index + 1}:`, error);
        // Continue processing other questions
      }
    });
    
    // Extract quiz name if available
    let quizName: string | undefined;
    const quizNameElement = document.querySelector('.activityname, .navbar h1, h1.page-header-headings');
    if (quizNameElement) {
      quizName = quizNameElement.textContent.trim();
    }
    
    return {
      sourceUrl: window.location.href,
      quizName,
      extractedAt: new Date().toISOString(),
      totalQuestions: answers.length,
      answers
    };
  });
}

/**
 * Handles pagination (multi-page reviews).
 * Call scrapeReviewPage() on current page.
 * Check for next button using findNextButton().
 * Navigate using navigateToNextPage().
 * Repeat until no next button.
 * Aggregate all answers from all pages.
 * Return single ReviewData with combined results.
 */
export async function scrapeFullReview(page: Page): Promise<ReviewData> {
  const pageTracker = new PageTracker();
  let allAnswers: ReviewedAnswer[] = [];
  let quizName: string | undefined;
  let sourceUrl: string = '';
  
  let pageIndex = 0;
  let hasNextPage = true;
  
  while (hasNextPage) {
    pageIndex++;
    printSuccess(`Processing review page ${pageIndex}...`);
    
    // Scrape current page
    const pageData = await scrapeReviewPage(page);
    
    // Update shared metadata from first page
    if (pageIndex === 1) {
      sourceUrl = pageData.sourceUrl;
      quizName = pageData.quizName;
    }
    
    // Add answers from this page
    allAnswers = [...allAnswers, ...pageData.answers];
    
    // Mark this page as processed
    pageTracker.markAsProcessed(page);
    
    // Check for next button
    const nextButton = await findNextButton(page);
    if (!nextButton) {
      hasNextPage = false;
      printSuccess(`No more pages found. Completed ${pageIndex} page(s).`);
      break;
    }
    
    // Navigate to next page
    const navigationSuccess = await navigateToNextPage(page);
    if (!navigationSuccess) {
      printWarning('Failed to navigate to next page. Stopping pagination.');
      hasNextPage = false;
      break;
    }
    
    // Small delay to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return {
    sourceUrl,
    quizName,
    extractedAt: new Date().toISOString(),
    totalQuestions: allAnswers.length,
    answers: allAnswers
  };
}