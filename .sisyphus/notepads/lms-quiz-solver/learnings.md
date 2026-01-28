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

