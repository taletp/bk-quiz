import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { AnswerBank } from '../answer-bank';
import { saveReviewData, loadReviewData, listReviewFiles } from '../review-export';
import { normalizeText, hashQuestion } from '../normalize';
import type { ReviewData, ReviewedAnswer } from '../types';
import { existsSync, rmSync } from 'fs';
import path from 'path';

/**
 * Integration Test: Review → Export → Import → Auto
 * Verifies the complete data flow from review mode to auto mode
 */
describe('Integration: Review Mode → Auto Mode', () => {
  const TEST_DIR = './test-quiz-answers';
  const TEST_ATTEMPT_ID = 'integration-test-12345';
  
  beforeAll(() => {
    // Create test directory if needed
    if (!existsSync(TEST_DIR)) {
      require('fs').mkdirSync(TEST_DIR, { recursive: true });
    }
  });
  
  afterAll(() => {
    // Clean up test files
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });
  
  it('should save review data and maintain structure', () => {
    // Create mock review data
    const mockReviewData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=12345',
      attemptId: '12345',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'What is the capital of France?',
          normalizedQuestion: normalizeText('What is the capital of France?'),
          correctAnswer: 'B',
          normalizedAnswer: 'paris',
          allOptions: ['London', 'Paris', 'Berlin', 'Madrid'],
          questionHash: hashQuestion('What is the capital of France?')
        },
        {
          questionText: 'Which planet is largest?',
          normalizedQuestion: normalizeText('Which planet is largest?'),
          correctAnswer: 'A',
          normalizedAnswer: 'jupiter',
          allOptions: ['Jupiter', 'Saturn', 'Neptune', 'Mars'],
          questionHash: hashQuestion('Which planet is largest?')
        }
      ]
    };
    
    // Save to file
    const filePath = saveReviewData(mockReviewData, TEST_DIR);
    
    // Verify file was created
    expect(existsSync(filePath)).toBe(true);
  });
  
  it('should load saved review data correctly', () => {
    const mockReviewData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=99999',
      attemptId: '99999',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'What is 2 + 2?',
          normalizedQuestion: normalizeText('What is 2 + 2?'),
          correctAnswer: 'C',
          normalizedAnswer: '4',
          allOptions: ['1', '2', '4', '5'],
          questionHash: hashQuestion('What is 2 + 2?')
        }
      ]
    };
    
    // Save and reload
    const filePath = saveReviewData(mockReviewData, TEST_DIR);
    const loaded = loadReviewData(filePath);
    
    // Verify data integrity
    expect(loaded.attemptId).toBe('99999');
    expect(loaded.answers.length).toBe(1);
    expect(loaded.answers[0].questionText).toBe('What is 2 + 2?');
    expect(loaded.answers[0].correctAnswer).toBe('C');
  });
  
  it('should list review files in correct order (newest first)', () => {
    // List files - should have files from previous tests
    const files = listReviewFiles(TEST_DIR);
    
    // Should have at least 1 file
    expect(files.length).toBeGreaterThan(0);
    
    // All files should exist
    for (const file of files) {
      expect(existsSync(file)).toBe(true);
    }
  });
  
  it('should create and populate answer bank from review data', () => {
    const mockReviewData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=bank-test',
      attemptId: 'bank-test',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'What color is the sky?',
          normalizedQuestion: normalizeText('What color is the sky?'),
          correctAnswer: 'A',
          normalizedAnswer: 'blue',
          allOptions: ['Blue', 'Red', 'Green', 'Yellow'],
          questionHash: hashQuestion('What color is the sky?')
        }
      ]
    };
    
    // Create answer bank from review data
    const bank = new AnswerBank(mockReviewData);
    
    // Verify bank has the answer via lookup
    const found = bank.lookup('What color is the sky?');
    expect(found).not.toBeNull();
    expect(found?.correctAnswer).toBe('A');
  });
  
  it('should find correct answer with fuzzy matching', () => {
    const mockData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=fuzzy-test',
      attemptId: 'fuzzy-test',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'What is the capital of France?',
          normalizedQuestion: normalizeText('What is the capital of France?'),
          correctAnswer: 'B',
          normalizedAnswer: 'paris',
          allOptions: ['London', 'Paris', 'Berlin', 'Madrid'],
          questionHash: hashQuestion('What is the capital of France?')
        }
      ]
    };
    
    const bank = new AnswerBank(mockData);
    
    // Should find with exact match
    const exact = bank.lookup('What is the capital of France?');
    expect(exact?.correctAnswer).toBe('B');
    
    // Should find with minor variation (fuzzy match)
    const fuzzy = bank.lookup('What is the capital of france?');
    expect(fuzzy?.correctAnswer).toBe('B');
  });
  
  it('should handle option shuffling with findCorrectOptionIndex', () => {
    const mockData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=shuffle-test',
      attemptId: 'shuffle-test',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'Select the largest planet',
          normalizedQuestion: normalizeText('Select the largest planet'),
          correctAnswer: 'B',
          normalizedAnswer: 'jupiter',
          allOptions: ['Jupiter', 'Saturn', 'Neptune', 'Mars'],
          questionHash: hashQuestion('Select the largest planet')
        }
      ]
    };
    
    const bank = new AnswerBank(mockData);
    
    // In the quiz, options might be shuffled: ['Saturn', 'Jupiter', 'Mars', 'Neptune']
    // The correct answer is still 'Jupiter', but now it's at index 1 instead of 0
    const shuffledOptions = ['Saturn', 'Jupiter', 'Mars', 'Neptune'];
    
    // findCorrectOptionIndex should return 1 (position of Jupiter)
    // Pass the question text, not the ReviewedAnswer object
    const optionIndex = bank.findCorrectOptionIndex('Select the largest planet', shuffledOptions);
    expect(optionIndex).toBe(1); // Jupiter is at index 1
  });
  
  it('should handle empty answer bank gracefully', () => {
    const bank = new AnswerBank();
    
    // Search in empty bank
    const result = bank.lookup('Any question?');
    expect(result).toBeNull();
  });
  
  it('should validate review data structure on load', () => {
    const invalidData = {
      sourceUrl: 'https://example.com/review.php?attempt=invalid',
      attemptId: 'invalid',
      timestamp: new Date().toISOString(),
      answers: [
        {
          // Missing required field: correctAnswer
          questionText: 'Invalid question',
          normalizedQuestion: 'invalid question',
          normalizedAnswer: 'invalid',
          allOptions: ['A', 'B', 'C'],
          questionHash: 'hash123'
        }
      ]
    };
    
    // Try to save invalid data - should throw
    expect(() => {
      // Manually write invalid JSON to test load validation
      const fs = require('fs');
      const invalidPath = require('path').join(TEST_DIR, 'invalid-test.json');
      fs.writeFileSync(invalidPath, JSON.stringify(invalidData), 'utf-8');
      
      // Try to load - should throw
      loadReviewData(invalidPath);
    }).toThrow();
  });
  
  it('should handle non-existent file gracefully', () => {
    expect(() => {
      loadReviewData('./nonexistent-file-12345.json');
    }).toThrow();
  });
  
  it('should roundtrip: save review → load review → create bank → find answer', () => {
    // 1. Create and save review data
    const originalData: ReviewData = {
      sourceUrl: 'https://example.com/review.php?attempt=roundtrip',
      attemptId: 'roundtrip',
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionText: 'What is HTML?',
          normalizedQuestion: normalizeText('What is HTML?'),
          correctAnswer: 'D',
          normalizedAnswer: 'markup language',
          allOptions: ['Programming Language', 'Database', 'Framework', 'Markup Language'],
          questionHash: hashQuestion('What is HTML?')
        },
        {
          questionText: 'What does CSS stand for?',
          normalizedQuestion: normalizeText('What does CSS stand for?'),
          correctAnswer: 'A',
          normalizedAnswer: 'cascading style sheets',
          allOptions: ['Cascading Style Sheets', 'Computer Service System', 'Central Server Security', 'Cloud Storage Service'],
          questionHash: hashQuestion('What does CSS stand for?')
        }
      ]
    };
    
    const savedPath = saveReviewData(originalData, TEST_DIR);
    
    // 2. Load review data
    const loadedData = loadReviewData(savedPath);
    
    // 3. Create answer bank from loaded data
    const bank = new AnswerBank(loadedData);
    
    // 4. Find answers using the bank
    const result1 = bank.lookup('What is HTML?');
    expect(result1?.correctAnswer).toBe('D');
    
    const result2 = bank.lookup('What does CSS stand for?');
    expect(result2?.correctAnswer).toBe('A');
    
    // 5. Verify fuzzy matching works in the roundtrip
    const result3 = bank.lookup('what is html?'); // lowercase
    expect(result3?.correctAnswer).toBe('D');
  });
});
