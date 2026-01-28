
## Task 2: Browser Automation - Launch & Login Wait

### Key Learnings

1. **Module Structure**
   - Created `src/browser.ts` with Playwright browser automation
   - Exports async function `launchBrowser()` returning `{ browser, page }`
   - Allows other modules to import and reuse browser/page instances

2. **Playwright Headed Mode**
   - `chromium.launch({ headless: false })` makes browser window visible
   - Essential for user to see and interact with LMS login form
   - Works seamlessly with Bun and TypeScript strict mode

3. **Node.js Readline for Enter Detection**
   - `import * as readline from 'node:readline'` is Bun-compatible
   - `rl.question()` blocks process until user presses Enter
   - Helper function `waitForEnter()` encapsulates readline pattern
   - Allows main script to control flow without hard-coded timeouts

4. **SIGINT Handler for Graceful Cleanup**
   - `process.on('SIGINT', async () => { ... })` catches Ctrl+C
   - Global `browserRef` variable tracks active browser instance
   - `browserRef.close().catch(() => {})` ensures browser closes even on errors
   - Prevents zombie browser processes after interruption

5. **TypeScript & Type Safety**
   - Imports `{ Browser, Page }` types from 'playwright'
   - Return type `Promise<{ browser: Browser; page: Page }>` is explicit
   - `bunx tsc --noEmit` validation shows zero compilation errors

### Implementation Pattern

```typescript
// Global ref + SIGINT handler
let browserRef: Browser | null = null;
process.on('SIGINT', async () => {
  if (browserRef) await browserRef.close().catch(() => {});
  process.exit(0);
});

// Readline helper
async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({...});
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

// Main export
export async function launchBrowser() {
  const browser = await chromium.launch({ headless: false });
  browserRef = browser;
  const page = await browser.newPage();
  await page.goto('https://lms.hcmut.edu.vn/');
  console.log('Please login to LMS. Press Enter when done...');
  await waitForEnter('');
  return { browser, page };
}
```

### Files Created

- ✅ `src/browser.ts`: Complete browser automation module (63 lines)
- ✅ Git commit: `feat: add browser automation with login wait`

### Next Steps

- Task 3: Create `src/scraper.ts` for quiz question extraction
- Task 4: Create `src/gpt.ts` for OpenAI GPT-4o integration
- Task 5: Create `src/overlay.ts` for visual answer highlighting
- Task 6: Create `src/index.ts` as main entry point

