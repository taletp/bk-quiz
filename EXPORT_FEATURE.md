# 📄 Quiz Answer Export Feature

> Automatically save quiz answers to files in multiple formats (TXT, JSON, CSV) for offline review and record-keeping.

---

## Overview

The export feature automatically saves all quiz answers to a file after processing completes. This allows you to:

- ✅ **Preserve answers** for future review
- ✅ **Track quiz attempts** with timestamps and attempt IDs
- ✅ **Export in multiple formats** (TXT, JSON, CSV)
- ✅ **Import to spreadsheets** (CSV format)
- ✅ **Keep records** for academic integrity compliance
- ✅ **Share results** in human-readable format

---

## Quick Start

By default, when you run the tool:

```bash
bun run start
```

After processing completes, answers are automatically exported to:

```
./quiz-answers/quiz-answers-{ATTEMPT_ID}-{DATE}-{TIME}.txt
```

Example filename:
```
quiz-answers-12345-2025-01-28-14-30-45.txt
```

---

## Output Formats

### 1. TXT Format (Default) 🎯

**Best for:** Human reading, printing, sharing

**Features:**
- Pretty formatting with headers and separators
- Question text and all options listed
- Suggested answer marked with ✓
- Explanations included
- Confidence level shown

**Example output:**
```
════════════════════════════════════════════════════════════════════════════════
QUIZ ANSWERS EXPORT
════════════════════════════════════════════════════════════════════════════════

Exported: 2025-01-28 14:30:45

Quiz URL: https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345
Total Questions: 50
Answered: 50
Skipped: 0

────────────────────────────────────────────────────────────────────────────────
ANSWERS
────────────────────────────────────────────────────────────────────────────────

Q1: B
Question: What is the capital of France?

  ✓ B. Paris
    A. London
    C. Berlin
    D. Madrid

Explanation: Paris is the capital and largest city of France, known for its culture and history.
Confidence: high

────────────────────────────────────────────────────────────────────────────────

Q2: A
[... continues ...]

════════════════════════════════════════════════════════════════════════════════
END OF EXPORT
════════════════════════════════════════════════════════════════════════════════
```

### 2. JSON Format 📊

**Best for:** Programmatic processing, APIs, web integration

**Features:**
- Structured data format
- Metadata section with statistics
- Easy to parse and process
- Can be imported into applications

**Example output:**
```json
{
  "metadata": {
    "exported": "2025-01-28T14:30:45.123Z",
    "quizUrl": "https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345",
    "totalQuestions": 50,
    "answered": 50,
    "skipped": 0
  },
  "answers": [
    {
      "questionNumber": 1,
      "question": "What is the capital of France?",
      "options": [
        { "letter": "A", "text": "London" },
        { "letter": "B", "text": "Paris" },
        { "letter": "C", "text": "Berlin" },
        { "letter": "D", "text": "Madrid" }
      ],
      "suggestedAnswer": "B",
      "explanation": "Paris is the capital and largest city of France, known for its culture and history.",
      "confidence": "high"
    },
    {
      "questionNumber": 2,
      ...
    }
  ]
}
```

### 3. CSV Format 📈

**Best for:** Spreadsheets (Excel, Google Sheets, etc.)

**Features:**
- Standard comma-separated values
- Easy to import to Excel/Sheets
- Can be sorted and filtered
- Includes explanations

**Example output:**
```csv
"Question Number","Question","Suggested Answer","Confidence","Explanation"
1,"What is the capital of France?","B","high","Paris is the capital and largest city of France, known for its culture and history."
2,"What is 2 + 2?","A","high","The sum of 2 + 2 equals 4."
3,"What is the largest planet?","C","high","Jupiter is the largest planet in our solar system."
```

---

## File Organization

All exported files are automatically organized in the `./quiz-answers/` directory:

