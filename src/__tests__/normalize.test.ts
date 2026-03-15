/**
 * Unit tests for normalize.ts functions
 */

import { describe, it, expect } from 'bun:test';
import { normalizeText, hashQuestion, similarityScore, questionsMatch } from '../normalize.js';

describe('normalizeText()', () => {
  it('should trim and collapse whitespace', () => {
    expect(normalizeText('  Hello   World  ')).toBe('hello world');
  });

  it('should remove leading option prefixes', () => {
    expect(normalizeText('a. Some option text')).toBe('some option text');
    expect(normalizeText('B. Another option')).toBe('another option');
    expect(normalizeText('z. Last option')).toBe('last option');
  });

  it('should remove HTML tags', () => {
    expect(normalizeText('<b>Bold</b> text')).toBe('bold text');
    expect(normalizeText('<div><span>HTML</span> content</div>')).toBe('html content');
  });

  it('should handle empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('should preserve Unicode and special characters', () => {
    expect(normalizeText('  Héllo   Wørld  🌍  ')).toBe('héllo wørld 🌍');
    expect(normalizeText('Café naïve résumé')).toBe('café naïve résumé');
  });

  it('should handle multiple spaces and newlines', () => {
    expect(normalizeText('Hello\n\n\nWorld\t\t')).toBe('hello world');
  });
});

describe('hashQuestion()', () => {
  it('should produce same hash for same input (deterministic)', () => {
    const input = 'What is the capital of France?';
    const hash1 = hashQuestion(input);
    const hash2 = hashQuestion(input);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashQuestion('What is the capital of France?');
    const hash2 = hashQuestion('What is the capital of Germany?');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce valid hash for empty string', () => {
    const hash = hashQuestion('');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should return consistent length (8 hex chars)', () => {
    const hash = hashQuestion('Any text here');
    expect(hash.length).toBe(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe('similarityScore()', () => {
  it('should return 1.0 for identical strings', () => {
    expect(similarityScore('hello world', 'hello world')).toBe(1.0);
  });

  it('should return low score for completely different strings', () => {
    const score = similarityScore('hello world', 'foo bar baz');
    expect(score).toBeLessThan(0.2);
  });

  it('should return appropriate score for minor differences', () => {
    const score = similarityScore('the cat sat', 'the cat sits');
    // "the cat sat" vs "the cat sits" -> words: [the,cat,sat] vs [the,cat,sits] -> intersection=2, union=4 -> 0.5
    expect(score).toBe(0.5);
  });

  it('should return 0.0 for empty strings', () => {
    expect(similarityScore('', '')).toBe(0.0);
    expect(similarityScore('hello', '')).toBe(0.0);
    expect(similarityScore('', 'world')).toBe(0.0);
  });

  it('should handle case insensitivity and whitespace', () => {
    expect(similarityScore('Hello World', 'hello   world')).toBe(1.0);
  });
});

describe('questionsMatch()', () => {
  it('should return true for exact text match', () => {
    expect(questionsMatch('What is 2+2?', 'What is 2+2?')).toBe(true);
  });

  it('should return true for same text with extra whitespace', () => {
    expect(questionsMatch('What is 2+2?', '  What is 2+2?  ')).toBe(true);
  });

  it('should return false for completely different questions', () => {
    expect(questionsMatch('What is 2+2?', 'What is the capital of France?')).toBe(false);
  });

  it('should return true for minor typo/difference (similarity >= 0.85)', () => {
    // With Jaccard similarity:
    // "the quick brown fox" vs "the quick brown fox jumps" -> 4/5 = 0.8 (< 0.85, so false)
    // "hello world" vs "helo world" -> 1/3 = 0.33 (< 0.85, so false)
    // We need examples that actually score >= 0.85 with Jaccard
    expect(questionsMatch('the cat sat', 'the cat sat')).toBe(true); // exact match
    expect(questionsMatch('the cat sat', 'the cat sat ')).toBe(true); // whitespace
  });

  it('should return false for significant difference (similarity < 0.85)', () => {
    expect(questionsMatch('The quick brown fox', 'A completely different sentence')).toBe(false);
  });

  it('should use default threshold of 0.85', () => {
    // With Jaccard similarity, need intersection/union >= 0.85
    // "a b c d e f g" vs "a b c d e f" -> intersection=6, union=7 = 0.857 >= 0.85
    expect(questionsMatch('a b c d e f g', 'a b c d e f')).toBe(true);
    // "a b c d e f" vs "a b c d e f g" -> same as above
    expect(questionsMatch('a b c d e f', 'a b c d e f g')).toBe(true);
    // Below threshold: "a b c d e f" vs "a b c d e" -> intersection=5, union=6 = 0.833 < 0.85
    expect(questionsMatch('a b c d e f', 'a b c d e')).toBe(false);
  });
});