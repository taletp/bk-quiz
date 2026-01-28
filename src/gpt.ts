import 'dotenv/config';
import OpenAI from 'openai';
import type { ScrapedQuestion } from './scraper.js';
import { printWarning, printError, delay } from './utils.js';
import { isValidApiKey } from './validation.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AnswerResult {
  questionIndex: number;
  suggestedAnswer: string;    // "A", "B", "C", or "UNKNOWN"
  explanation: string;
  confidence: "high" | "low"; // "low" if parsing was uncertain
  selector: string;           // Copied from matching option for overlay use
}

// ============================================================================
// OpenAI SDK Configuration
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,     // 30 second timeout per request
  maxRetries: 0,      // Disable SDK's automatic retry behavior
});

// ============================================================================
// Rate Limiting & Cost Control
// ============================================================================

const MAX_QUESTIONS_PER_RUN = 100;
let questionsProcessed = 0;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  baseDelay: 1000,           // 1 second between requests (default)
  maxRetries: 3,             // Retry up to 3 times on rate limit
  backoffMultiplier: 2,      // Double wait time on each retry
  maxBackoffDelay: 60000,    // Cap at 60 seconds
};

// Track rate limit state
let lastRequestTime = 0;
let currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;

// Skip-on-rate-limit mode and failed questions tracking
let skipOnRateLimit = process.env.SKIP_ON_RATE_LIMIT === 'true';
const failedQuestions: number[] = [];

// ============================================================================
// Error Analysis
// ============================================================================

interface ErrorAnalysis {
  isRateLimit: boolean;
  isQuotaExhausted: boolean;
  isAuthError: boolean;
  message: string;
  retryAfterMs?: number; // Optional: wait time suggested by API
}

interface ApiError {
  status?: number;
  code?: string;
  message?: string;
  error?: {
    message?: string;
    type?: string;
  };
  headers?: {
    'retry-after'?: string;
  };
}

function analyzeErrorType(error: unknown): ErrorAnalysis {
  const err = error as ApiError;
  const status = err.status;
  const code = err.code ?? '';
  const message = err.message ?? err.error?.message ?? '';
  const messageLower = message.toLowerCase();

  // Check for quota exhaustion: must have "quota" or "billing" (not rate limit messages)
  const isQuotaExhausted = status === 429 && (
    messageLower.includes('quota') ||
    messageLower.includes('billing') ||
    messageLower.includes('insufficient_quota')
  ) && !messageLower.includes('requests per minute') && !messageLower.includes('tokens per minute');

  // Check for rate limit: 429 or RateLimitError code (but not quota)
  const isRateLimit = !isQuotaExhausted && (status === 429 || code === 'RateLimitError');

  // Check for auth error: 401 or AuthenticationError code
  const isAuthError = status === 401 || code === 'AuthenticationError';

  // Try to extract wait time from error message or headers
  let retryAfterMs: number | undefined;
  const retryMatch = message.match(/try again in (\d+(?:\.\d+)?)\s*(?:s|ms)/i);
  if (retryMatch) {
    const unit = message.match(/try again in \d+(?:\.\d+)?\s*(s|ms)/i)?.[1] || 's';
    const value = parseFloat(retryMatch[1]);
    retryAfterMs = unit === 'ms' ? value : Math.ceil(value * 1000);
  }

  return {
    isRateLimit,
    isQuotaExhausted,
    isAuthError,
    message,
    retryAfterMs
  };
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Enforces rate limiting between API requests by calculating
 * time to wait based on last request time and configured delay.
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // Get delay from environment variable or use configured delay
  const configuredDelay = parseInt(process.env.REQUEST_DELAY_MS || '', 10) || currentBackoffDelay;
  const timeToWait = Math.max(0, configuredDelay - timeSinceLastRequest);

  if (timeToWait > 0) {
    await delay(timeToWait);
  }

  lastRequestTime = Date.now();
}

