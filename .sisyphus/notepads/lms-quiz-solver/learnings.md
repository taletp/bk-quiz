# Learnings & Conventions

This file tracks discovered patterns, conventions, and best practices.

---

## Task 1: Project Setup & Configuration

### Key Learnings

1. **Bun Project Initialization**
   - `bun init -y` automatically creates package.json, tsconfig.json, .gitignore, and index.ts
   - Bun's default tsconfig.json is production-ready with proper JSX and module settings
   - We had to override tsconfig.json to match the planned strict mode configuration

2. **Dependency Installation**
   - Playwright, OpenAI, and dotenv all installed successfully with `bun add`
   - Playwright requires Chromium browser to be installed separately via `bunx playwright install chromium`
   - Browser installation takes ~3-5 minutes but includes Chrome, FFmpeg, and other necessary binaries

3. **Project Structure**
   - Created src/ directory for TypeScript source files
   - .env.example pattern used to document required environment variables
   - Package.json "start" script points to src/index.ts for easy execution

4. **Git Repository Setup**
   - Directory was not a git repo initially, required `git init`
   - Pre-existing .gitignore already covered node_modules/, dist/, and .env patterns
   - Initial commit includes package.json, tsconfig.json, .env.example, and src/ directory

5. **Bun Package Manager Conventions**
   - Uses "module": "index.ts" in package.json (not "main")
   - Uses "type": "module" for ES modules
   - Scripts use `bun run` instead of `npm run` (but both work)

### Dependencies Installed

- **playwright@1.58.0**: Browser automation framework
- **openai@6.16.0**: OpenAI API client
- **dotenv@17.2.3**: Environment variable management
- **Chromium (v145.0.7632.6)**: Browser engine for Playwright

### Files Created/Modified

- ✅ package.json: Added "start" script
- ✅ tsconfig.json: Replaced with strict mode configuration
- ✅ .env.example: Created with OPENAI_API_KEY placeholder
- ✅ src/: Created directory (empty, ready for implementation)
- ✅ Git repository initialized and initial commit made

---

## Task 2: Browser Automation - Launch & Login Wait

### Key Learnings

1. **Playwright Browser Lifecycle**
   - `chromium.launch({ headless: false })` launches visible browser window
   - Browser instance must be kept alive to maintain page state
   - Ctrl+C handler attached to process.SIGINT for graceful cleanup

2. **Readline Integration with Bun**
   - Node.js readline module works natively with Bun via `import * as readline from 'node:readline'`
   - `readline.createInterface()` with stdin/stdout blocks until user input received
   - Pattern: create interface → question → close → resolve promise

3. **Bun Readline Compatibility**
   - All Node.js readline features supported (question, line, close)
   - No need for Bun.prompt() - standard Node.js pattern preferred for consistency

### Files Created/Modified
- ✅ src/browser.ts: Browser launcher with login wait
- ✅ Exported: launchBrowser() returning { browser, page }

---

## Task 3: Quiz Page Navigation & Pagination

### Key Learnings

1. **URL Validation Pattern**
   - Quiz attempt URLs require BOTH conditions:
     - Must contain `/mod/quiz/attempt.php`
     - Must contain `attempt=` parameter (quiz instance ID)
   - This pattern works across Moodle versions (3.x, 4.x)

2. **Next Button Selector Priority List**
   - Moodle 4.x uses: `input[name="next"][type="submit"]` (form button)
   - Moodle 3.x uses: `a.mod_quiz-next-nav` (link element)
   - Fallback options: generic input or button with text
   - Must check `.isVisible()` to avoid hidden form elements

3. **Navigation Wait Strategy**
   - Two-phase wait required:
     1. `page.waitForURL()` - detects that URL changed from current
     2. `page.waitForSelector('.que')` - confirms questions loaded on new page
   - Both waits have 10-second timeout to prevent hanging
   - Timeouts are warning-level, not fatal (continue processing)

4. **Infinite Loop Prevention**
   - PageTracker class uses Set<string> to store processed page URLs
   - URL with query parameters is unique identifier (handles pagination)
   - Simple check: `if (processedPages.has(url)) break;`
   - Pattern works because Moodle pagination changes URL parameter on each page

5. **Readline URL Input Pattern**
   - Consistent with browser.ts pattern (reusable utility)
   - `promptForQuizUrl()` returns trimmed string
   - Integrates seamlessly with async/await flow

