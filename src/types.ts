/**
 * Shared type definitions for review and auto modes
 */

/** A single correct answer extracted from a review page */
export interface ReviewedAnswer {
  questionText: string;       // Original question text (trimmed)
  normalizedQuestion: string; // Lowercased, whitespace-collapsed
  correctAnswer: string;      // The text of the correct option
  normalizedAnswer: string;   // Lowercased, whitespace-collapsed
  correctLetter?: string;     // "A"/"B"/"C"/"D" if position known
  allOptions: string[];       // All option texts in DOM order
  questionHash: string;       // Deterministic hash for fast lookup
}

/** Container for a full review extraction */
export interface ReviewData {
  sourceUrl: string;          // The review.php URL
  quizName?: string;          // Quiz title if available
  extractedAt: string;        // ISO 8601 timestamp
  totalQuestions: number;
  answers: ReviewedAnswer[];
}

/** Mode selection for the CLI */
export type AppMode = 'solve' | 'review' | 'auto';