export async function validateApiKey(): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Check if key exists and has proper format
  if (!apiKey || !isValidApiKey(apiKey)) {
    printError(
      'Invalid OPENAI_API_KEY format. ' +
      'Expected: sk-xxxxx... (40+ characters)\n' +
      'Check your .env file and ensure the key is correct.'
    );
    return false;
  }
  
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    const errorInfo = analyzeErrorType(error);
    
    if (errorInfo.isQuotaExhausted) {
      printError(
        'OpenAI API quota exhausted. Your account has no remaining credits.\n' +
        'Solutions:\n' +
        '  1. Check your billing status: https://platform.openai.com/account/billing/overview\n' +
        '  2. Add a payment method or purchase credits\n' +
        '  3. Wait for quota reset if on free tier'
      );
    } else if (errorInfo.isAuthError) {
      printError(
        'Invalid OpenAI API key. Authentication failed.\n' +
        'Solutions:\n' +
        '  1. Verify your API key is correct in .env file\n' +
        '  2. Generate a new key at: https://platform.openai.com/api-keys\n' +
        '  3. Ensure the key starts with "sk-"'
      );
    } else {
      printError(
        'Failed to authenticate with OpenAI API.\n' +
        `Error: ${errorInfo.message || 'Unknown error'}\n` +
        'Check your API key and billing at: https://platform.openai.com/account/billing/overview'
      );
    }
    return false;
  }
}

// ============================================================================
// Question Analysis
// ============================================================================

export async function analyzeQuestion(
  question: ScrapedQuestion,
  questionNumber: number
): Promise<AnswerResult | null> {
  // Check 100-question cap
  if (questionsProcessed >= MAX_QUESTIONS_PER_RUN) {
    printWarning(`Reached ${MAX_QUESTIONS_PER_RUN} question limit. Stopping to prevent runaway costs.`);
    return null;
  }

  questionsProcessed++;

  // Apply rate limiting with exponential backoff on retries
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.maxRetries; attempt++) {
    try {
      // Wait for rate limit delay before making request
      await enforceRateLimit();

      // Build prompt with labeled options
      const prompt = buildPrompt(question);
      
      // Prepare message content - support both text-only and image questions
      let messageContent: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[] = [
        { type: "text", text: prompt }
      ];

      // Add image if present
      if (question.hasImage && question.imageBase64) {
        messageContent.push({
          type: "image_url",
          image_url: { url: `data:image/png;base64,${question.imageBase64}` }
        });
      }

      // Call Chat Completions API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 500,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: messageContent
        }]
      });

      // Parse response
      const content = response.choices[0]?.message?.content || "";
      const result = parseResponse(content, question, questionNumber);

      // Reset backoff on success
      currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;
      return result;

    } catch (error) {
      lastError = error;
      const errorInfo = analyzeErrorType(error);

      // Handle quota exhaustion - cannot recover by retrying
      if (errorInfo.isQuotaExhausted) {
        printError(
          `Q${questionNumber}: OpenAI API quota exhausted!\n` +
          'Your account has no remaining credits. Solutions:\n' +
          '  1. Check billing: https://platform.openai.com/account/billing/overview\n' +
          '  2. Add credits or upgrade your plan\n' +
          '  3. Wait for quota reset if on free tier'
        );
        
        if (skipOnRateLimit) {
          printWarning(`Skipping question ${questionNumber} due to quota exhaustion (SKIP_ON_RATE_LIMIT=true)`);
          failedQuestions.push(questionNumber);
          return createUnknownResult(question, questionNumber);
        } else {
          printError(
            'To continue with remaining questions, set SKIP_ON_RATE_LIMIT=true:\n' +
            '  export SKIP_ON_RATE_LIMIT=true'
          );
          process.exit(1);
        }
      }

      // Handle rate limit with retry
      if (errorInfo.isRateLimit && attempt < RATE_LIMIT_CONFIG.maxRetries) {
        // Use wait time from error message if available, otherwise use exponential backoff
        const waitTime = errorInfo.retryAfterMs || 
          Math.min(
            currentBackoffDelay * RATE_LIMIT_CONFIG.backoffMultiplier,
            RATE_LIMIT_CONFIG.maxBackoffDelay
          );
        
        currentBackoffDelay = waitTime;
        
        printWarning(
          `Q${questionNumber}: Rate limited (attempt ${attempt + 1}/${RATE_LIMIT_CONFIG.maxRetries + 1}). ` +
          `Waiting ${(waitTime / 1000).toFixed(1)}s before retry...`
        );
        
        // Wait before retrying
        await delay(waitTime);
        continue;
      }

      // Handle rate limit at final retry
      if (errorInfo.isRateLimit && attempt === RATE_LIMIT_CONFIG.maxRetries) {
        printError(
          `Q${questionNumber}: Rate limited by OpenAI API after ${RATE_LIMIT_CONFIG.maxRetries + 1} attempts.\n` +
          'Your API plan may have strict rate limits. Options:\n' +
          '  1. Wait 1-2 minutes and run again\n' +
          '  2. Upgrade your OpenAI plan for higher limits\n' +
          '  3. Use SKIP_ON_RATE_LIMIT=true to skip failed questions\n' +
          '  4. Increase delays: export REQUEST_DELAY_MS=2000'
        );
        
        if (skipOnRateLimit) {
          printWarning(`Skipping question ${questionNumber} due to rate limit (SKIP_ON_RATE_LIMIT=true)`);
          failedQuestions.push(questionNumber);
          return createUnknownResult(question, questionNumber);
        } else {
          process.exit(1);
        }
      }

      // For other errors, return the error result and don't retry
      return handleError(lastError, question, questionNumber);
    }
  }

  // Should not reach here, but handle just in case
  return handleError(lastError, question, questionNumber);
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildPrompt(question: ScrapedQuestion): string {
  let prompt = `Question: ${question.questionText}\n\nOptions:\n`;

  // Label options with A, B, C, D, etc.
  for (let i = 0; i < question.options.length; i++) {
    const letter = String.fromCharCode(65 + i); // A=65, B=66, etc.
    const optionText = question.options[i].text || "[empty option]";
    prompt += `${letter}. ${optionText}\n`;
  }

  prompt += "\nAnswer with the letter (A, B, C, or D) and brief explanation.";
  return prompt;
}

