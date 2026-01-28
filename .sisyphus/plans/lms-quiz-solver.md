# LMS Auto Quiz Solver

## TL;DR

> **Quick Summary**: Build a Playwright-based tool that opens HCMUT LMS in a browser, waits for manual login, navigates to a quiz URL, scrapes MCQ questions (including images), sends them to GPT-4o for answers, and displays suggested answers in console + highlights on the page.
> 
> **Deliverables**:
> - CLI tool that launches browser and solves quiz questions
> - Console output with suggested answers
> - Visual overlay highlighting correct answers on quiz page
> - Support for paginated quizzes and image-based questions
> 
> **Estimated Effort**: Medium (1-2 days)
> **Parallel Execution**: NO - sequential (single script development)
> **Critical Path**: Project setup → Browser automation → Scraping → GPT integration → Overlay

---

## Authorization & Use Scope (CRITICAL)

### Authorized Use Only
This tool is designed for **personal study assistance** on quizzes where the user has legitimate access. The user is responsible for:
- Ensuring use complies with their institution's academic integrity policies
- Using the tool only on their own enrolled courses
- Understanding that this is a **study aid**, not a cheating mechanism

### Environment Scope
| Environment | Status | Notes |
|-------------|--------|-------|
| HCMUT LMS (Moodle-based) | IN SCOPE | Primary target |
| Self-hosted Moodle instances | IN SCOPE | Same selectors expected |
| Other LMS platforms | OUT OF SCOPE | Different DOM structure |
| Production exams with proctoring | OUT OF SCOPE | Not designed for proctored environments |

### What This Tool Does NOT Do
- ❌ Does NOT automatically submit answers
- ❌ Does NOT bypass authentication
- ❌ Does NOT work around proctoring software
- ❌ Does NOT hide its browser automation from the page
- User must manually select and submit answers

---

## Context

