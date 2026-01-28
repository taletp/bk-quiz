import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { printSuccess, printWarning } from './utils.js';

// ============================================================================
// Types
// ============================================================================

export interface ExportedAnswer {
  questionNumber: number;
  question: string;
  options: Array<{
    letter: string;
    text: string;
  }>;
  suggestedAnswer: string;
  explanation: string;
  confidence: "high" | "low";
}

export interface ExportOptions {
  format?: 'txt' | 'json' | 'csv';
  includeExplanations?: boolean;
  timestamp?: boolean;
  outputDir?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_EXPORT_DIR = './quiz-answers';
const DEFAULT_FORMAT = 'txt';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Exports answers to a file
 */
export function exportAnswers(
  answers: ExportedAnswer[],
  quizUrl: string,
  options: ExportOptions = {}
): string {
  const {
    format = DEFAULT_FORMAT,
    includeExplanations = true,
    timestamp = true,
    outputDir = DEFAULT_EXPORT_DIR
  } = options;

  // Create output directory if needed
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename
  const filename = generateFilename(quizUrl, format, timestamp);
  const filepath = path.join(outputDir, filename);

  // Export based on format
  let content: string;
  switch (format) {
    case 'json':
      content = exportAsJson(answers, quizUrl, timestamp);
      break;
    case 'csv':
      content = exportAsCsv(answers, includeExplanations);
      break;
    case 'txt':
    default:
      content = exportAsTxt(answers, quizUrl, includeExplanations, timestamp);
  }

  // Write to file
  writeFileSync(filepath, content, 'utf-8');
  
  printSuccess(`✅ Answers exported to: ${filepath}`);
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Questions: ${answers.length}`);

  return filepath;
}

// ============================================================================
// Format Handlers
// ============================================================================

/**
 * Export as plain text format
 */
function exportAsTxt(
  answers: ExportedAnswer[],
  quizUrl: string,
  includeExplanations: boolean,
  timestamp: boolean
): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(80));
  lines.push('QUIZ ANSWERS EXPORT');
  lines.push('═'.repeat(80));
  lines.push('');

  if (timestamp) {
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push('');
  }

  lines.push(`Quiz URL: ${quizUrl}`);
  lines.push(`Total Questions: ${answers.length}`);
  lines.push(`Answered: ${answers.filter(a => a.suggestedAnswer !== 'UNKNOWN').length}`);
  lines.push(`Skipped: ${answers.filter(a => a.suggestedAnswer === 'UNKNOWN').length}`);
  lines.push('');

  lines.push('─'.repeat(80));
  lines.push('ANSWERS');
  lines.push('─'.repeat(80));
  lines.push('');

  // Answers
  for (const answer of answers) {
    lines.push(`Q${answer.questionNumber}: ${answer.suggestedAnswer}`);
    lines.push(`Question: ${answer.question}`);
    lines.push('');

    // Options
    for (const opt of answer.options) {
      const marker = opt.letter === answer.suggestedAnswer ? '✓' : ' ';
      lines.push(`  ${marker} ${opt.letter}. ${opt.text}`);
    }

    if (includeExplanations && answer.explanation) {
      lines.push('');
      lines.push(`Explanation: ${answer.explanation}`);
      lines.push(`Confidence: ${answer.confidence}`);
    }

    lines.push('');
    lines.push('─'.repeat(80));
    lines.push('');
  }

  // Footer
  lines.push('═'.repeat(80));
  lines.push('END OF EXPORT');
  lines.push('═'.repeat(80));

  return lines.join('\n');
}

/**
 * Export as JSON format
 */
function exportAsJson(
  answers: ExportedAnswer[],
  quizUrl: string,
  timestamp: boolean
): string {
  const data = {
    metadata: {
      exported: timestamp ? new Date().toISOString() : undefined,
      quizUrl,
      totalQuestions: answers.length,
      answered: answers.filter(a => a.suggestedAnswer !== 'UNKNOWN').length,
      skipped: answers.filter(a => a.suggestedAnswer === 'UNKNOWN').length,
    },
    answers: answers.map(a => ({
      questionNumber: a.questionNumber,
      question: a.question,
      options: a.options,
      suggestedAnswer: a.suggestedAnswer,
      explanation: a.explanation,
      confidence: a.confidence,
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export as CSV format
 */
function exportAsCsv(
  answers: ExportedAnswer[],
  includeExplanations: boolean
): string {
  const lines: string[] = [];

  // Header
  const headers = [
    'Question Number',
    'Question',
    'Suggested Answer',
    'Confidence',
  ];

  if (includeExplanations) {
    headers.push('Explanation');
  }

  lines.push(headers.map(h => `"${h}"`).join(','));

  // Data rows
  for (const answer of answers) {
    const row = [
      answer.questionNumber,
      `"${escapeCsv(answer.question)}"`,
      answer.suggestedAnswer,
      answer.confidence,
    ];

    if (includeExplanations) {
      row.push(`"${escapeCsv(answer.explanation)}"`);
    }

    lines.push(row.join(','));
  }

  return lines.join('\n');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a filename with timestamp
 */
function generateFilename(
  quizUrl: string,
  format: string,
  timestamp: boolean
): string {
  // Extract attempt ID from URL if possible
  const attemptMatch = quizUrl.match(/attempt=(\d+)/);
  const attemptId = attemptMatch ? attemptMatch[1] : 'quiz';

  // Create base filename
  let filename = `quiz-answers-${attemptId}`;

  // Add timestamp if requested
  if (timestamp) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    filename += `-${date}-${time}`;
  }

  // Add extension
  filename += `.${format}`;

  return filename;
}

/**
 * Escapes special characters in CSV values
 */
function escapeCsv(value: string): string {
  return value
    .replace(/"/g, '""') // Double quotes
    .replace(/\n/g, ' ')  // Newlines to spaces
    .replace(/\r/g, '');  // Remove carriage returns
}
