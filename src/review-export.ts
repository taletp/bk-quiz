/**
 * Review data file export/import utilities
 */

import type { ReviewData } from './types.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { printSuccess, printError } from './utils.js';

/**
 * Save review data to a JSON file in the specified directory.
 * outputDir defaults to './quiz-answers'
 * Create directory if needed
 * Generate filename: `review-{attemptId}-{timestamp}.json`
 *   - Extract attemptId from data.sourceUrl (?attempt=12345)
 *   - Timestamp: ISO format, e.g., 2026-03-15-07-39-24
 * Write data as pretty-printed JSON (indent 2)
 * Print success message with filepath
 * Return filepath
 * @param data - The ReviewData to save
 * @param outputDir - Optional directory to save in (defaults to './quiz-answers')
 * @returns The filepath where the data was saved
 */
export function saveReviewData(data: ReviewData, outputDir: string = './quiz-answers'): string {
  // Create directory if needed
   if (!existsSync(outputDir)) {
     try {
       mkdirSync(outputDir, { recursive: true });
     } catch (error) {
       const errMsg = error instanceof Error ? error.message : String(error);
       throw new Error(`Failed to create directory ${outputDir}: ${errMsg}`);
    }
  }
  
  // Generate filename
  const filename = generateReviewFilename(data.sourceUrl);
  const filepath = path.join(outputDir, filename);
  
   // Write data as pretty-printed JSON
   try {
     writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
     printSuccess(`Review data saved to: ${filepath}`);
     return filepath;
   } catch (error) {
     const errMsg = error instanceof Error ? error.message : String(error);
     throw new Error(`Failed to write review data to ${filepath}: ${errMsg}`);
  }
}

/**
 * Load review data from a JSON file.
 * Read JSON file
 * Parse JSON
 * Validate structure:
 *   - Has `answers` array
 *   - Each answer has: questionText, correctAnswer, normalizedQuestion, normalizedAnswer, allOptions
 * Throw meaningful error if invalid
 * Return ReviewData
 * @param filepath - Path to the JSON file to load
 * @returns The loaded ReviewData
 * @throws Error if file is invalid or missing
 */
export function loadReviewData(filepath: string): ReviewData {
  if (!existsSync(filepath)) {
    throw new Error(`Review file not found: ${filepath}`);
  }
  
   let rawData: any;
   try {
     rawData = JSON.parse(readFileSync(filepath, 'utf-8'));
   } catch (error) {
     const errMsg = error instanceof Error ? error.message : String(error);
     throw new Error(`Invalid JSON in review file ${filepath}: ${errMsg}`);
  }
  
  // Validate structure
  if (!rawData || typeof rawData !== 'object') {
    throw new Error(`Invalid review file structure: root must be an object`);
  }
  
  if (!Array.isArray(rawData.answers)) {
    throw new Error(`Invalid review file structure: missing or invalid answers array`);
  }
  
  // Validate each answer has required fields
  const requiredFields = ['questionText', 'correctAnswer', 'normalizedQuestion', 'normalizedAnswer', 'allOptions'];
  for (let i = 0; i < rawData.answers.length; i++) {
    const answer = rawData.answers[i];
    for (const field of requiredFields) {
      if (!(field in answer) || answer[field] === undefined || answer[field] === null) {
        throw new Error(`Invalid answer at index ${i}: missing or null field '${field}'`);
      }
    }
    
    // Ensure allOptions is an array
    if (!Array.isArray(answer.allOptions)) {
      throw new Error(`Invalid answer at index ${i}: allOptions must be an array`);
    }
  }
  
  // Ensure totalQuestions matches answers length
  if (rawData.totalQuestions !== undefined && rawData.totalQuestions !== rawData.answers.length) {
    console.warn(`Warning: totalQuestions (${rawData.totalQuestions}) does not match answers length (${rawData.answers.length})`);
  }
  
  return rawData as ReviewData;
}

/**
 * List all .json files matching pattern review-*.json in outputDir
 * Sort by modification time (newest first)
 * Return array of full filepaths
 * Return empty array if directory doesn't exist
 * @param outputDir - Optional directory to search in (defaults to './quiz-answers')
 * @returns Array of full filepaths
 */
export function listReviewFiles(outputDir: string = './quiz-answers'): string[] {
   if (!existsSync(outputDir)) {
     return [];
   }
   
   try {
     const fs = require('fs');
     const files = fs.readdirSync(outputDir) as string[];
     const reviewFiles = files
       .filter((file: string) => file.startsWith('review-') && file.endsWith('.json'))
       .map((file: string) => path.join(outputDir, file))
       .filter((file: string) => fs.statSync(file).isFile())
       .sort((a: string, b: string) => {
         const statA = fs.statSync(a);
         const statB = fs.statSync(b);
         return statB.mtimeMs - statA.mtimeMs; // newest first
       });
     
     return reviewFiles;
   } catch (error) {
     const errMsg = error instanceof Error ? error.message : String(error);
     console.warn(`Error listing review files in ${outputDir}: ${errMsg}`);
    return [];
  }
}

/**
 * Helper: Generate review filename from source URL
 * Extract attemptId: sourceUrl.match(/attempt=(\d+)/) → [1]
 * Get timestamp: new Date() → ISO string → remove colons/hyphens
 * Return: `review-${attemptId}-${timestamp}.json`
 * @param sourceUrl - The review page URL
 * @returns Generated filename
 */
export function generateReviewFilename(sourceUrl: string): string {
  // Extract attemptId
  const match = sourceUrl.match(/[?&]attempt=(\d+)/);
  const attemptId = match ? match[1] : 'unknown';
  
  // Get timestamp and format it for filename (remove colons and hyphens)
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-') // Replace colons and dots with hyphens
    .replace(/T/, '-')     // Replace T with hyphen
    .slice(0, 19);         // YYYY-MM-DD-HH-MM-SS
  
  return `review-${attemptId}-${timestamp}.json`;
}