### Original Request
User wants to create an auto quiz solver for HCMUT LMS (https://lms.hcmut.edu.vn/) that:
- Waits for manual login
- Fetches MCQ questions and answers
- Uses OpenAI to generate correct answers
- Displays answers without auto-submitting

### Interview Summary
**Key Discussions**:
- **LLM Choice**: User chose OpenAI gpt-4o (vision capable) to handle image-based questions
- **Answer Display**: Both console AND webpage overlay with highlighting
- **Login Flow**: User presses Enter in console when done logging in
- **Quiz Format**: Paginated - need to handle page navigation
- **Auto-submit**: Explicitly disabled - user clicks answers manually
- **Session**: Fresh login each time (no persistence)

**Research Findings**:
- **Moodle CSS Selectors Discovered**: `.que.multichoice`, `.qtext`, `.answer label`
- **Reference Implementation**: GPT4Moodle Chrome extension
  - Repository: https://github.com/PrincTwilig/GPT4Moodle
  - Key file: `runer.js` - contains question scraping logic
  - Adapted patterns: Question container detection via `.que` class, answer extraction via `.answer` children
- **Playwright**: Supports headed mode, `page.evaluate()` for overlays, screenshot capture for vision

### Metis Review
**Identified Gaps** (addressed):
- Login detection method: Resolved → User presses Enter in console
- Image handling: Resolved → Use gpt-4o with vision capability
- Pagination: Resolved → Will iterate through quiz pages
- Overlay style: Resolved → Highlight correct option with visual marker

---

## Work Objectives

### Core Objective
Build a CLI tool that automates MCQ quiz answering on HCMUT LMS by scraping questions and using GPT-4o to suggest correct answers, displayed both in console and as visual overlays on the page.

### Concrete Deliverables
- `src/index.ts` - Main entry point with CLI logic
- `src/browser.ts` - Playwright browser management
- `src/scraper.ts` - Moodle quiz question scraper
- `src/gpt.ts` - OpenAI GPT-4o integration
- `src/overlay.ts` - Page overlay injection
- `.env.example` - Environment variable template
- `package.json` - Bun project configuration
- `tsconfig.json` - TypeScript configuration

### Definition of Done
- [ ] `bun run start` launches visible browser
- [ ] Tool waits for Enter keypress after login
- [ ] Accepts quiz URL from console input
- [ ] Navigates through paginated quiz pages
- [ ] Extracts questions including images/screenshots
- [ ] Sends to GPT-4o and receives answers
- [ ] Prints answers to console in readable format
- [ ] Highlights suggested answers on quiz page
- [ ] Browser stays open for user to manually select answers

### Supported Quiz Flow States
| State | URL Pattern | Supported | Behavior |
|-------|-------------|-----------|----------|
| Quiz attempt in progress | `/mod/quiz/attempt.php?attempt=*` | ✅ YES | Process questions on page |
| Quiz summary page | `/mod/quiz/summary.php?attempt=*` | ❌ NO | Show error: "Navigate to a question page" |
| Quiz review (after submit) | `/mod/quiz/review.php?attempt=*` | ⚠️ PARTIAL | Can still scrape, but answers already shown |
| Quiz start page | `/mod/quiz/view.php?id=*` | ❌ NO | Show error: "Start the quiz first, then run tool" |
| Non-quiz page | Any other URL | ❌ NO | Show error: "Not a quiz page" |

### Unsupported State Handling
When the tool encounters an unsupported state:
1. Print clear error message explaining the issue
2. Print expected URL patterns for reference
3. Keep browser open for user to navigate manually
4. User can re-run tool after navigating to correct page

### Must Have
- Headed browser mode (user can see and interact)
- Console prompt for login completion
- Pagination support (Next button handling)
- Image/screenshot capture for vision API
- Both console AND webpage answer display
- Clear answer highlighting on page

### Must NOT Have (Guardrails)
- ❌ Auto-clicking or selecting answers
- ❌ Auto-submitting the quiz
- ❌ Session/cookie persistence
- ❌ Essay, fill-in-blank, or non-MCQ support
- ❌ Multi-select MCQ support (checkboxes) - only single-answer radio buttons
- ❌ Answer caching or history
- ❌ Retry logic for API failures (keep simple)
- ❌ Automated tests (manual testing only)
- ❌ Configuration files beyond `.env`
- ❌ Support for other LMS platforms

---

## Browser Lifecycle Specification

### CRITICAL PRINCIPLE
**The Playwright browser only stays open while the Node/Bun process is running.**
All exit paths must either:
- Block on readline (keep browser open for user)
- OR close browser and exit immediately

There is NO state where "script exits but browser stays open" - this is impossible with standard Playwright.

### Lifecycle Summary Table

| Scenario | Browser State | Script State | User Action |
|----------|--------------|--------------|-------------|
| Login wait | Open | Blocked on readline | Press Enter to continue |
| URL input | Open | Blocked on readline | Enter URL and press Enter |
| Processing questions | Open | Running | Wait |
| Success (all done) | Open | Blocked on readline | Press Enter to close |
| Error: invalid API key | Open | Blocked on readline | Press Enter to close |
| Error: invalid URL | Open | Blocked on readline | Re-run script with correct URL |
| Error: rate limited | Open | Blocked on readline | Press Enter to close |
| Ctrl+C anytime | Closes | Exits immediately | N/A |

### Behavior on Script Completion (Success)
After processing all questions on all pages:
1. Print final summary to console
2. Print message: "Processing complete. Browser will stay open for you to review answers."
3. Print message: "Press Enter to close browser, or Ctrl+C to exit immediately."
4. **Block on readline** (browser stays open)
5. On Enter → close browser gracefully, then exit process
6. On Ctrl+C → immediate process termination (browser closes)

### Behavior on Errors

**All errors follow the same pattern: print error, block on readline, user presses Enter to close.**

| Error Type | Message | Then |
|------------|---------|------|
| Invalid API key | "❌ Invalid OPENAI_API_KEY. Please check your .env file." | Block on Enter → close browser |
| Invalid quiz URL | "❌ This doesn't appear to be a quiz attempt page." | Block on Enter → close browser |
| Rate limited | "❌ Rate limited by OpenAI. Please wait and try again." | Block on Enter → close browser |
| No questions found | "❌ No MCQ questions found on this page." | Block on Enter → close browser |
| Network error | "❌ Network error: {message}" | Block on Enter → close browser |

**Error exit pattern (used everywhere):**
```typescript
async function exitWithError(browser: Browser, message: string): Promise<never> {
  console.error(message);
  console.log('\n👉 Press Enter to close browser and exit.');
  await waitForEnter('');
  await browser.close();
  process.exit(1);
}
```

### Implementation Pattern
```typescript
// Shared readline helper
async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

// Success completion
async function onComplete(browser: Browser): Promise<void> {
  console.log('\n✅ Processing complete. Browser will stay open.');
  console.log('👉 Press Enter to close browser, or Ctrl+C to exit immediately.');
  await waitForEnter('');
  await browser.close();
  process.exit(0);
}

// Ctrl+C handler
let browserRef: Browser | null = null;
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupted.');
  if (browserRef) {
    await browserRef.close().catch(() => {});
  }
  process.exit(0);
});
```

---

## Bun Runtime Compatibility

### Readline in Bun
Bun supports Node.js `readline` module. Use the standard import:
```typescript
import * as readline from 'node:readline';
```

### Confirmed Bun Compatibility
- `readline.createInterface()` - ✅ Supported
- `rl.question()` - ✅ Supported
- `process.stdin` / `process.stdout` - ✅ Supported

### Alternative (Bun-native prompt)
If readline issues occur, Bun has a native prompt:
```typescript
const input = prompt('Enter quiz URL: ');
```
However, `readline` is preferred for consistency with Node.js patterns.

---

## Image Capture Specification

### What Gets Screenshotted
When a question contains images (detected by `<img>` tags in `.qtext`):

**Target Element**: The entire question container (`.que.multichoice`)
- Includes: Question text, all images, AND all answer options
- Rationale: GPT-4o can see the full context including visual elements and option text

**NOT just the image element** because:
- Context is needed to understand what the question asks
- Multiple images may be present
- Image alone without question text is less useful

### Screenshot Configuration
```typescript
async function captureQuestionScreenshot(
  page: Page,
  questionId: string
): Promise<string> {
  const element = await page.$(`#${questionId}`);
  if (!element) throw new Error(`Question ${questionId} not found`);
  
  const screenshot = await element.screenshot({
    type: 'png',
    // Clip to question container bounds
  });
  
  return screenshot.toString('base64');
}
```

### Multi-Image Handling
If a question has multiple `<img>` tags:
- Take ONE screenshot of the entire question container
- All images will be captured in a single screenshot
- No need for multiple screenshots per question

### Text + Image Prompt Structure
```typescript
// For questions with images:
messages: [{
  role: "user",
  content: [
    { 
      type: "text", 
      text: `Question with image below. Options: A. ${opt1} B. ${opt2} C. ${opt3} D. ${opt4}\nAnswer with letter and explanation.`
    },
    { 
      type: "image_url", 
      image_url: { url: `data:image/png;base64,${imageBase64}` } 
    }
  ]
}]
```

### Cost Consideration
- Vision API charges for image tokens (~85 tokens per 512x512 tile)
- Screenshot of question container is typically 1-2 tiles
- Estimated: +$0.01-0.02 per image question

---

## Multi-Select Question Handling

### Detection
Moodle multi-select questions use:
- Class: `.que.multichoice.multianswer` (vs `.que.multichoice` for single)
- Input type: `checkbox` (vs `radio` for single)

### Scope Decision
**Multi-select questions are OUT OF SCOPE for this tool.**

### Behavior
```typescript
function isMultiSelectQuestion(container: Element): boolean {
  return container.classList.contains('multianswer') ||
         container.querySelector('input[type="checkbox"]') !== null;
}

