import 'dotenv/config';
import type { ScrapedQuestion } from './scraper.js';
import { printWarning, printError } from './utils.js';

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

// Ollama API response types
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

// ============================================================================
// Ollama Configuration
// ============================================================================

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

// Track question count (no limit for local inference, but keep for compatibility)
const MAX_QUESTIONS_PER_RUN = 1000; // Higher limit since it's local
let questionsProcessed = 0;

// Failed questions tracking for compatibility
const failedQuestions: number[] = [];

// ============================================================================
// API Validation (Check if Ollama is running)
// ============================================================================

/**
 * Validates that Ollama server is running and accessible.
 * Makes a simple health check request to the Ollama API.
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    // Check if Ollama server is running by hitting the tags endpoint
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      printError(
        `Ollama server returned status ${response.status}.\n` +
        'Make sure Ollama is running: ollama serve'
      );
      return false;
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    
    // Check if the configured model is available
    const models = data.models || [];
    const modelNames = models.map(m => m.name);
    
    // Normalize model name for comparison (remove :latest suffix if present)
    const normalizedModel = OLLAMA_MODEL.includes(':') ? OLLAMA_MODEL : `${OLLAMA_MODEL}:latest`;
    const hasModel = modelNames.some(name => 
      name === normalizedModel || 
      name === OLLAMA_MODEL ||
      name.startsWith(`${OLLAMA_MODEL}:`)
    );

    if (!hasModel && models.length > 0) {
      printWarning(
        `Model '${OLLAMA_MODEL}' not found. Available models: ${modelNames.join(', ')}\n` +
        `You can pull it with: ollama pull ${OLLAMA_MODEL}`
      );
      // Don't fail - the generate request will pull the model automatically
    }

    return true;
  } catch (error) {
    const err = error as Error;
    
    if (err.name === 'AbortError' || err.message.includes('timeout')) {
      printError(
        'Ollama server connection timeout.\n' +
        'Make sure Ollama is running: ollama serve'
      );
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
      printError(
        `Cannot connect to Ollama at ${OLLAMA_ENDPOINT}.\n` +
        'Solutions:\n' +
        '  1. Start Ollama: ollama serve\n' +
        '  2. Check if running: curl http://localhost:11434/api/tags\n' +
        '  3. Set custom endpoint: OLLAMA_ENDPOINT=http://your-server:11434'
      );
    } else {
      printError(`Ollama connection error: ${err.message}`);
    }
    
    return false;
  }
}

// ============================================================================
// Question Analysis
// ============================================================================

/**
 * Analyzes a quiz question using Ollama local LLM.
 * Sends the question and options to Ollama and parses the response.
 * 
 * @param question - Scraped question data
 * @param questionNumber - 1-based question number for display
 * @returns AnswerResult or null if analysis fails
 */
