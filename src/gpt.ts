import 'dotenv/config';
import OpenAI from 'openai';
import type { ScrapedQuestion } from './scraper.js';

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

// ============================================================================
// API Key Validation
// ============================================================================

export async function validateApiKey(): Promise<boolean> {
  try {
    await openai.models.list();  // Simple API call to verify key
    return true;
  } catch (error) {
    console.error("❌ Invalid OPENAI_API_KEY. Please check your .env file.");
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
    console.warn(`⚠️ Reached ${MAX_QUESTIONS_PER_RUN} question limit. Stopping to prevent runaway costs.`);
    return null;
  }

  questionsProcessed++;

  try {
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

    return result;

  } catch (error) {
    return handleError(error, question, questionNumber);
  }
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
    console.warn(`⚠️ Q${questionNumber}: Empty response from API`);
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
  console.warn(`⚠️ Q${questionNumber}: Could not parse answer from response`);
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
    console.warn(`⚠️ Q${questionNumber}: Letter ${letter} out of range (${question.options.length} options)`);
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
    console.error("❌ Invalid API key. Check .env file.");
    process.exit(1);
  }

  if (err.status === 429 || err.code === "RateLimitError") {
    console.error("⚠️ Rate limited. Wait and retry.");
    process.exit(1);
  }

  if (err.code === "TimeoutError" || err.error?.type === "server_error") {
    console.warn(`⚠️ Q${questionNumber}: Timeout, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  if (err.status && err.status >= 500) {
    console.warn(`⚠️ Q${questionNumber}: API error, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  if (err.code === "context_length_exceeded") {
    console.warn(`⚠️ Q${questionNumber}: Question too long, skipping`);
    return createUnknownResult(question, questionNumber);
  }

  // Generic API error
  console.warn(`⚠️ Q${questionNumber}: API error - ${(err.message || 'unknown error')}`);
  return createUnknownResult(question, questionNumber);
}

export function resetQuestionCounter(): void {
  questionsProcessed = 0;
}

export function getQuestionsProcessed(): number {
  return questionsProcessed;
}