function parseResponse(
  content: string,
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult | null {
  if (!content.trim()) {
    printWarning(`Q${questionNumber}: Empty response from API`);
    return createUnknownResult(question, questionNumber);
  }

  // Try to extract first letter (A-D) using regex
  // Pattern 1: Letter at start with punctuation/space
  const match1 = content.match(/^([A-D])[.:\s]/i);
  if (match1) {
    const letter = match1[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "high");
  }

  // Pattern 2: Letter with word boundary
  const match2 = content.match(/\b([A-D])\b.*(?:correct|answer)/i);
  if (match2) {
    const letter = match2[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "high");
  }

  // Pattern 3: Any standalone letter A-D in content
  const match3 = content.match(/[^a-z]([A-D])[^a-z]/i);
  if (match3) {
    const letter = match3[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "low");
  }

  // Could not parse answer
  printWarning(`Q${questionNumber}: Could not parse answer from response`);
  return createUnknownResult(question, questionNumber);
}

function createResult(
  letter: string,
  explanation: string,
  question: ScrapedQuestion,
  questionNumber: number,
  confidence: "high" | "low"
): AnswerResult | null {
  // Validate letter is within valid range
  const letterIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
  if (letterIndex < 0 || letterIndex >= question.options.length) {
    printWarning(`Q${questionNumber}: Letter ${letter} out of range (${question.options.length} options)`);
    return createUnknownResult(question, questionNumber);
  }

  const selectedOption = question.options[letterIndex];

  return {
    questionIndex: questionNumber,
    suggestedAnswer: letter,
    explanation: explanation.substring(0, 500), // Limit explanation length
    confidence: confidence,
    selector: selectedOption.selector
  };
}

function createUnknownResult(
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult | null {
  // Return null for unknown results since we can't select an option
  return {
    questionIndex: questionNumber,
    suggestedAnswer: "UNKNOWN",
    explanation: "Could not determine answer",
    confidence: "low",
    selector: "" // No selector for UNKNOWN
  };
}

function handleError(
  error: unknown,
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult | null {
  const err = error as Record<string, unknown> & { status?: number; code?: string; error?: Record<string, unknown> };

  // Check for specific error types
  if (err.status === 401 || err.code === "AuthenticationError") {
    printError('Invalid API key. Check .env file and restart.');
    process.exit(1);
  }

  if (err.status === 429 || err.code === "RateLimitError") {
    printError('Rate limited by OpenAI API. Wait and retry later.');
    process.exit(1);
  }

  if (err.code === "TimeoutError" || err.error?.type === "server_error") {
    printWarning(`Q${questionNumber}: API timeout, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  if (err.status && err.status >= 500) {
    printWarning(`Q${questionNumber}: API server error, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  if (err.code === "context_length_exceeded") {
    printWarning(`Q${questionNumber}: Question too long for API, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  // Generic API error
  printWarning(`Q${questionNumber}: API error - ${(err.message || 'unknown error')}`);
  return createUnknownResult(question, questionNumber);
}

export function resetQuestionCounter(): void {
  questionsProcessed = 0;
}

export function getQuestionsProcessed(): number {
  return questionsProcessed;
}

export function getFailedQuestions(): number[] {
  return [...failedQuestions];
}

export function setSkipOnRateLimit(skip: boolean): void {
  skipOnRateLimit = skip;
}