### Files Created/Modified
- ✅ src/navigation.ts: URL validation, button finding, page tracking
- ✅ Exported functions:
  - promptForQuizUrl() - readline-based URL input
  - isQuizAttemptPage(url) - URL validation
  - findNextButton(page) - selector priority search
  - navigateToNextPage(page) - click + wait strategy
  - PageTracker class - infinite loop prevention

### TypeScript Compilation
- ✅ All exports verified (grep check passed)
- ✅ tsc --noEmit returns no errors
- ✅ Playwright types properly imported (Page, ElementHandle)

---


## Task 4: Question Scraper Module

### Key Learnings

1. **Question ID Extraction**
   - Moodle containers have id="question-{attemptId}-{questionId}" pattern
   - Always prefer actual DOM id attribute over index-based fallback
   - Fallback pattern: `que-index-{index}` when id missing or malformed
   - Full ID preserved for uniqueness across quiz attempts

2. **Option Selector Strategy (Two-Phase)**
   - **Primary**: `#${questionId} .answer label:nth-child(${index + 1})`
     - Targets label elements specifically (not mixed tags)
     - Uses :nth-child for deterministic DOM order
     - Works across Moodle 3.x and 4.x themes
   - **Fallback**: `#${questionId} input[type="radio"]:nth-of-type(${index + 1})`
     - Used when primary selector validation fails
     - Targets radio button inputs directly
   - **Validation**: Each selector tested with page.$() before storage
   - Empty string stored if both strategies fail (logs warning)

3. **Multi-Select Detection**
   - Skip questions with `multianswer` class
   - Skip questions with `input[type="checkbox"]` elements
   - Logged as warnings with clear reason (not errors)
   - Questions silently removed from final array (not included with empty data)

4. **Screenshot Capture Strategy**
   - Target: Entire question container (`#${questionId}`), not just images
   - Includes: question text, all images, AND answer options
   - Format: Base64-encoded PNG string
   - Error handling: Warnings logged, imageBase64 left undefined on failure
   - Rationale: GPT-4o needs full context, not isolated image

5. **DOM Extraction Pattern**
   - Use page.evaluate() for in-browser extraction (raw data only)
   - Build selectors and validate in Node.js context (async operations)
   - Rationale: page.evaluate() cannot call async Playwright APIs
   - Two-pass approach: extract raw → validate/enhance → return structured