// In scraping:
if (isMultiSelectQuestion(questionContainer)) {
  console.warn(`⚠️ Question ${index + 1}: Multi-select (checkbox) detected - skipping`);
  continue; // Skip this question
}
```

### Console Output for Skipped Questions
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 3/10
[Multi-select question - SKIPPED]
⚠️ This tool only supports single-answer MCQ questions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Option Mapping Specification (CRITICAL)

### How Answer Options Are Identified

**Step 1: Extract options in DOM order**
Each MCQ question has N options. Extract them in the order they appear in the DOM:
- Position 0 → "A"
- Position 1 → "B"
- Position 2 → "C"
- Position 3 → "D"
- etc.

**Step 2: Build prompt with explicit labels**
```
Question: [question text]

Options:
A. [first option text]
B. [second option text]
C. [third option text]
D. [fourth option text]

Answer with the letter (A, B, C, or D) and brief explanation.
```

**Step 3: Parse GPT response for letter**
- Regex: `/^([A-Z])[.:\s]/` or `/\b([A-Z])\b.*(?:correct|answer)/i`
- If no match found: mark question as "UNKNOWN" in output

**Step 4: Map letter back to DOM element**
- "A" → options[0] (first `.answer` element)
- "B" → options[1]
- etc.

### Handling Edge Cases

| Edge Case | Detection | Behavior |
|-----------|-----------|----------|
| Shuffled options | N/A - we label by DOM position | Works correctly (positions consistent per attempt) |
| Missing options (< 2) | `options.length < 2` | Skip question, log warning |
| Extra options (> 10) | `options.length > 10` | Process all, label A-J |
| Option text empty | `optionText.trim() === ''` | Include as "[empty option]" |
| GPT returns invalid letter | Letter not in A-{lastOption} | Mark as "UNKNOWN", don't highlight |
| GPT returns multiple letters | More than one letter in response | Take the FIRST valid letter |

### Data Structure
```typescript
interface ScrapedQuestion {
  index: number;              // 0-based question index on page
  questionId: string;         // Moodle question ID from DOM (e.g., "question-12345-67890")
  questionText: string;       // Full question text
  options: {
    label: string;            // "A", "B", "C", etc.
    text: string;             // Option text content
    selector: string;         // CSS selector: "#question-xxx .answer label:nth-child(N)"
  }[];
  hasImage: boolean;
  imageBase64?: string;       // Base64 screenshot if hasImage
}

interface AnswerResult {
  questionIndex: number;
  suggestedAnswer: string;    // "A", "B", "C", or "UNKNOWN"
  explanation: string;
  confidence: "high" | "low"; // "low" if parsing was uncertain
  selector: string;           // Copied from matching option for overlay use
}
```

---

## OpenAI API Constraints

### SDK & Model Configuration
```typescript
import OpenAI from 'openai';  // Version: ^4.0.0 (pin in package.json)

// CRITICAL: Disable automatic retries to match "no retry logic" guardrail
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,     // 30 second timeout per request
  maxRetries: 0,      // Disable SDK's automatic retry behavior
});

// API Style: Chat Completions API with image parts (NOT Responses API)
// Reference: https://platform.openai.com/docs/guides/vision#quick-start

// Request configuration
const OPENAI_CONFIG = {
  model: "gpt-4o",
  max_tokens: 500,            // Sufficient for letter + explanation
  temperature: 0.3,           // Low temperature for consistency
};
```

### Rate Limits & Cost Controls
| Constraint | Value | Rationale |
|------------|-------|-----------|
| Timeout per request | 30 seconds | Prevent hanging on slow responses |
| Max tokens per response | 500 | Letter + short explanation only |
| Max questions per run | 100 | Prevent runaway costs |
| Estimated cost per question | ~$0.01-0.03 | With vision, ~1000-3000 input tokens |
| Max cost per quiz (100 questions) | ~$3 | Upper bound estimate |

### 100-Question Cap Enforcement

**Enforcement Point**: In the main processing loop, before sending to GPT.

**Implementation:**
```typescript
const MAX_QUESTIONS_PER_RUN = 100;
let questionsProcessed = 0;

async function processQuestion(question: ScrapedQuestion): Promise<AnswerResult | null> {
  if (questionsProcessed >= MAX_QUESTIONS_PER_RUN) {
    console.warn(`⚠️ Reached ${MAX_QUESTIONS_PER_RUN} question limit. Stopping to prevent runaway costs.`);
    return null; // Signal to stop processing
  }
  
  questionsProcessed++;
  // ... send to GPT
}
```

**When Limit Reached:**
1. Print warning: "⚠️ Reached 100 question limit. Stopping to prevent runaway costs."
2. Stop sending questions to GPT
3. Continue to highlight answers for questions already processed
4. Print summary: "Processed 100/N questions (limit reached)"
5. Block on Enter as normal, then close browser

**Counter Scope**: Across ALL pages (not reset per page). If quiz has 150 questions across 3 pages, only first 100 are processed.

### Failure Behavior

| Failure Type | Detection | User Message | Continue? |
|--------------|-----------|--------------|-----------|
| Invalid API key | `401` or `AuthenticationError` | "❌ Invalid API key. Check .env file." | NO - exit |
| Rate limited | `429` or `RateLimitError` | "⚠️ Rate limited. Wait and retry." | NO - exit |
| Timeout | `TimeoutError` | "⚠️ Q{n}: Timeout, skipping" | YES - skip question |
| Server error | `5xx` or `APIError` | "⚠️ Q{n}: API error, skipping" | YES - skip question |
| Invalid response format | No letter found | "⚠️ Q{n}: Could not parse answer" | YES - mark UNKNOWN |
| Context too long | `context_length_exceeded` | "⚠️ Q{n}: Question too long, skipping" | YES - skip question |

### API Key Validation (Early Check)
Before processing any questions, validate the API key:
```typescript
async function validateApiKey(): Promise<boolean> {
  try {
    await openai.models.list();  // Simple API call to verify key
    return true;
  } catch (error) {
    console.error("❌ Invalid OPENAI_API_KEY. Please check your .env file.");
    return false;
  }
}
```

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (fresh project)
- **User wants tests**: NO (manual testing only)
- **Framework**: None
- **QA approach**: Manual verification with user's own Moodle quiz pages

### Concrete Verification Examples

#### Example 1: Successful Question Processing
**Input (scraped from page):**
```
Question: What is the capital of France?
A. London
B. Paris
C. Berlin
D. Madrid
```

**Expected Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 1/5
What is the capital of France?

Options:
  A. London
  B. Paris
  C. Berlin
  D. Madrid

🎯 Suggested Answer: B
📝 Explanation: Paris is the capital and largest city of France.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Expected Page Overlay:**
- Option B has green border: `border: 3px solid #22c55e`
- Small badge appears: "AI: B" in green

