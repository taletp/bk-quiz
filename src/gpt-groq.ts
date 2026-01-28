import 'dotenv/config';
import OpenAI from 'openai';
import type { ScrapedQuestion } from './scraper.js';
import { printWarning, printError, delay } from './utils.js';

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
// Groq SDK Configuration
// ============================================================================

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1', // Groq's OpenAI-compatible endpoint
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
  baseDelay: 500,            // 500ms between requests (Groq is very fast)
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
}

interface ApiError {
  status?: number;
  code?: string;
  message?: string;
  error?: {
    message?: string;
    type?: string;
  };
}

function analyzeErrorType(error: unknown): ErrorAnalysis {
  const err = error as ApiError;
  const status = err.status;
  const code = err.code ?? '';
  const message = err.message ?? err.error?.message ?? '';
  const messageLower = message.toLowerCase();

  // Check for quota exhaustion: 429 with quota-related message
  const isQuotaExhausted = status === 429 && (
    messageLower.includes('quota') ||
    messageLower.includes('billing') ||
    messageLower.includes('exceeded') ||
    messageLower.includes('insufficient_quota')
  );

  // Check for rate limit: 429 or RateLimitError code (but not quota)
  const isRateLimit = !isQuotaExhausted && (status === 429 || code === 'RateLimitError');

  // Check for auth error: 401 or AuthenticationError code
  const isAuthError = status === 401 || code === 'AuthenticationError';

  return {
    isRateLimit,
    isQuotaExhausted,
    isAuthError,
    message
  };
}

// ============================================================================
// API Validation
// ============================================================================

/**
 * Validates that Groq API key is set and valid.
 */
export async function validateApiKey(): Promise<boolean> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    printError('❌ GROQ_API_KEY not found in environment variables');
    console.log('   Get a free API key at: https://console.groq.com/keys');
    return false;
  }

  // Accept both gsk_ (standard) and xai_ (xAI variant) prefixes
  if (!apiKey.startsWith('gsk_') && !apiKey.startsWith('xai_')) {
    printError('❌ Invalid GROQ_API_KEY format (should start with "gsk_" or "xai_")');
    return false;
  }

  // Try a test call to validate the key
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Current recommended Groq model
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    });
    return !!response;
  } catch (error) {
    const analysis = analyzeErrorType(error);
    if (analysis.isAuthError) {
      printError('❌ Invalid GROQ_API_KEY');
    } else {
      printError(`❌ Groq API error: ${analysis.message}`);
    }
    return false;
  }
}

// ============================================================================
// Question Analysis
// ============================================================================

/**
 * Analyzes a quiz question using Groq API with exponential backoff retry logic.
 */
export async function analyzeQuestion(
  question: ScrapedQuestion,
  questionNumber: number
): Promise<AnswerResult | null> {
  questionsProcessed++;

  // Apply rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < currentBackoffDelay) {
    const delayNeeded = currentBackoffDelay - timeSinceLastRequest;
    await delay(delayNeeded);
  }

  let lastError: ErrorAnalysis | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= RATE_LIMIT_CONFIG.maxRetries + 1; attempt++) {
    try {
      lastRequestTime = Date.now();
      
      // Build prompt
      const optionsText = question.options
        .map(opt => `${opt.label}. ${opt.text}`)
        .join('\n');
      
      const prompt = `You are a helpful study assistant. Answer the following multiple-choice question.

Question: ${question.questionText}

Options:
${optionsText}

Respond ONLY with:
ANSWER: [letter]
EXPLANATION: [brief explanation]

Example:
ANSWER: B
EXPLANATION: Paris is the capital of France.`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Current recommended Groq model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for more consistent answers
      });

      // Reset backoff on success
      currentBackoffDelay = RATE_LIMIT_CONFIG.baseDelay;

      // Parse response
      const content = response.choices[0]?.message?.content || '';
      const result = parseAnswer(content, question);
      
      return {
        ...result,
        questionIndex: questionNumber,
      };
    } catch (error) {
      lastError = analyzeErrorType(error);
      const isLastAttempt = attempt === RATE_LIMIT_CONFIG.maxRetries + 1;

      if (lastError.isRateLimit && !isLastAttempt) {
        // Exponential backoff
        currentBackoffDelay = Math.min(
          currentBackoffDelay * RATE_LIMIT_CONFIG.backoffMultiplier,
          RATE_LIMIT_CONFIG.maxBackoffDelay
        );
        const waitSeconds = (currentBackoffDelay / 1000).toFixed(1);
        printWarning(`⚠️ Q${questionNumber}: Rate limited (attempt ${attempt}/${RATE_LIMIT_CONFIG.maxRetries + 1}). Waiting ${waitSeconds}s before retry...`);
        await delay(currentBackoffDelay);
      } else if (lastError.isQuotaExhausted) {
        printWarning(`⚠️ Q${questionNumber}: Quota exhausted`);
        if (skipOnRateLimit) {
          failedQuestions.push(questionNumber);
          return {
            questionIndex: questionNumber,
            suggestedAnswer: 'UNKNOWN',
            explanation: 'Skipped (quota exhausted)',
            confidence: 'low',
            selector: '',
          };
        } else {
          throw error;
        }
      } else if (lastError.isAuthError) {
        printError(`❌ Q${questionNumber}: Invalid GROQ_API_KEY`);
        throw error;
      } else if (isLastAttempt) {
        if (skipOnRateLimit) {
          printWarning(`⚠️ Q${questionNumber}: Failed after ${attempt} attempts, skipping...`);
          failedQuestions.push(questionNumber);
          return {
            questionIndex: questionNumber,
            suggestedAnswer: 'UNKNOWN',
            explanation: `Failed after ${attempt} attempts: ${lastError.message}`,
            confidence: 'low',
            selector: '',
          };
        } else {
          throw error;
        }
      }
    }
  }

  // Fallback (should not reach here)
  return {
    questionIndex: questionNumber,
    suggestedAnswer: 'UNKNOWN',
    explanation: lastError?.message || 'Unknown error',
    confidence: 'low',
    selector: '',
  };
}

// ============================================================================
// Answer Parsing
// ============================================================================

interface ParsedAnswer {
  suggestedAnswer: string;
  explanation: string;
  confidence: "high" | "low";
  selector: string;
}

/**
 * Parses GPT response to extract answer letter and explanation.
 */
function parseAnswer(content: string, question: ScrapedQuestion): ParsedAnswer {
  const lines = content.split('\n');
  let answer = 'UNKNOWN';
  let explanation = '';

  for (const line of lines) {
    if (line.startsWith('ANSWER:')) {
      const match = line.match(/ANSWER:\s*([A-Za-z])/);
      if (match) {
        answer = match[1].toUpperCase();
      }
    } else if (line.startsWith('EXPLANATION:')) {
      explanation = line.replace('EXPLANATION:', '').trim();
    }
  }

  // Find matching selector
  const selectedOption = question.options.find(
    opt => opt.label.toUpperCase() === answer.toUpperCase()
  );
  const selector = selectedOption?.selector || '';

  // Confidence is high only if we found a valid answer letter
  const confidence = answer !== 'UNKNOWN' ? 'high' : 'low';

  return {
    suggestedAnswer: answer,
    explanation,
    confidence,
    selector,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function resetQuestionCounter(): void {
  questionsProcessed = 0;
  failedQuestions.length = 0;
}

export function getQuestionsProcessed(): number {
  return questionsProcessed;
}

export function getFailedQuestions(): number[] {
  return failedQuestions;
}

export function setSkipOnRateLimit(skip: boolean): void {
  skipOnRateLimit = skip;
}
