/**
 * Unit tests for validation.ts functions
 */

import { describe, it, expect } from 'bun:test';
import { isValidReviewUrl, isValidQuizPageUrl, isValidQuizUrl } from '../validation.js';

describe('isValidReviewUrl()', () => {
  it('should return true for valid review URL with attempt param', () => {
    expect(isValidReviewUrl('https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345')).toBe(true);
  });

  it('should return false for attempt URL (not review)', () => {
    expect(isValidReviewUrl('https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345')).toBe(false);
  });

  it('should return false for review URL without attempt param', () => {
    expect(isValidReviewUrl('https://example.com/review.php')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidReviewUrl('')).toBe(false);
  });

  it('should return false for invalid URL string', () => {
    expect(isValidReviewUrl('not a url')).toBe(false);
  });

  it('should handle various domains', () => {
    expect(isValidReviewUrl('https://lms.example.edu/mod/quiz/review.php?attempt=999')).toBe(true);
    expect(isValidReviewUrl('http://localhost/mod/quiz/review.php?attempt=1')).toBe(true);
  });
});

describe('isValidQuizPageUrl()', () => {
  it('should return true for attempt URL', () => {
    expect(isValidQuizPageUrl('https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345')).toBe(true);
  });

  it('should return true for review URL', () => {
    expect(isValidQuizPageUrl('https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345')).toBe(true);
  });

  it('should return false for random URL', () => {
    expect(isValidQuizPageUrl('https://example.com/some/random/page')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidQuizPageUrl('')).toBe(false);
  });
});

describe('isValidQuizUrl() (backward compatibility)', () => {
  it('should still work for attempt URLs', () => {
    expect(isValidQuizUrl('https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345')).toBe(true);
  });

  it('should return false for review URLs', () => {
    expect(isValidQuizUrl('https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidQuizUrl('https://example.com/')).toBe(false);
  });
});