/**
 * LLM Provider Factory - Switch between OpenAI, Groq, Ollama, etc.
 * 
 * Usage:
 *   export LLM_PROVIDER=ollama  # or openai, groq
 *   bun run start
 */

import type { ScrapedQuestion } from './scraper.js';

export interface AnswerResult {
  questionIndex: number;
  suggestedAnswer: string;    // "A", "B", "C", or "UNKNOWN"
  explanation: string;
  confidence: "high" | "low";
  selector: string;
}

// Dynamically load the appropriate provider
async function loadProvider() {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
  
  switch (provider) {
    case 'ollama':
      return import('./gpt-ollama.js');
    case 'groq':
      // TODO: Create gpt-groq.ts
      console.warn('Groq provider not yet implemented. Falling back to OpenAI.');
      return import('./gpt.js');
    case 'openai':
    default:
      return import('./gpt.js');
  }
}

let providerModule: any = null;

async function initProvider() {
  if (!providerModule) {
    providerModule = await loadProvider();
  }
  return providerModule;
}

export async function analyzeQuestion(
  question: ScrapedQuestion,
  questionNumber: number
): Promise<AnswerResult | null> {
  const provider = await initProvider();
  return provider.analyzeQuestion(question, questionNumber);
}

export async function validateApiKey(): Promise<boolean> {
  const provider = await initProvider();
  return provider.validateApiKey();
}

export function resetQuestionCounter(): void {
  if (providerModule) {
    providerModule.resetQuestionCounter?.();
  }
}

export function getQuestionsProcessed(): number {
  return providerModule?.getQuestionsProcessed?.() || 0;
}

export function getFailedQuestions(): number[] {
  return providerModule?.getFailedQuestions?.() || [];
}

export function setSkipOnRateLimit(skip: boolean): void {
  providerModule?.setSkipOnRateLimit?.(skip);
}

export async function getProviderInfo(): Promise<{
  name: string;
  description: string;
  endpoint?: string;
}> {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
  
  switch (provider) {
    case 'ollama':
      return {
        name: 'Ollama',
        description: 'Local LLM (free, offline)',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
      };
    case 'groq':
      return {
        name: 'Groq',
        description: 'Free cloud LLM (no rate limits)'
      };
    default:
      return {
        name: 'OpenAI',
        description: 'GPT-4o (requires API key)'
      };
  }
}
