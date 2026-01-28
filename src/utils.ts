import * as readline from 'node:readline';

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for all quiz solver errors
 */
export class QuizSolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuizSolverError';
    Object.setPrototypeOf(this, QuizSolverError.prototype);
  }
}

/**
 * Error thrown when a quiz URL is invalid or malformed
 */
export class InvalidUrlError extends QuizSolverError {
  constructor(message: string = 'Invalid quiz URL') {
    super(message);
    this.name = 'InvalidUrlError';
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

/**
 * Error thrown when API key is missing, invalid, or authentication fails
 */
export class ApiKeyError extends QuizSolverError {
  constructor(message: string = 'Invalid API key') {
    super(message);
    this.name = 'ApiKeyError';
    Object.setPrototypeOf(this, ApiKeyError.prototype);
  }
}

// ============================================================================
// Readline Utilities
// ============================================================================

/**
 * Waits for Enter keypress using Node.js readline
 * Prompts user with the given message and blocks until Enter is pressed
 */
export async function waitForEnter(prompt: string): Promise<void> {
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

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Sleep/delay utility for timing operations
 * Useful for rate limiting or adding pauses between operations
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// String/Formatting Utilities
// ============================================================================

/**
 * Creates a separator string of '━' characters
 * Used for visual separators in console output
 */
export function createSeparator(width: number = 80): string {
  return '━'.repeat(width);
}

/**
 * Formats/truncates text to a maximum length with "..." if needed
 * Used for displaying long question text in console output
 */
export function formatText(text: string, maxLength: number = 100): string {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + '...';
  }
  return text;
}

// ============================================================================
// Console Output Utilities
// ============================================================================

/**
 * Prints a formatted section header with separators
 * Pattern: \n🚀 Title\n━━━━━━━...
 */
export function printSection(title: string): void {
  console.log('');
  console.log(`🚀 ${title}`);
  console.log(createSeparator(80));
}

/**
 * Prints error message in consistent format
 * Pattern: ❌ message
 */
export function printError(message: string): void {
  console.error(`❌ ${message}`);
}

/**
 * Prints success message in consistent format
 * Pattern: ✅ message
 */
export function printSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

/**
 * Prints warning message in consistent format
 * Pattern: ⚠️ message
 */
export function printWarning(message: string): void {
  console.warn(`⚠️ ${message}`);
}