```
bk-quiz/
├── quiz-answers/
│   ├── quiz-answers-12345-2025-01-28-14-30-45.txt
│   ├── quiz-answers-12346-2025-01-28-15-00-00.json
│   ├── quiz-answers-12347-2025-01-28-15-30-00.csv
│   └── ... (more files)
├── src/
├── package.json
└── README.md
```

The directory is automatically created if it doesn't exist.

---

## Filename Pattern

Each exported file follows this naming convention:

```
quiz-answers-{ATTEMPT_ID}-{DATE}-{TIME}.{FORMAT}
```

**Components:**
- `quiz-answers-` - Fixed prefix
- `{ATTEMPT_ID}` - Extracted from quiz URL (e.g., 12345)
- `{DATE}` - ISO format (YYYY-MM-DD)
- `{TIME}` - 24-hour format (HH-MM-SS)
- `{FORMAT}` - File extension (txt, json, or csv)

**Examples:**
```
quiz-answers-12345-2025-01-28-14-30-45.txt
quiz-answers-54321-2025-01-29-09-15-30.json
quiz-answers-99999-2025-01-30-16-45-00.csv
```

---

## Console Output

When export completes, you'll see:

```
✅ Answers exported to: ./quiz-answers/quiz-answers-12345-2025-01-28-14-30-45.txt
   Format: TXT
   Questions: 50
```

In the final summary:

```
════════════════════════════════════════════════════════════════════════════════
✅ Quiz processing complete!
   Questions answered: 50
   Questions auto-selected: 50
   📄 Export file: ./quiz-answers/quiz-answers-12345-2025-01-28-14-30-45.txt
🔍 Check browser for highlighted answers

👉 Press Enter to close browser, or Ctrl+C to exit immediately.
════════════════════════════════════════════════════════════════════════════════
```

---

## Customization (For Developers)

If you want to customize export behavior, edit the export call in `src/index.ts`:

```typescript
const exportFilePath = exportAnswers(collectedAnswers, quizUrl, {
  format: 'txt',                    // 'txt' | 'json' | 'csv'
  includeExplanations: true,        // Include AI explanations
  timestamp: true,                  // Include export timestamp
  outputDir: './quiz-answers'       // Custom output directory
});
```

### Change Default Format

To export as JSON by default:

```typescript
exportAnswers(collectedAnswers, quizUrl, {
  format: 'json',  // Changed from 'txt'
  includeExplanations: true,
  timestamp: true,
  outputDir: './quiz-answers'
});
```

### Change Output Directory

To save files elsewhere:

```typescript
exportAnswers(collectedAnswers, quizUrl, {
  format: 'txt',
  includeExplanations: true,
  timestamp: true,
  outputDir: './my-quiz-exports'  // Changed directory
});
```

---

## Use Cases

### 1. Study Material

Save quiz answers as reference material for exam prep:

```bash
# Run quiz solver
bun run start

# Answers automatically saved to ./quiz-answers/quiz-answers-*.txt
# Open in text editor or print for studying
```

### 2. Academic Record

Keep records of quiz attempts for compliance:

```bash
# Each run creates timestamped file
ls -la quiz-answers/  # See all previous attempts
```

### 3. Spreadsheet Analysis

Export to CSV and analyze in Excel/Sheets:

```bash
# Export as CSV
# Then open in Excel/Google Sheets
# Sort, filter, and analyze results
```

### 4. Integration with Tools

Use JSON export to integrate with other applications:

```javascript
// Read exported JSON file
const fs = require('fs');
const answers = JSON.parse(fs.readFileSync('./quiz-answers/quiz-answers-*.json'));

// Process or send to your system
console.log(`Quiz ${answers.metadata.quizUrl}`);
console.log(`Answered: ${answers.metadata.answered}`);
```

---

## File Locations

After running the tool, check these locations:

**Linux/macOS:**
```bash
ls -la quiz-answers/
cat quiz-answers/quiz-answers-*.txt
```

**Windows PowerShell:**
```powershell
Get-ChildItem quiz-answers/
Get-Content quiz-answers/quiz-answers-*.txt
```

