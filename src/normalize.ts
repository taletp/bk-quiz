/**
 * Text normalization and fuzzy matching utilities for question comparison
 */

/**
 * Normalize text for comparison: trim, collapse whitespace, lowercase.
 * Removes leading "a. ", "b. ", etc. prefixes and HTML tags.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .toLowerCase()                            // Lowercase
    .replace(/^[a-z]\.\s*/g, '')             // Remove "a. ", "b. " prefixes
    .replace(/<[^>]+>/g, '')                 // Remove HTML tags
    .trim();
}

/**
 * Generate a deterministic hash from normalized question text.
 * Uses DJB2 hash algorithm (simple, fast, deterministic).
 * Returns hex string (40 characters).
 */
export function hashQuestion(normalizedText: string): string {
  let hash = 5381;
  for (let i = 0; i < normalizedText.length; i++) {
    hash = ((hash << 5) + hash) ^ normalizedText.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
}

/**
 * Calculate Jaccard similarity between two normalized strings.
 * Splits on whitespace, calculates intersection/union of word tokens.
 * Returns similarity score 0.0-1.0
 */
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 0));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 0));
  
  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;
  
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/**
 * Fuzzy match two normalized strings.
 * Returns similarity score 0.0-1.0.
 * Uses Jaccard similarity on word-level tokens.
 */
export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0.0;
  
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  // Exact match
  if (normA === normB) return 1.0;
  
  // Jaccard similarity
  return jaccardSimilarity(normA, normB);
}

/**
 * Check if two question texts refer to the same question.
 * First tries exact hash match, then falls back to fuzzy match.
 * Threshold: >= 0.85 is considered a match.
 */
export function questionsMatch(a: string, b: string, threshold: number = 0.85): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  // Exact match
  if (normA === normB) return true;
  
  // Hash match
  if (hashQuestion(normA) === hashQuestion(normB)) return true;
  
  // Fuzzy match
  return similarityScore(normA, normB) >= threshold;
}
