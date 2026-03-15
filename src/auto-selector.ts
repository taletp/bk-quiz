import type { Page } from 'playwright';
import type { ScrapedQuestion } from './scraper.js';
import { AnswerBank } from './answer-bank.js';
import { printSuccess, printWarning } from './utils.js';

/**
 * Result of attempting to auto-select an answer for a question
 */
export interface AutoSelectResult {
  questionIndex: number;
  questionText: string;
  matched: boolean;
  selectedLetter: string | null;  // "A", "B", "C", "D" or null
  selectedText: string | null;
  selector: string | null;
  confidence: 'exact' | 'fuzzy' | 'none';
}

/**
 * Attempts to automatically select the correct answer for a single question
 * 
 * Steps:
 * 1. Call answerBank.findCorrectOptionIndex(question.questionText, optionTexts)
 * 2. If null returned → return {matched: false, confidence: 'none', ...}
 * 3. If match found at index i:
 *    a. Get the selector from question.options[i].selector
 *    b. Determine letter ("A"/"B"/"C"/"D") from question.options[i].label
 *    c. Determine confidence: check if similarity is exact or fuzzy
 *    d. Click the radio button: await page.click(selector)
 *       - Fallback if selector has special chars (colons in IDs):
 *         const elementId = selector.substring(1);  // Remove leading #
 *         await page.evaluate((id) => {
 *           const elem = document.getElementById(id);
 *           if (elem instanceof HTMLInputElement) {
 *             elem.checked = true;
 *             elem.dispatchEvent(new Event('change', { bubbles: true }));
 *           }
 *         }, elementId);
 *    e. Verify click by reading radio state: await page.isChecked(selector)
 * 
 * @param page - Playwright page object
 * @param question - The scraped question data
 * @param answerBank - The answer bank containing reviewed answers
 * @param questionNumber - The 1-based question number for display purposes
 * @returns AutoSelectResult with details of the selection attempt
 */
export async function autoSelectAnswer(
  page: Page,
  question: ScrapedQuestion,
  answerBank: AnswerBank,
  questionNumber: number
): Promise<AutoSelectResult> {
  // Extract option texts for lookup
  const optionTexts = question.options.map(opt => opt.text);
  
  // Find the correct option index using the answer bank
  const correctIndex = answerBank.findCorrectOptionIndex(question.questionText, optionTexts);
  
  // If no match found, return unsuccessful result
  if (correctIndex === null) {
    return {
      questionIndex: question.index,
      questionText: question.questionText,
      matched: false,
      selectedLetter: null,
      selectedText: null,
      selector: null,
      confidence: 'none'
    };
  }
  
  // Match found at correctIndex
  const matchedOption = question.options[correctIndex];
  const selector = matchedOption.selector;
  const selectedLetter = matchedOption.label;
  const selectedText = matchedOption.text;
  
  // Determine confidence level
  // We need to check if it was an exact match or fuzzy match
  // For simplicity, we'll check if the normalized texts match exactly
  const reviewed = answerBank.lookup(question.questionText);
  let confidence: 'exact' | 'fuzzy' | 'none' = 'none';
  
  if (reviewed) {
    const normalizedCorrect = normalizeText(reviewed.correctAnswer);
    const normalizedSelected = normalizeText(selectedText || '');
    if (normalizedCorrect === normalizedSelected) {
      confidence = 'exact';
    } else {
      // Check if it's at least a fuzzy match (similarity >= 0.85)
      const similarity = similarityScore(reviewed.correctAnswer, selectedText || '');
      if (similarity >= 0.85) {
        confidence = 'fuzzy';
      }
    }
  }
  
  try {
    // Click the radio button using Playwright
    await page.click(selector);
    
    // Verify the click worked
    const isChecked = await page.isChecked(selector);
    if (!isChecked) {
      printWarning(`Question ${questionNumber}: Click appeared to succeed but radio is not checked`);
    } else {
      printSuccess(`Question ${questionNumber}: Selected option ${selectedLetter}`);
    }
    
    return {
      questionIndex: question.index,
      questionText: question.questionText,
      matched: true,
      selectedLetter,
      selectedText,
      selector,
      confidence
    };
  } catch (error) {
    // If standard click fails, try the fallback method for special characters in IDs
    printWarning(`Standard click failed for question ${questionNumber}, trying fallback method: ${error.message}`);
    
    try {
      // Fallback for selectors with special characters (like colons in IDs)
      if (selector.startsWith('#')) {
        const elementId = selector.substring(1); // Remove leading #
        
        await page.evaluate((id) => {
          const elem = document.getElementById(id);
          if (elem instanceof HTMLInputElement) {
            elem.checked = true;
            elem.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, elementId);
        
        // Verify the fallback click worked
        const isChecked = await page.isChecked(selector);
        if (!isChecked) {
          printWarning(`Question ${questionNumber}: Fallback click appeared to succeed but radio is not checked`);
        } else {
          printSuccess(`Question ${questionNumber}: Selected option ${selectedLetter} (via fallback)`);
        }
        
        return {
          questionIndex: question.index,
          questionText: question.questionText,
          matched: true,
          selectedLetter,
          selectedText,
          selector,
          confidence
        };
      } else {
        throw error; // Re-throw if not a hash selector
      }
    } catch (fallbackError) {
      printWarning(`Question ${questionNumber}: Both click methods failed: ${fallbackError.message}`);
      
      return {
        questionIndex: question.index,
        questionText: question.questionText,
        matched: false,
        selectedLetter: null,
        selectedText: null,
        selector: null,
        confidence: 'none'
      };
    }
  }
}

/**
 * Automatically select answers for all questions on a page
 * 
 * Simple loop:
 * const results: AutoSelectResult[] = [];
 * for (let i = 0; i < questions.length; i++) {
 *   const result = await autoSelectAnswer(page, questions[i], answerBank, startNumber + i);
 *   results.push(result);
 * }
 * return results;
 * 
 * @param page - Playwright page object
 * @param questions - Array of scraped questions
 * @param answerBank - The answer bank containing reviewed answers
 * @param startNumber - The starting question number (1-based) for display purposes
 * @returns Array of AutoSelectResult for each question
 */
export async function autoSelectPage(
  page: Page,
  questions: ScrapedQuestion[],
  answerBank: AnswerBank,
  startNumber: number
): Promise<AutoSelectResult[]> {
  const results: AutoSelectResult[] = [];
  
  for (let i = 0; i < questions.length; i++) {
    const result = await autoSelectAnswer(page, questions[i], answerBank, startNumber + i);
    results.push(result);
  }
  
  return results;
}
