/**
 * Unit tests for answer-bank.ts functions
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AnswerBank } from '../answer-bank.js';
import type { ReviewedAnswer, ReviewData } from '../types.js';

describe('AnswerBank', () => {
  let sampleData: ReviewData;
  
  beforeEach(() => {
    sampleData = {
      sourceUrl: 'https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345',
      quizName: 'Test Quiz',
      extractedAt: new Date().toISOString(),
      totalQuestions: 2,
      answers: [
        {
          questionText: 'What is 2+2?',
          normalizedQuestion: 'what is 2+2?',
          correctAnswer: '4',
          normalizedAnswer: '4',
          correctLetter: 'B',
          allOptions: ['3', '4', '5', '6'],
          questionHash: '7ff1aae1'  // Actual hash for 'what is 2+2?'
        },
        {
          questionText: 'What is the capital of France?',
          normalizedQuestion: 'what is the capital of france?',
          correctAnswer: 'Paris',
          normalizedAnswer: 'paris',
          correctLetter: 'B',
          allOptions: ['London', 'Paris', 'Berlin', 'Madrid'],
          questionHash: '04c861e5'  // Actual hash for 'what is the capital of france?'
        }
      ]
    };
  });

  describe('Constructor', () => {
    it('should create empty bank when no data provided', () => {
      const bank = new AnswerBank();
      expect(bank.size()).toBe(0);
    });

    it('should populate bank with provided data', () => {
      const bank = new AnswerBank(sampleData);
      expect(bank.size()).toBe(2);
    });
  });

  describe('lookup()', () => {
    it('should find answer by exact hash match', () => {
      const bank = new AnswerBank(sampleData);
      const result = bank.lookup('What is 2+2?');
      expect(result).not.toBeNull();
      expect(result?.questionText).toBe('What is 2+2?');
      expect(result?.correctAnswer).toBe('4');
    });

    it('should return null for non-existent question', () => {
      const bank = new AnswerBank(sampleData);
      const result = bank.lookup('What is the meaning of life?');
      expect(result).toBeNull();
    });
  });

  describe('findCorrectOptionIndex()', () => {
    it('should return correct index for exact match', () => {
      const bank = new AnswerBank(sampleData);
      const options = ['3', '4', '5', '6'];
      const index = bank.findCorrectOptionIndex('What is 2+2?', options);
      expect(index).toBe(1); // '4' is at index 1
    });

    it('should handle shuffled options', () => {
      const bank = new AnswerBank(sampleData);
      const options = ['6', '3', '4', '5']; // '4' moved to index 2
      const index = bank.findCorrectOptionIndex('What is 2+2?', options);
      expect(index).toBe(2);
    });

    it('should return null for question not in bank', () => {
      const bank = new AnswerBank(sampleData);
      const options = ['Yes', 'No'];
      const index = bank.findCorrectOptionIndex('What is the meaning of life?', options);
      expect(index).toBeNull();
    });

    it('should return null when correct option not found', () => {
      const bank = new AnswerBank(sampleData);
      const options = ['1', '2', '3', '5']; // Missing '4'
      const index = bank.findCorrectOptionIndex('What is 2+2?', options);
      expect(index).toBeNull();
    });
  });

  describe('size()', () => {
    it('should return correct count', () => {
      const bank = new AnswerBank(sampleData);
      expect(bank.size()).toBe(2);
    });

    it('should return 0 for empty bank', () => {
      const bank = new AnswerBank();
      expect(bank.size()).toBe(0);
    });
  });

  describe('toJSON()', () => {
    it('should serialize to ReviewData', () => {
      const bank = new AnswerBank(sampleData);
      const json = bank.toJSON();
      expect(json).toHaveProperty('answers');
      expect(json.answers.length).toBe(2);
      expect(json.totalQuestions).toBe(2);
    });
  });

  describe('fromFile() and saveTo()', () => {
    it('should save and load correctly', () => {
      const originalBank = new AnswerBank(sampleData);
      const filepath = './test-answer-bank.json';
      
      // Save to file
      originalBank.saveTo(filepath);
      
      // Load from file
      const loadedBank = AnswerBank.fromFile(filepath);
      
      // Verify they match
      expect(loadedBank.size()).toBe(originalBank.size());
      expect(loadedBank.lookup('What is 2+2?')).not.toBeNull();
      expect(loadedBank.lookup('What is the capital of France?')).not.toBeNull();
      
      // Cleanup
      try { require('fs').unlinkSync(filepath); } catch (e) {}
    });
    
    it('should throw error for non-existent file', () => {
      expect(() => AnswerBank.fromFile('./non-existent-file.json')).toThrow();
    });
    
    it('should throw error for invalid JSON', () => {
      const filepath = './invalid.json';
      require('fs').writeFileSync(filepath, 'invalid json', 'utf-8');
      expect(() => AnswerBank.fromFile(filepath)).toThrow();
      require('fs').unlinkSync(filepath);
    });
  });
});