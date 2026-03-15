import type { ReviewedAnswer, ReviewData } from './types.js';
import { normalizeText, hashQuestion, similarityScore, questionsMatch } from './normalize.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * AnswerBank stores reviewed answers and provides lookup functionality
 * for Phase 2 (Auto Mode) to find correct options in new quiz attempts.
 */
export class AnswerBank {
  private answersByHash: Map<string, ReviewedAnswer> = new Map();
  private allAnswers: ReviewedAnswer[] = [];

  /**
   * Constructor - Optional ReviewData to load from
   * Builds internal hash map: questionHash → ReviewedAnswer
   * Also stores all answers in array for fuzzy fallback
   * @param data - Optional ReviewData to initialize the bank with
   */
  constructor(data?: ReviewData) {
    if (data?.answers) {
      for (const answer of data.answers) {
        this.addAnswer(answer);
      }
    }
  }

  /**
   * Add an answer to the bank
   * @param answer - The ReviewedAnswer to add
   */
  private addAnswer(answer: ReviewedAnswer): void {
    this.answersByHash.set(answer.questionHash, answer);
    this.allAnswers.push(answer);
  }

  /**
   * Lookup ReviewedAnswer for a question text
   * Normalize question text
   * Try hash-based lookup (O(1))
   * If miss, try fuzzy lookup
   * Return ReviewedAnswer or null
   * @param questionText - The question text to look up
   * @returns Matching ReviewedAnswer or null if not found
   */
  lookup(questionText: string): ReviewedAnswer | null {
    const normalized = normalizeText(questionText);
    const hash = hashQuestion(normalized);
    
    // Try exact hash match first
    const exactMatch = this.answersByHash.get(hash);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Fallback to fuzzy lookup
    return this.fuzzyLookup(normalized);
  }

  /**
   * Private fuzzy lookup method
   * Iterate all answers
   * Score each using similarityScore()
   * Return highest score if >= 0.85 threshold, else null
   * @param normalizedText - Normalized question text to match against
   * @returns Best matching ReviewedAnswer or null if below threshold
   */
  private fuzzyLookup(normalizedText: string): ReviewedAnswer | null {
    let bestAnswer: ReviewedAnswer | null = null;
    let bestScore = 0;
    
    for (const answer of this.allAnswers) {
      const score = similarityScore(normalizedText, answer.normalizedQuestion);
      if (score > bestScore && score >= 0.85) {
        bestScore = score;
        bestAnswer = answer;
      }
    }
    
    return bestAnswer;
  }

  /**
   * CRITICAL FOR PHASE 2: Find correct option index in current options
   * Lookup ReviewedAnswer for the question
   * If found, compare correctAnswer against each option in currentOptions
   * Return 0-based index of matching option
   * Try exact match first, then fuzzy if no exact match
   * Return null if no match found
   * This handles Moodle's random option shuffling per attempt
   * @param questionText - The question text to look up
   * @param currentOptions - Array of option texts from current quiz attempt
   * @returns 0-based index of correct option or null if not found
   */
  findCorrectOptionIndex(questionText: string, currentOptions: string[]): number | null {
    const reviewed = this.lookup(questionText);
    if (!reviewed) {
      return null;
    }
    
    // Try exact match first
    for (let i = 0; i < currentOptions.length; i++) {
      if (normalizeText(currentOptions[i]) === reviewed.normalizedAnswer) {
        return i;  // Exact match
      }
    }
    
    // Fuzzy match fallback
    let bestIndex = -1;
    let bestScore = 0;
    for (let i = 0; i < currentOptions.length; i++) {
      const score = similarityScore(reviewed.correctAnswer, currentOptions[i]);
      if (score > bestScore && score >= 0.85) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    return bestIndex >= 0 ? bestIndex : null;
  }

  /**
   * Return number of answers in bank
   * @returns Count of answers stored
   */
  size(): number {
    return this.allAnswers.length;
  }

  /**
   * Serialize to ReviewData for file export
   * @returns ReviewData representation of this answer bank
   */
  toJSON(): ReviewData {
    return {
      sourceUrl: this.allAnswers.length > 0 ? this.allAnswers[0].questionHash : '',
      quizName: undefined,
      extractedAt: new Date().toISOString(),
      totalQuestions: this.allAnswers.length,
      answers: [...this.allAnswers] // Create a copy
    };
  }

  /**
   * Load AnswerBank from JSON file
   * Read JSON file
   * Validate structure (has answers array with required fields)
   * Return new AnswerBank loaded from file
   * Throw meaningful error if file invalid/missing
   * @param filepath - Path to the JSON file to load
   * @returns New AnswerBank instance
   * @throws Error if file is invalid or missing
   */
  static fromFile(filepath: string): AnswerBank {
    if (!existsSync(filepath)) {
      throw new Error(`Answer file not found: ${filepath}`);
    }
    
    let rawData: any;
    try {
      rawData = JSON.parse(readFileSync(filepath, 'utf-8'));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON in answer file ${filepath}: ${errMsg}`);
    }
    
    // Validate structure
    if (!rawData || !Array.isArray(rawData.answers)) {
      throw new Error(`Invalid answer file structure: missing or invalid answers array`);
    }
    
    // Validate each answer has required fields
    for (let i = 0; i < rawData.answers.length; i++) {
      const answer = rawData.answers[i];
      const requiredFields = ['questionText', 'normalizedQuestion', 'correctAnswer', 'normalizedAnswer', 'allOptions', 'questionHash'];
      for (const field of requiredFields) {
        if (!(field in answer) || answer[field] === undefined || answer[field] === null) {
          throw new Error(`Invalid answer at index ${i}: missing or null field '${field}'`);
        }
      }
      
      // Ensure allOptions is an array
      if (!Array.isArray(answer.allOptions)) {
        throw new Error(`Invalid answer at index ${i}: allOptions must be an array`);
      }
    }
    
    return new AnswerBank(rawData);
  }

  /**
   * Save AnswerBank to JSON file
   * Serialize toJSON()
   * Write to filepath
   * Create parent directory if needed
   * @param filepath - Path where to save the answer bank
   */
  saveTo(filepath: string): void {
    const data = this.toJSON();
    
    // Create parent directory if needed
    const dir = path.dirname(filepath);
    if (!existsSync(dir)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('fs').mkdirSync(dir, { recursive: true });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create directory ${dir}: ${errMsg}`);
      }
    }
    
    try {
      writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write answer file ${filepath}: ${errMsg}`);
    }
  }
}