**Windows File Explorer:**
```
Navigate to: C:\Users\[YourUsername]\Desktop\troll\bk-quiz\quiz-answers\
Double-click .txt file to view
Double-click .csv file to open in Excel
```

---

## Tips & Tricks

### 1. Viewing Files

**Linux/macOS:**
```bash
# View latest export
cat quiz-answers/$(ls -t quiz-answers/ | head -1)

# Open in text editor
nano quiz-answers/quiz-answers-*.txt
```

**Windows PowerShell:**
```powershell
# View latest export
Get-Content (Get-ChildItem quiz-answers/ | Sort-Object LastWriteTime -Descending | Select-Object -First 1)

# Open in Notepad
notepad quiz-answers\quiz-answers-*.txt
```

### 2. Backup Exports

Keep backups of important exports:

```bash
# Create backup
cp quiz-answers/quiz-answers-12345-*.txt backup/quiz-answers-12345-backup.txt

# Or zip all exports
zip -r quiz-exports-backup.zip quiz-answers/
```

### 3. Search Across Exports

Find answers across multiple quiz attempts:

```bash
# Find all exports with "Paris" in them
grep -r "Paris" quiz-answers/

# Count total exports
ls quiz-answers/ | wc -l
```

### 4. Auto-Import to Google Sheets

For CSV files:

1. Create new Google Sheet
2. Click File → Import → Upload
3. Select your CSV file
4. Click Import

---

## Troubleshooting

### Export file not created

**Problem:** No file appears in `./quiz-answers/`

**Solution:**
1. Verify directory was created: `ls -la quiz-answers/`
2. Check permissions: `chmod -R 755 quiz-answers/`
3. Verify answers were collected: Check console output shows "Q1: B", etc.

### Wrong format exported

**Problem:** Got TXT when wanted JSON

**Solution:** The tool exports TXT by default. To change:
1. Edit `src/index.ts` line ~236
2. Change `format: 'txt'` to `format: 'json'`
3. Recompile and run again

### File permissions error

**Problem:** "Permission denied" when saving

**Solution (Linux/macOS):**
```bash
# Make directory writable
chmod -R 755 quiz-answers/

# Or fix permissions on specific file
chmod 644 quiz-answers/quiz-answers-*.txt
```

### Can't open CSV in Excel

**Problem:** CSV file opens wrong in Excel

**Solution:**
1. Open Excel
2. File → Open
3. Select your .csv file
4. Choose "UTF-8" encoding if prompted
5. Click Open

---

## Technical Details

### Export Process

1. **Collection** - Answers collected during quiz processing
2. **Formatting** - Answers formatted based on selected format
3. **Directory Creation** - `./quiz-answers/` created if needed
4. **File Writing** - Content written with UTF-8 encoding
5. **Reporting** - Success message printed to console

### Data Structure

Each exported answer includes:

```typescript
{
  questionNumber: number;      // Q1, Q2, etc.
  question: string;            // Full question text
  options: Array<{             // All options
    letter: string;            // A, B, C, D
    text: string;              // Option text
  }>;
  suggestedAnswer: string;     // AI suggestion (A, B, C, D, or UNKNOWN)
  explanation: string;         // Why this is the answer
  confidence: "high" | "low";  // Confidence level
}
```

### File Size Estimates

- **TXT format:** ~2-3 KB per 10 questions
- **JSON format:** ~3-4 KB per 10 questions
- **CSV format:** ~2-3 KB per 10 questions

(Sizes vary based on question text length)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-28 | Initial release with TXT/JSON/CSV export |

---

## See Also

- 📖 [Main README](./README.md) - Overall documentation
- 🤖 [LLM Providers](./README.md#configuration) - Configure AI providers
- 🔒 [Security Guide](./README.md#configuration) - API key security
- ⚙️ [Architecture](./README.md#architecture) - Technical details