6. **Option Labeling Convention**
   - Labels assigned by DOM order: 0→A, 1→B, 2→C, 3→D
   - Formula: `String.fromCharCode(65 + index)`
   - NOT extracted from DOM (Moodle doesn't provide labels)
   - Consistent across all themes and Moodle versions

7. **Question Filtering**
   - Skip multi-select (checkboxes) → log warning with "multi-select" reason
   - Skip questions with <2 options → log warning with "insufficient-options" reason
   - Both filters applied in page.evaluate() phase (early rejection)
   - Final array contains only valid single-choice MCQs

### TypeScript Types

```typescript
interface Option {
  label: string;    // "A", "B", "C", etc.
  text: string;     // Option text content
  selector: string; // CSS selector (validated)
}

interface ScrapedQuestion {
  index: number;        // 0-based page index
  questionId: string;   // "question-{attempt}-{id}" or "que-index-{i}"
  questionText: string;
  options: Option[];
  hasImage: boolean;
  imageBase64?: string; // Base64 PNG (only if hasImage=true)
}
```

### Files Created/Modified
- ✅ src/scraper.ts: Full scraper implementation with selector validation
- ✅ Exported: Option, ScrapedQuestion interfaces
- ✅ Exported: scrapeQuestions(page: Page) async function
- ✅ TypeScript compilation clean (bunx tsc --noEmit)

### Key Functions

1. **getQuestionId(container)**: Extracts question ID from DOM container
2. **isMultiSelect(container)**: Detects checkbox-based questions
3. **buildOptionSelector(questionId, index)**: Builds primary label selector
4. **buildFallbackSelector(questionId, index)**: Builds fallback radio selector
5. **validateSelector(page, selector)**: Async validation via page.$()
6. **captureQuestionScreenshot(page, questionId)**: Screenshots entire container
7. **scrapeQuestions(page)**: Main orchestration function

### Selector Validation Pattern
```typescript
let selector = buildOptionSelector(questionId, i);
if (!await validateSelector(page, selector)) {
  selector = buildFallbackSelector(questionId, i);
  if (!await validateSelector(page, selector)) {
    console.warn(`Could not build stable selector`);
    selector = ''; // Mark invalid
  }
}
```

### Why NOT Use *:nth-of-type
- `*` matches any element type
- `:nth-of-type` counts elements of same type only
- Combined behavior unpredictable with mixed tags
- Solution: Target specific element type (`label:nth-child`)

---


## Task 8: Main Entry Point & Orchestration

### Key Learnings

1. **Orchestration Flow**
   - Entry point coordinates all modules: browser → navigation → scraper → gpt → overlay
   - 6-step flow: launch → login → prompt URL → validate → process pages → review
   - Each step has clear success/failure paths with exitWithError pattern
   - Browser stays open throughout entire process for user review

2. **Error Handling Strategy**
   - `exitWithError(browser, message)` pattern provides graceful failures
   - Always prints error message, waits for Enter, closes browser, then exits(1)
   - Prevents orphaned browser processes on error conditions
   - User gets time to read error before cleanup happens

3. **Console Output Formatting**
   - Inline formatting (no separate output.ts module) keeps code simple
   - Unicode box drawing (━) creates visual separators
   - Emoji indicators (🎯, 📝, ⚠️, ✅) improve readability
   - Question text truncated to 100 chars to prevent terminal overflow
   - Consistent 80-character separator width

4. **Question Counter Persistence**
   - Counter variable `totalProcessed` persists across ALL pages (not reset per page)
   - 100-question cap checked at start of each question iteration
   - gpt.ts module has internal counter but main loop also tracks for display
   - Break from inner loop stops processing but allows highlight application

5. **Highlight Application Timing**
   - Highlights collected per-page, then applied once per page (batch operation)
   - Applied AFTER all questions on current page processed
   - Prevents DOM thrashing from repeated style injections
   - Requires filtering out UNKNOWN results (no valid selector)

6. **Page Navigation Loop**
   - While-true loop with multiple break conditions:
     - PageTracker detects revisited page
     - 100-question cap reached
     - No Next button found (last page)
     - navigateToNextPage() returns false (navigation failed)
   - PageTracker.markAsProcessed() called BEFORE scraping (prevents duplicate work)

7. **Browser Lifecycle Management**
   - SIGINT handler inherited from browser.ts (global browserRef)
   - Main function has catch-all error handler for unexpected failures
   - Final browser.close() always called before process.exit()
   - User controls timing of browser closure via Enter keypress

8. **Readline Utility Reuse**
   - `waitForEnter()` function duplicated from browser.ts for local use
   - Could be refactored to shared utility module, but duplication acceptable for simplicity
   - Pattern: create interface → question → close → resolve promise
   - Used for both user input (quiz URL) and flow control (press Enter to continue)

### TypeScript Compilation
- ✅ bunx tsc --noEmit passes with no errors
- ✅ All module imports resolve correctly (.js extensions for ESM)
- ✅ Type inference works for ScrapedQuestion, AnswerResult, HighlightData

### Files Created/Modified
- ✅ src/index.ts: Main entry point with full orchestration
- ✅ Imports all modules: browser, navigation, scraper, gpt, overlay
- ✅ Implements: waitForEnter, exitWithError, printFormattedAnswer helpers
- ✅ Main flow: 6 steps from launch to cleanup

### Console Output Examples

**Success Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 1/100
What is the capital of France?

Options:
  A. London
  B. Paris
  C. Berlin
  D. Madrid

🎯 Suggested Answer: B
📝 Explanation: Paris is the capital and most populous city of France.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Final Summary:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Quiz processing complete!
   Questions answered: 45
   Questions skipped: 0
🔍 Check browser for highlighted answers

👉 Press Enter to close browser, or Ctrl+C to exit immediately.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Integration Points

1. **browser.ts** → `launchBrowser()` returns { browser, page }
2. **navigation.ts** → `promptForQuizUrl()`, `isQuizAttemptPage()`, `PageTracker`, `findNextButton()`, `navigateToNextPage()`
3. **scraper.ts** → `scrapeQuestions(page)` returns ScrapedQuestion[]
4. **gpt.ts** → `validateApiKey()`, `analyzeQuestion(question, number)` returns AnswerResult | null
5. **overlay.ts** → `applyHighlights(page, highlights)` injects CSS and applies styles

### Why Not Use Multi-File Output Module
- Console formatting is simple enough to inline (~50 lines)
- No reusability benefits (only used once in main flow)
- Keeps dependencies clear (no circular imports)
- Easier to maintain when all orchestration in one file

---