export async function analyzeQuestion(
  question: ScrapedQuestion,
  questionNumber: number
): Promise<AnswerResult | null> {
  // Check question cap (more relaxed for local inference)
  if (questionsProcessed >= MAX_QUESTIONS_PER_RUN) {
    printWarning(`Reached ${MAX_QUESTIONS_PER_RUN} question limit.`);
    return null;
  }

  questionsProcessed++;

  try {
    // Build prompt with labeled options
    const prompt = buildPrompt(question);

    // Make request to Ollama API
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 500, // Limit response tokens
        },
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout (local LLM can be slow)
    });

    if (!response.ok) {
      const errorText = await response.text();
      printWarning(`Q${questionNumber}: Ollama API error (${response.status}): ${errorText}`);
      return createUnknownResult(question, questionNumber);
    }

    const data = await response.json() as OllamaGenerateResponse;
    const content = data.response || '';

    // Parse response
    return parseResponse(content, question, questionNumber);

  } catch (error) {
    return handleError(error, question, questionNumber);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds the prompt for the LLM with question text and labeled options.
 * Note: Ollama models generally don't support images via the generate API,
 * so we only include text-based questions.
 */
function buildPrompt(question: ScrapedQuestion): string {
  let prompt = `You are a quiz helper. Answer the following multiple choice question.\n\n`;
  prompt += `Question: ${question.questionText}\n\nOptions:\n`;

  // Label options with A, B, C, D, etc.
  for (let i = 0; i < question.options.length; i++) {
    const letter = String.fromCharCode(65 + i); // A=65, B=66, etc.
    const optionText = question.options[i].text || "[empty option]";
    prompt += `${letter}. ${optionText}\n`;
  }

  prompt += `\nRespond with ONLY the letter (A, B, C, or D) of the correct answer, followed by a brief explanation.`;
  prompt += `\nFormat: Start your answer with the letter (e.g., "B. ..." or "B: ..." or just "B")`;
  
  return prompt;
}

/**
 * Parses the LLM response to extract the answer letter and explanation.
 */
function parseResponse(
  content: string,
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult | null {
  if (!content.trim()) {
    printWarning(`Q${questionNumber}: Empty response from Ollama`);
    return createUnknownResult(question, questionNumber);
  }

  // Try to extract first letter (A-D) using regex patterns
  // Pattern 1: Letter at start with punctuation/space
  const match1 = content.match(/^([A-D])[.:\s]/i);
  if (match1) {
    const letter = match1[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "high");
  }

  // Pattern 2: "Answer: X" or "Correct answer: X" or "The answer is X"
  const match2 = content.match(/(?:answer|correct)\s*(?:is|:)\s*([A-D])\b/i);
  if (match2) {
    const letter = match2[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "high");
  }

  // Pattern 3: Letter with word boundary indicating it's the answer
  const match3 = content.match(/\b([A-D])\b.*(?:correct|answer)/i);
  if (match3) {
    const letter = match3[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "high");
  }

  // Pattern 4: Any standalone letter A-D in content (lower confidence)
  const match4 = content.match(/[^a-z]([A-D])[^a-z]/i);
  if (match4) {
    const letter = match4[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "low");
  }

  // Pattern 5: Letter at very start of response
  const match5 = content.trim().match(/^([A-D])/i);
  if (match5) {
    const letter = match5[1].toUpperCase();
    return createResult(letter, content, question, questionNumber, "low");
  }

  // Could not parse answer
  printWarning(`Q${questionNumber}: Could not parse answer from Ollama response`);
  return createUnknownResult(question, questionNumber);
}

/**
 * Creates an AnswerResult from parsed response data.
 */
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

/**
 * Creates an UNKNOWN result for questions that couldn't be analyzed.
 */
function createUnknownResult(
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult {
  return {
    questionIndex: questionNumber,
    suggestedAnswer: "UNKNOWN",
    explanation: "Could not determine answer",
    confidence: "low",
    selector: "" // No selector for UNKNOWN
  };
}

/**
 * Handles errors during question analysis.
 */
function handleError(
  error: unknown,
  question: ScrapedQuestion,
  questionNumber: number
): AnswerResult | null {
  const err = error as Error & { name?: string; cause?: unknown };

  if (err.name === 'AbortError' || err.message.includes('timeout')) {
    printWarning(`Q${questionNumber}: Ollama request timeout (model may be loading), skipping`);
    failedQuestions.push(questionNumber);
    return createUnknownResult(question, questionNumber);
  }

  if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
    printError(
      `Q${questionNumber}: Cannot connect to Ollama.\n` +
      'Make sure Ollama is running: ollama serve'
    );
    failedQuestions.push(questionNumber);
    return createUnknownResult(question, questionNumber);
  }

  // Generic error
  printWarning(`Q${questionNumber}: Ollama error - ${err.message || 'unknown error'}`);
  failedQuestions.push(questionNumber);
  return createUnknownResult(question, questionNumber);
}

// ============================================================================
// Utility Exports (for compatibility with gpt.ts)
// ============================================================================

/**
 * Resets the question counter. Called between quiz runs.
 */
export function resetQuestionCounter(): void {
  questionsProcessed = 0;
}

/**
 * Returns the number of questions processed in current run.
 */
export function getQuestionsProcessed(): number {
  return questionsProcessed;
}

/**
 * Returns list of question numbers that failed during analysis.
 */
export function getFailedQuestions(): number[] {
  return [...failedQuestions];
}

/**
 * No-op for Ollama (no rate limiting needed for local inference).
 * Kept for API compatibility with gpt.ts.
 */
export function setSkipOnRateLimit(_skip: boolean): void {
  // No-op: Ollama doesn't have rate limits
}