#### Example 2: API Timeout
**Expected Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 3/5
[Question text here...]

⚠️ API timeout after 30s - skipping this question
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Expected Page Overlay:**
- No highlight applied for this question
- Badge shows: "AI: ?" in yellow

#### Example 3: Invalid API Key (Early Exit)
**Expected Console Output:**
```
🚀 LMS Quiz Solver starting...
🌐 Launching browser...
✅ Browser opened. Please login to LMS.
   Press Enter when logged in...

[User presses Enter]

📋 Enter quiz URL: https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345

🔑 Validating API key...
❌ Invalid OPENAI_API_KEY. Please check your .env file.
   
Exiting. Browser will stay open.
```

#### Example 4: Non-Quiz Page Detection
**Expected Console Output:**
```
📋 Enter quiz URL: https://lms.hcmut.edu.vn/course/view.php?id=123

❌ This doesn't appear to be a quiz attempt page.
   Expected URL pattern: /mod/quiz/attempt.php?attempt=*
   
   Please navigate to an active quiz attempt and re-run the tool.
```

### Manual Execution Verification

Each task will be verified by running the tool and checking against the expected outputs above.

---

## Execution Strategy

### Sequential Development
This is a single-script utility tool - tasks should be done sequentially to build upon each other.

```
Task 1: Project Setup
    ↓
Task 2: Browser Automation (login wait)
    ↓
Task 3: Quiz Page Navigation
    ↓
Task 4: Question Scraper
    ↓
Task 5: GPT-4o Integration
    ↓
Task 6: Console Output
    ↓
Task 7: Page Overlay
    ↓
Task 8: Integration & Polish
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | None | 2, 3, 4, 5, 6, 7, 8 |
| 2 | 1 | 3, 8 |
| 3 | 2 | 4, 8 |
| 4 | 3 | 5, 6, 7, 8 |
| 5 | 4 | 6, 7, 8 |
| 6 | 5 | 8 |
| 7 | 5 | 8 |
| 8 | 6, 7 | None |

---

## TODOs

### Git Prerequisite (Conditional)

**Check**: Is this directory a git repository?
```powershell
git status 2>&1 | Out-Null; if ($?) { "Yes" } else { "No" }
```

**If NOT a git repo:**
- Run `git init` before any commits
- Create `.gitignore` with: `node_modules/`, `.env`, `dist/`

**If already a git repo:**
- Proceed with commits as specified

**Commits are OPTIONAL** - if user doesn't want version control, skip all commit steps.

---

- [x] 1. Project Setup & Configuration

  **What to do**:
  - Initialize Bun project: `bun init -y` (creates package.json)
  - Install dependencies: `bun add playwright openai dotenv`
  - Create `tsconfig.json` with strict mode:
    ```json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "outDir": "dist",
        "types": ["bun-types"]
      },
      "include": ["src/**/*"]
    }
    ```
  - Create `.env.example` with:
    ```
    OPENAI_API_KEY=your_api_key_here
    ```
  - Create `src/` folder structure
  - Install Playwright browsers: `bunx playwright install chromium`
  - Add to package.json scripts: `"start": "bun run src/index.ts"`

  **Must NOT do**:
  - Don't add testing frameworks
  - Don't create complex config files beyond `.env`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple project initialization with standard tooling
  - **Skills**: [`playwright`]
    - `playwright`: Needed for browser installation command

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first task)
  - **Blocks**: All other tasks
  - **Blocked By**: None

  **References**:

  **Inline Commands (no external docs needed):**
  ```powershell
  # Initialize project
  bun init -y
  
  # Install dependencies
  bun add playwright openai dotenv
  
  # Install browser
  bunx playwright install chromium
  ```

  **Documentation References**:
  - Playwright installation: https://playwright.dev/docs/intro

  **Acceptance Criteria**:

  **Manual Execution Verification (Windows PowerShell compatible):**
  - [ ] `bun --version` → Shows Bun version (e.g., "1.x.x")
  - [ ] `dir src` → Shows `src` folder exists
  - [ ] `type package.json` → Shows `playwright`, `openai`, `dotenv` in dependencies
  - [ ] `type .env.example` → Shows `OPENAI_API_KEY=your_api_key_here`
  - [ ] `bunx playwright --version` → Shows Playwright version

  **Commit**: YES
  - Message: `feat: initialize project with Playwright and OpenAI dependencies`
  - Files: `package.json`, `tsconfig.json`, `.env.example`, `src/`

---

- [x] 2. Browser Automation - Launch & Login Wait

  **What to do**:
  - Create `src/browser.ts` with browser launch function
  - Launch Chromium in headed mode (`headless: false`)
  - Navigate to https://lms.hcmut.edu.vn/
  - Display console message: "Please login to LMS. Press Enter when done..."
  - Wait for Enter keypress using Node.js readline (Bun-compatible)
  - Export browser and page objects for other modules
  - Implement SIGINT handler for graceful Ctrl+C cleanup

  **Bun-Compatible Readline Pattern:**
  ```typescript
  import * as readline from 'node:readline';
  
  async function waitForEnter(prompt: string): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve) => {
      rl.question(prompt, () => {
        rl.close();
        resolve();
      });
    });
  }
  
  // Usage:
  await waitForEnter('Press Enter when logged in...');
  ```

  **Must NOT do**:
  - Don't auto-detect login (user said manual Enter press)
  - Don't save session/cookies
  - Don't close browser after login
  - Don't use Bun.prompt() (use readline for consistency)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Playwright pattern, single file
  - **Skills**: [`playwright`]
    - `playwright`: Core browser automation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3, 8
  - **Blocked By**: Task 1

  **References**:

  **Documentation References**:
  - Playwright browser launch: https://playwright.dev/docs/api/class-browsertype#browser-type-launch
  - Node.js readline: https://nodejs.org/api/readline.html

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run script → Chromium browser opens visibly (headed mode)
  - [ ] Browser navigates to LMS login page
  - [ ] Console shows: "Please login to LMS. Press Enter when done..."
  - [ ] Script blocks until Enter pressed (doesn't proceed prematurely)
  - [ ] After pressing Enter, script continues without crash
  - [ ] Browser stays open after Enter pressed

  **Commit**: YES
  - Message: `feat: add browser automation with login wait`
  - Files: `src/browser.ts`

---

- [x] 3. Quiz Page Navigation & Pagination

  **What to do**:
  - Create `src/navigation.ts` with URL handling and pagination
  - Prompt user for quiz URL in console after login
  - Validate URL matches quiz attempt pattern: `/mod/quiz/attempt.php`
  - Navigate to the provided URL
  - Detect quiz page by presence of `.que` question containers
  - Implement pagination with explicit selector strategy (see below)
  - Track current page number to detect infinite loops

  **URL Validation (authoritative check - URL pattern takes precedence):**
  ```typescript
  function isQuizAttemptPage(url: string): boolean {
    return url.includes('/mod/quiz/attempt.php') && url.includes('attempt=');
  }
  ```

  **Pagination Selector Strategy (ordered priority):**
  ```typescript
  const NEXT_PAGE_SELECTORS = [
    // Priority 1: Moodle 4.x navigation button
    'input[name="next"][type="submit"]',
    // Priority 2: Moodle 3.x navigation link
    'a.mod_quiz-next-nav',
    // Priority 3: Generic "Next" text button
    'input[value="Next page"]',
    // Priority 4: Button with navigation role containing "next"
    'button:has-text("Next")',
  ];
  
  async function findNextButton(page: Page): Promise<ElementHandle | null> {
    for (const selector of NEXT_PAGE_SELECTORS) {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        return element;
      }
    }
    return null; // No next button = last page
  }
  ```

  **Wait Strategy After Navigation:**
  ```typescript
  async function navigateToNextPage(page: Page): Promise<boolean> {
    const nextButton = await findNextButton(page);
    if (!nextButton) return false; // No more pages
    
    const currentUrl = page.url();
    await nextButton.click();
    
    // Wait for navigation to complete
    await page.waitForURL((url) => url.href !== currentUrl, { timeout: 10000 });
    
    // Wait for question content to load
    await page.waitForSelector('.que', { timeout: 10000 });
    
    return true;
  }
  ```

  **Infinite Loop Prevention:**
  ```typescript
  const processedPages = new Set<string>();
  
  function getPageIdentifier(page: Page): string {
    // Use URL with page parameter as unique identifier
    return page.url();
  }
  
  // In main loop:
  const pageId = getPageIdentifier(page);
  if (processedPages.has(pageId)) {
    console.log('⚠️ Already processed this page, stopping');
    break;
  }
  processedPages.add(pageId);
  ```

  **Must NOT do**:
  - Don't auto-start the quiz if not already started
  - Don't submit quiz (avoid any "Finish attempt" buttons)
  - Don't handle non-quiz pages
  - Don't click submit/finish buttons (only Next navigation)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: DOM navigation with well-defined selector list
  - **Skills**: [`playwright`]
    - `playwright`: Page navigation and element detection

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4, 8
  - **Blocked By**: Task 2

  **References**:

  **Documentation References**:
  - Playwright page.goto: https://playwright.dev/docs/api/class-page#page-goto
  - Playwright waitForURL: https://playwright.dev/docs/api/class-page#page-wait-for-url
  - Playwright waitForSelector: https://playwright.dev/docs/api/class-page#page-wait-for-selector

  **Acceptance Criteria**:

  **Manual Execution Verification (Windows PowerShell):**
  - [ ] Console prompts: "📋 Enter quiz URL:"
  - [ ] Valid attempt URL → navigates successfully
  - [ ] Invalid URL → shows error with expected pattern
  - [ ] Single-page quiz → processes page, no Next click attempted
  - [ ] Multi-page quiz → clicks Next, waits for new page, processes it
  - [ ] Last page → detects no Next button, stops gracefully
  - [ ] Revisited page → detected via URL tracking, stops with warning

  **Pass/Fail:**
  - PASS: Different question IDs appear after Next (proves new page loaded)
  - FAIL: Same questions re-processed or script hangs

  **Commit**: YES
  - Message: `feat: add quiz page navigation with pagination support`
  - Files: `src/navigation.ts`

---

- [x] 4. Question Scraper

  **What to do**:
  - Create `src/scraper.ts` with question extraction logic
  - Extract questions from `.que.multichoice` containers
  - Derive `questionId` from the container's `id` attribute (see below)
  - Extract question text from `.qtext` within each container
  - Extract answer options using defined selector strategy
  - Build stable, unique CSS selectors for each option (see below)
  - Detect images and capture screenshots for vision API
  - Return `ScrapedQuestion[]` array

  **Question ID Derivation (authoritative rule):**
  ```typescript
  // Moodle question containers have id="question-{attemptId}-{questionId}"
  // Example: <div id="question-12345-67890" class="que multichoice">
  
  function getQuestionId(container: Element): string {
    const id = container.id; // e.g., "question-12345-67890"
    if (id && id.startsWith('question-')) {
      return id; // Use full ID for uniqueness
    }
    // Fallback: generate from index
    const index = Array.from(document.querySelectorAll('.que')).indexOf(container);
    return `que-index-${index}`;
  }
  ```

  **Option Selector Strategy (stable, deterministic targeting):**
  
  **The Problem**: Moodle themes vary; we need a selector that:
  1. Uniquely identifies each option
  2. Works across theme variations
  3. Can be stored and re-used for highlighting
  
  **The Solution**: Use `data-*` attributes or input IDs when available, fallback to question ID + option index.
  
  ```typescript
  // CANONICAL SELECTOR STRATEGY (single source of truth)
  
  function buildOptionSelector(questionId: string, optionIndex: number): string {
    // Strategy: Use the question container ID + option's relative position
    // This is deterministic because:
    // - questionId is extracted from container's id attribute
    // - optionIndex is the DOM order (0, 1, 2, 3...)
    // - We target the label element which is the clickable container
    
    // Selector targets: the Nth label inside the answer area
    // Using :nth-child on label elements specifically (not mixed tags)
    return `#${questionId} .answer label:nth-child(${optionIndex + 1})`;
  }
  
  // FALLBACK for themes without standard structure
  function buildFallbackSelector(questionId: string, optionIndex: number): string {
    // Target by input's name + value combination
    // Moodle inputs have: name="q{attemptId}:{questionId}_{slot}" value="0|1|2|3"
    return `#${questionId} input[type="radio"]:nth-of-type(${optionIndex + 1})`;
  }
  ```
  
  **Selector Validation (at scrape time):**
  ```typescript
  function validateSelector(page: Page, selector: string): Promise<boolean> {
    return page.$(selector).then(el => el !== null);
  }
  
  // If primary selector fails, try fallback
  let selector = buildOptionSelector(questionId, i);
  if (!await validateSelector(page, selector)) {
    selector = buildFallbackSelector(questionId, i);
    if (!await validateSelector(page, selector)) {
      console.warn(`⚠️ Could not build stable selector for option ${i}`);
      selector = ''; // Will skip highlighting for this option
    }
  }
  ```
  
  **What Gets Highlighted**:
  - Target: The `<label>` element that wraps the radio button and text
  - This is the clickable area users interact with
  - CSS is applied to this element: `border`, `background-color`
  - Clicking the label still triggers the radio button selection

  **Why NOT use `*:nth-of-type`**:
  - `*` matches any element type
  - `:nth-of-type` counts elements of the same type only
  - Combined, behavior is unpredictable when mixed tag types exist
  - Instead: target specific element type (`label:nth-child`)

  **Must NOT do**:
  - Don't extract non-MCQ questions (essay, etc.)
  - Don't extract multi-select questions (checkboxes) - skip with warning
  - Don't modify the page
  - Don't handle answer submission
  - Don't assume option labels (A, B, C) exist in DOM - we assign them by position

  **Multi-Select Detection (skip these questions):**
  ```typescript
  function isMultiSelect(container: Element): boolean {
    return container.classList.contains('multianswer') ||
           container.querySelector('input[type="checkbox"]') !== null;
  }
  
  // In scraping loop:
  if (isMultiSelect(questionContainer)) {
    console.warn(`⚠️ Q${index + 1}: Multi-select detected - skipping`);
    skippedQuestions.push({ index, reason: 'multi-select' });
    continue;
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: DOM scraping with fallback patterns, moderate complexity
  - **Skills**: [`playwright`]
    - `playwright`: DOM queries and screenshot capture

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5, 6, 7, 8
  - **Blocked By**: Task 3

  **References**:

  **Data Structure:**
  ```typescript
  interface Option {
    label: string;    // "A", "B", "C", etc. (assigned by DOM position)
    text: string;     // Option text content
    selector: string; // CSS selector: "#question-xxx .answer label:nth-child(N)"
  }
  
  interface ScrapedQuestion {
    index: number;        // 0-based index on current page
    questionId: string;   // Full Moodle ID: "question-{attemptId}-{questionId}"
    questionText: string;
    options: Option[];
    hasImage: boolean;
    imageBase64?: string; // Base64 PNG if hasImage
  }
  ```

  **Documentation References**:
  - Playwright $$eval: https://playwright.dev/docs/api/class-page#page-eval-on-selector-all
  - Playwright screenshot: https://playwright.dev/docs/screenshots

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Each question has `questionId` starting with "question-" or "que-index-"
  - [ ] Options labeled A, B, C, D in DOM order (0→A, 1→B, etc.)
  - [ ] Each option's `selector` follows pattern: `#question-xxx .answer label:nth-child(N)`
  - [ ] Selector validation passes (no warnings for valid pages)
  - [ ] Multi-select questions skipped with warning logged
  - [ ] Questions with <2 options → skipped with warning logged
  - [ ] Images detected → `hasImage: true` and `imageBase64` is base64 string

  **Selector Validation Test (run in browser console):**
  ```javascript
  // After scraping, manually verify each selector:
  document.querySelector('#question-12345-67890 .answer label:nth-child(1)')
  // Should return the first option's label element, not null
  ```

  **Commit**: YES
  - Message: `feat: add Moodle quiz question scraper with stable selectors`
  - Files: `src/scraper.ts`

---

- [x] 5. GPT-4o Integration

  **What to do**:
  - Create `src/gpt.ts` with OpenAI API integration
  - Load API key from `.env` using dotenv
  - Pin OpenAI SDK version: `openai@^4.0.0` in package.json
  - Configure SDK with `maxRetries: 0` to disable automatic retries
  - Use Chat Completions API with image parts (NOT Responses API)
  - Implement early API key validation (see OpenAI API Constraints section)
  - Create function to analyze question and return answer
  - For text-only questions: send question + labeled options (A, B, C, D)
  - For image questions: use vision API with base64 image
  - Use structured prompt format (see Option Mapping Specification)
  - Configure: `timeout: 30000`, `max_tokens: 500`, `temperature: 0.3`
  - Parse response with regex to extract answer letter
  - Handle all failure cases per OpenAI API Constraints table
  - Return `AnswerResult` with `suggestedAnswer` and `confidence`

  **Must NOT do**:
  - Don't add retry logic (SDK configured with `maxRetries: 0`)
  - Don't cache responses
  - Don't use gpt-4o-mini (user chose gpt-4o for vision)
  - Don't process more than 100 questions per run
  - Don't use Responses API (use Chat Completions with image parts)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard OpenAI SDK usage with defined patterns
  - **Skills**: []
    - No special skills needed - standard API integration

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 6, 7, 8
  - **Blocked By**: Task 4

  **References**:

  **Pattern References** (from Option Mapping Specification above):
  - Prompt structure: Question + labeled options A/B/C/D
  - Response parsing: `/^([A-Z])[.:\s]/` regex
  - SDK config: `timeout: 30000`, `max_tokens: 500`
  
  **OpenAI vision API pattern**:
  ```typescript
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    temperature: 0.3,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Question: ...\nOptions:\nA. ...\nB. ...\n\nAnswer with letter and explanation." },
        { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
      ]
    }]
  });
  ```

  **Documentation References**:
  - OpenAI Vision (Chat Completions): https://platform.openai.com/docs/guides/vision#quick-start
  - OpenAI Node.js SDK: https://github.com/openai/openai-node

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] API key validation runs on startup
  - [ ] Invalid key → shows "❌ Invalid OPENAI_API_KEY..." and exits
  - [ ] Valid key → continues processing
  - [ ] Text question → Response contains letter (A-D) and explanation
  - [ ] Image question → Vision API processes screenshot correctly
  - [ ] Timeout (>30s) → Shows "⚠️ Q{n}: Timeout, skipping" and continues
  - [ ] Invalid response format → Shows "⚠️ Q{n}: Could not parse answer" and marks UNKNOWN

  **Example Input/Output:**
  ```
  Input: "What is 2+2? A. 3  B. 4  C. 5  D. 6"
  Expected GPT Response: "B. The answer is 4 because 2+2=4."
  Parsed Result: { suggestedAnswer: "B", explanation: "The answer is 4...", confidence: "high" }
  ```

  **Commit**: YES
  - Message: `feat: add GPT-4o integration with vision support and failure handling`
  - Files: `src/gpt.ts`

