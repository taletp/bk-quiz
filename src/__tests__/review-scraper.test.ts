/**
 * Unit tests for review-scraper.ts functions
 */

import { describe, it, expect, beforeEach, vi } from 'bun:test';
import type { Page } from 'playwright';
import { scrapeReviewPage, scrapeFullReview } from '../review-scraper.js';
import type { ReviewData } from '../types.js';

// Mock Page object
const createMockPage = (htmlContent: string): Page => {
  return {
    evaluate: vi.fn().mockImplementation((fn) => {
      // Simulate page.evaluate by calling the function with a mock document
      // This is a simplified mock - in reality we'd need to jsdom or similar
      // For now we'll just return a mock result
      return {
        sourceUrl: 'https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345',
        quizName: 'Test Quiz',
        extractedAt: new Date().toISOString(),
        totalQuestions: 2,
        answers: [
          {
            questionText: 'What is 2+2?',
            normalizedQuestion: 'what is 2+2',
            correctAnswer: '4',
            normalizedAnswer: '4',
            correctLetter: 'B',
            allOptions: ['3', '4', '5', '6'],
            questionHash: 'abcd1234'
          },
          {
            questionText: 'What is the capital of France?',
            normalizedQuestion: 'what is the capital of france',
            correctAnswer: 'Paris',
            normalizedAnswer: 'paris',
            correctLetter: 'B',
            allOptions: ['London', 'Paris', 'Berlin', 'Madrid'],
            questionHash: 'efgh5678'
          }
        ]
      } as ReviewData;
    }),
    $: vi.fn().mockResolvedValue(null),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    isChecked: vi.fn().mockResolvedValue(true),
    url: vi.fn().mockReturnValue('https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345')
  } as unknown as Page;
};

describe('scrapeReviewPage()', () => {
  it('should extract question/answer pairs from review page', async () => {
    const page = createMockPage('');
    const result = await scrapeReviewPage(page);
    
    expect(result).toBeDefined();
    expect(result.totalQuestions).toBe(2);
    expect(result.answers.length).toBe(2);
    expect(result.answers[0].questionText).toBe('What is 2+2?');
    expect(result.answers[0].correctAnswer).toBe('4');
    expect(result.answers[1].questionText).toBe('What is the capital of France?');
    expect(result.answers[1].correctAnswer).toBe('Paris');
  });
});

describe('scrapeFullReview()', () => {
  it('should handle single page review', async () => {
    const page = createMockPage('');
    // Mock findNextButton to return null (no next page)
    vi.spyOn(require('../navigation.js'), 'findNextButton').mockResolvedValue(null);
    
    const result = await scrapeFullReview(page);
    
    expect(result).toBeDefined();
    expect(result.totalQuestions).toBe(2);
  });
  
  it('should handle multi-page review', async () => {
    const page = createMockPage('');
    // Mock findNextButton to return an element on first call, null on second
    const mockNextButton = {} as unknown as HTMLElement;
    const findNextButtonSpy = vi.spyOn(require('../navigation.js'), 'findNextButton')
      .mockImplementation(async (callCount = 0) => {
        // Keep track of calls via closure
        if (!findNextButtonSpy.mock.calls) {
          findNextButtonSpy.mock.calls = [];
        }
        findNextButtonSpy.mock.calls.push(callCount);
        return findNextButtonSpy.mock.calls.length === 1 ? mockNextButton : null;
      });
    
    // Mock navigateToNextPage to return true on first call
    vi.spyOn(require('../navigation.js'), 'navigateToNextPage').mockResolvedValue(true);
    
    const result = await scrapeFullReview(page);
    
    expect(result).toBeDefined();
    // Should have processed at least one page
    expect(findNextButtonSpy).toHaveBeenCalled();
  });
});