---

- [x] 6. Console Output

  **What to do**:
  - Create formatted console output for answers
  - Display: Question number, question text (truncated), suggested answer, explanation
  - Use clear formatting with separators
  - Show progress: "Processing question 1/10..."
  - Color coding if terminal supports it (optional, keep simple)
  - Summary at end: "Completed X questions. Check browser for highlights."

  **Must NOT do**:
  - Don't add fancy CLI libraries (keep dependencies minimal)
  - Don't log raw API responses

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple console.log formatting
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 2 (with Task 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - Simple Node.js console formatting with template literals

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Questions display with clear numbering
  - [ ] Answer letter clearly visible (e.g., "Answer: B")
  - [ ] Explanation shown below answer
  - [ ] Progress indicator shows current/total
  - [ ] Final summary message appears

  **Commit**: NO (integrated into Task 8's index.ts commit)
  - Output formatting is simple enough to be inline in `src/index.ts`
  - No separate file needed

---

- [x] 7. Page Overlay - Answer Highlighting

  **What to do**:
  - Create `src/overlay.ts` with page injection logic
  - Use `page.evaluate()` to inject CSS and JavaScript
  - Use the `selector` from `ScrapedQuestion.options[n].selector`
  - Map GPT answer letter (A/B/C/D) to option index (0/1/2/3) → get selector
  - Apply visual highlight to the matching option element:
    - Green border: `border: 3px solid #22c55e`
    - Light green background: `background-color: rgba(34, 197, 94, 0.1)`
  - Add badge near highlighted option: "AI: B" in green pill
  - For UNKNOWN answers: yellow border, badge shows "AI: ?"
  - Validate selector resolves before applying (skip with warning if not)
  - Ensure highlight doesn't prevent clicking (use CSS only, no overlays)
  - Re-apply overlays after each page navigation (pagination)

  **Selector Usage (from scraper output):**
  ```typescript
  interface HighlightData {
    selector: string;  // e.g., "#question-123-456 .answer label:nth-child(2)"
    letter: string;    // "B" or "UNKNOWN"
  }
  
  async function applyHighlights(page: Page, highlights: HighlightData[]) {
    await page.evaluate((data) => {
      // Inject CSS first (once per page)
      if (!document.getElementById('quiz-solver-styles')) {
        const style = document.createElement('style');
        style.id = 'quiz-solver-styles';
        style.textContent = `/* styles */`;
        document.head.appendChild(style);
      }
      
      // Apply highlights
      for (const { selector, letter } of data) {
        const el = document.querySelector(selector);
        if (!el) {
          console.warn('Selector not found:', selector);
          continue;
        }
        el.classList.add(letter === 'UNKNOWN' ? 'quiz-solver-unknown' : 'quiz-solver-highlight');
        // Add badge...
      }
    }, highlights);
  }
  ```

  **Must NOT do**:
  - Don't auto-click or select the answer
  - Don't use JavaScript event handlers that could interfere with clicking
  - Don't use external CSS/JS files (inline everything)
  - Don't add floating panels that might obstruct content

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS styling, visual overlay design
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Page evaluate and injection
    - `frontend-ui-ux`: Visual overlay design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5

  **References**:

  **CSS Injection Pattern**:
  ```javascript
  await page.evaluate((answers) => {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      .quiz-solver-highlight {
        border: 3px solid #22c55e !important;
        background-color: rgba(34, 197, 94, 0.1) !important;
        position: relative;
      }
      .quiz-solver-badge {
        position: absolute;
        top: -10px;
        right: -10px;
        background: #22c55e;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      }
      .quiz-solver-unknown {
        border: 3px solid #eab308 !important;
        background-color: rgba(234, 179, 8, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    
    // Apply highlights
    answers.forEach(({ selector, letter }) => {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add(letter === 'UNKNOWN' ? 'quiz-solver-unknown' : 'quiz-solver-highlight');
        // Add badge...
      }
    });
  }, answerData);
  ```

  **Documentation References**:
  - Playwright evaluate: https://playwright.dev/docs/api/class-page#page-evaluate

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Correct answer option shows green border + light green background
  - [ ] Small "AI: B" badge appears near highlighted option
  - [ ] UNKNOWN answers show yellow border + "AI: ?" badge
  - [ ] Clicking the highlighted option works normally (not blocked)
  - [ ] After clicking Next page, new questions get highlighted
  - [ ] Multiple questions on same page all get appropriate highlights

  **Pass/Fail Conditions:**
  - PASS: Can click highlighted option and it gets selected
  - FAIL: Click is blocked or page interaction broken
  - PASS: Badges visible without scrolling away from question
  - FAIL: Badges hidden or overlapping other content

  **Commit**: YES
  - Message: `feat: add page overlay for answer highlighting`
  - Files: `src/overlay.ts`

---

- [x] 8. Integration & Main Entry Point

  **What to do**:
  - Create `src/index.ts` as main entry point
  - Orchestrate the full flow:
    1. Launch browser → navigate to LMS
    2. Wait for Enter (login complete)
    3. Prompt for quiz URL → navigate
    4. Loop through quiz pages:
       - Scrape questions on current page
       - Send each to GPT-4o
       - Display answers in console
       - Apply overlay highlights
       - If Next button exists, click and repeat
    5. Final summary message
    6. Keep browser open for user
  - Add `start` script to package.json: `bun run src/index.ts`
  - Handle graceful exit (Ctrl+C cleanup)

  **Must NOT do**:
  - Don't add command-line argument parsing (keep simple)
  - Don't auto-close browser
  - Don't submit quiz

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Integration and orchestration
  - **Skills**: [`playwright`]
    - `playwright`: Browser lifecycle management

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 7

  **References**:

  **Pattern References**:
  - All previous modules imported and orchestrated

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] `bun run start` → Full flow executes
  - [ ] Browser opens, navigates to LMS
  - [ ] Login wait works (Enter continues)
  - [ ] Quiz URL accepted and navigated
  - [ ] Questions scraped and sent to GPT
  - [ ] Console shows answers
  - [ ] Page shows highlights
  - [ ] Pagination works (if applicable)
  - [ ] Browser stays open after completion
  - [ ] Ctrl+C exits cleanly

  **Commit**: YES
  - Message: `feat: complete integration and main entry point`
  - Files: `src/index.ts`, `package.json` (scripts)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: initialize project` | package.json, tsconfig.json, .env.example | `bun --version` |
| 2 | `feat: browser automation` | src/browser.ts | Browser opens |
| 3 | `feat: quiz navigation` | src/navigation.ts | Navigates to URL |
| 4 | `feat: question scraper` | src/scraper.ts | Extracts questions |
| 5 | `feat: GPT integration` | src/gpt.ts | Gets answers |
| 6 | (no separate commit) | (integrated in index.ts) | Shows formatted answers |
| 7 | `feat: page overlay` | src/overlay.ts | Highlights on page |
| 8 | `feat: complete integration` | src/index.ts | Full flow works |

---

## Success Criteria

### Final Verification Script
```powershell
# 1. Start the tool (Windows PowerShell)
bun run start

# Expected output:
# 🚀 LMS Quiz Solver starting...
# 🌐 Launching browser...
# ✅ Browser opened. Please login to LMS.
#    Press Enter when logged in...
```

```powershell
# 2. After pressing Enter (login complete):

# Expected output:
# 📋 Enter quiz URL: 
```

```powershell
# 3. After pasting quiz URL:
# https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345

# Expected output:
# 🔑 Validating API key... ✅
# 📖 Found 5 questions on this page (1 multi-select skipped)
# 
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Question 1/5
# What is the capital of France?
#
# Options:
#   A. London
#   B. Paris
#   C. Berlin
#   D. Madrid
#
# 🎯 Suggested Answer: B
# 📝 Paris is the capital of France.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Question 2/5
# [Multi-select question - SKIPPED]
# ⚠️ This tool only supports single-answer MCQ questions.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# [... more questions ...]
#
# ✅ Completed: 4 answered, 1 skipped
# 🔍 Check browser for highlighted answers
# 
# 👉 Press Enter to close browser, or Ctrl+C to exit immediately.
```

```powershell
# 4. After pressing Enter:
# Browser closes gracefully
# Script exits with code 0
```

### Pass/Fail Conditions

| Criterion | PASS | FAIL |
|-----------|------|------|
| Browser launch | Chromium opens visibly | Browser doesn't open or is headless |
| Login wait | Script pauses until Enter pressed | Script proceeds before login |
| URL validation | Quiz attempt URLs accepted | Non-attempt URLs accepted |
| Question extraction | At least 1 single-answer MCQ extracted | Zero questions or crash |
| Multi-select handling | Checkbox questions skipped with warning | Multi-select processed (wrong) or crash |
| API validation | Invalid key exits with clear message | Silent failure or hang |
| Answer display | Letter + explanation shown | Raw API response or empty |
| Page highlight | Green border on suggested option | No visual change or wrong option |
| Click functionality | Can click highlighted option normally | Click blocked or broken |
| Pagination | Next page processed after navigation | Only first page processed |
| Script completion | Waits for Enter, then closes browser cleanly | Hangs or browser dies unexpectedly |
| Ctrl+C handling | Exits process (browser may close abruptly) | Hangs or requires force kill |

### Final Checklist
- [ ] Browser launches in visible (headed) mode
- [ ] Login wait with Enter keypress works
- [ ] Quiz attempt URL accepted, other URLs rejected with message
- [ ] Multi-select questions skipped with warning message
- [ ] Single-answer MCQ questions extracted with A/B/C/D labels
- [ ] Images captured as full question screenshots sent to GPT-4o vision
- [ ] Answers displayed in console with formatting
- [ ] Correct answers highlighted on webpage with green border
- [ ] UNKNOWN answers marked with yellow and "?"
- [ ] Pagination handled (Next button clicked, new page processed)
- [ ] No auto-submit or auto-click occurs (user selects manually)
- [ ] After completion, script waits for Enter then closes browser
- [ ] Ctrl+C exits process (browser closes with it)
