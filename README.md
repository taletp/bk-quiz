# 🎓 LMS Auto Quiz Solver

> **Intelligent Moodle quiz automation tool** that uses GPT-4o to analyze quiz questions and provide suggested answers with visual highlighting on the quiz page.

[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

---

## 📋 Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Features in Detail](#features-in-detail)
7. [Architecture](#architecture)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)
10. [License](#license)

---

## ✨ Features

### Core Functionality
- 🤖 **AI-Powered Analysis** - Uses OpenAI's GPT-4o to analyze quiz questions
- 📸 **Image Support** - Handles image-based questions with vision API
- 🎯 **Visual Feedback** - Highlights suggested answers directly on the quiz page
- 📄 **Multi-Page Support** - Automatically navigates through paginated quizzes
- 🔒 **No Auto-Submit** - User manually selects and submits answers (maintains control)

### User Experience
- 🌐 **Headed Browser** - See exactly what the tool is doing in real-time
- ⌨️ **Simple Input** - Just paste the quiz URL and press Enter
- 📊 **Clear Console Output** - Formatted answers with explanations
- ⚡ **Fast Processing** - Leverages Bun's superior performance
- 🛡️ **Cost Control** - Built-in 100-question cap to prevent runaway API costs

### Safety & Guardrails
- ❌ **No Auto-Clicking** - Tool never selects answers automatically
- ❌ **No Quiz Submission** - Avoids accidentally submitting
- ❌ **No Session Persistence** - Fresh login required each run
- ✅ **Manual Multi-Select Skip** - Checkboxes are intentionally not supported
- 🚫 **Rate Limit Protection** - Proper error handling and timeouts

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) installed (v1.0+)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Active HCMUT LMS login or compatible Moodle instance

### 3-Minute Setup

```bash
# 1. Clone or download the project
cd bk-quiz

# 2. Install dependencies
bun install

# 3. Create .env file
cp .env.example .env

# 4. Add your OpenAI API key
# Edit .env and replace YOUR_API_KEY_HERE with your actual key
nano .env  # or use your favorite editor

# 5. Run the tool
bun run start
```

That's it! The browser will open automatically.

---

## 📦 Installation

### System Requirements

| Requirement | Version | Notes |
|------------|---------|-------|
| Bun | 1.0+ | Fast JavaScript runtime |
| Node.js | 18+ | For npm compatibility (optional) |
| macOS/Linux/Windows | Any | Cross-platform support |
| RAM | 512MB+ | Minimal requirements |
| Disk Space | 500MB+ | For Chromium browser |

### Step-by-Step Installation

#### 1. Install Bun (if not already installed)

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell):**
```powershell
powershell -Command "irm bun.sh/install.ps1|iex"
```

**Or visit**: https://bun.sh for alternative installation methods

#### 2. Clone the Repository

```bash
git clone <repository-url>
cd bk-quiz
```

Or manually download and extract the project folder.

#### 3. Install Dependencies

```bash
bun install
```

This will install:
- **playwright** - Browser automation
- **openai** - OpenAI API client
- **dotenv** - Environment variable management

#### 4. Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (you won't see it again!)
5. Store it safely

#### 5. Configure Environment

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your API key
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
# Then edit .env with Notepad or your editor
```

#### 6. Verify Installation

```bash
# Should show Bun version
bun --version

# Should show all dependencies installed
bun pm ls

# Should compile without errors
bunx tsc --noEmit
```

---

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Getting Your API Key:**
1. Go to https://platform.openai.com/account/api-keys
2. Click "Create new secret key"
3. Name it "bk-quiz" (optional)
4. Copy immediately (visible only once)
5. Paste into `.env` file

**Security Note:**
- Never commit `.env` to git (it's in .gitignore)
- Never share your API key
- Use environment-specific keys if deploying

### Cost Management

**Built-in Safeguards:**
- 100-question limit per run (~$1-3 cost)
- 30-second timeout per API call
- Automatic error handling (skips on timeout)

**To prevent unexpected costs:**
- Start with small quizzes
- Monitor your OpenAI usage dashboard
- Set up billing alerts on OpenAI

---

## 📖 Usage

### Basic Workflow

#### 1. Start the Tool

```bash
bun run start
```

**Expected output:**
```
🚀 LMS Quiz Solver starting...
✅ Browser opened at LMS homepage
👉 Please login manually, then press Enter when done.
```

#### 2. Login to LMS

- Browser window opens automatically
- Log in to HCMUT LMS (or your Moodle instance) manually
- Press Enter in the terminal when login is complete

#### 3. Enter Quiz URL

**Expected prompt:**
```
📋 Enter quiz URL: 
```

**Paste the quiz URL:**
```
https://lms.hcmut.edu.vn/mod/quiz/attempt.php?attempt=12345
```

The URL must be an **active quiz attempt** page. Here's how to find it:

1. Open LMS → Navigate to your course
2. Find the quiz and click "Attempt quiz now" or "Continue attempt"
3. Copy the URL from the browser address bar
4. Paste it into the tool

#### 4. Watch Processing

The tool will:
- Scrape all questions on the current page
- Send each to GPT-4o 
- Print suggested answers to console
- Highlight answers on the page (green border + badge)
- Navigate to next page if it exists

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 1/10
What is the capital of France?

Options:
  A. London
  B. Paris
  C. Berlin
  D. Madrid

🎯 Suggested Answer: B
📝 Explanation: Paris is the capital and largest city of France, known for its culture and history.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 5. Review Highlighted Answers

Check the quiz page in the browser:
- ✅ **Green highlighted options** = Suggested correct answers
- 🏷️ **Small badges** = "AI: B" shows which answer the tool suggests
- 🟡 **Yellow highlighted options** = Uncertain answers (marked "AI: ?")

#### 6. Select and Submit

- **Click** the highlighted answer option (green border)
- **Verify** the radio button is selected (filled circle)
- Navigate through pages manually if needed
- Click "Finish attempt" or "Submit all and finish" when ready
- Confirm submission

#### 7. View Results

After submission, the tool will display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Quiz processing complete!
   Questions answered: 10
   Questions skipped: 0
🔍 Check browser for highlighted answers

👉 Press Enter to close browser, or Ctrl+C to exit immediately.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Press Enter to close the browser.

### Advanced Usage

#### Quit Anytime

Press **Ctrl+C** to:
- Close the browser immediately
- Exit the tool
- No cleanup needed

#### Skip Multi-Select Questions

The tool automatically detects and skips checkbox questions:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 3/10
[Multi-select question - SKIPPED]
⚠️ This tool only supports single-answer MCQ questions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Monitor Question Limit

The tool includes a 100-question safety limit:
```
⚠️ Reached 100 question limit. Stopping to prevent runaway costs.
```

If you hit this, you can run again for the remaining questions.

---

## 🏗️ Features in Detail

### 1. Browser Automation

**What it does:**
- Launches Chromium in "headed" mode (visible)
- Navigates to LMS homepage
- Waits for you to login manually
- Stays open during processing so you can see everything

**Why headed mode?**
- You maintain full control
- You can see what's happening
- You can intervene if needed
- No hidden interactions

### 2. Question Scraping

**Supported:**
- ✅ Multiple-choice with radio buttons (single answer)
- ✅ Questions with images
- ✅ Multi-page quizzes (automatic pagination)
- ✅ Text-only questions

**Not Supported:**
- ❌ Checkboxes (multi-select)
- ❌ Fill-in-the-blank
- ❌ Essay questions
- ❌ Drag-and-drop
- ❌ Matching questions

### 3. GPT-4o Vision API

**How it works:**
1. For text-only questions: Sends question text + options
2. For image questions: Takes screenshot of entire question container
3. Sends screenshot as base64 to GPT-4o
4. Receives letter (A/B/C/D) + explanation

**Image handling:**
- Only high-resolution images work well
- Screenshots include context (question + options)
- Typical cost: $0.01-0.02 per image

### 4. Answer Highlighting

**Visual System:**
| Color | Meaning | Icon |
|-------|---------|------|
| 🟢 Green | Confident answer | AI: B |
| 🟡 Yellow | Uncertain answer | AI: ? |
| ⚪ None | Skipped question | — |

**How to use:**
1. Green border appears around suggested answer
2. Small badge shows "AI: B" near the option
3. Click the green option to select it
4. Proceed with submission

### 5. Cost Management

**Typical Costs:**
- Text question: ~$0.005-0.01
- Image question: ~$0.01-0.02
- Full 10-question quiz: ~$0.10-0.20
- Full 100-question quiz: ~$1-2

**Cost Controls:**
- 100-question limit (built-in)
- 30-second timeout (prevents hanging)
- No retries (fail fast)

**Monitor costs:**
1. Log into https://platform.openai.com
2. Go to "Billing" → "Usage"
3. Check daily costs
4. Set usage limits if needed

---

## 🏛️ Architecture

### Project Structure

```
bk-quiz/
├── src/
│   ├── index.ts          # Main entry point & orchestration
│   ├── browser.ts        # Browser launch & management
│   ├── navigation.ts     # URL validation & pagination
│   ├── scraper.ts        # Question extraction from DOM
│   ├── gpt.ts            # OpenAI API integration
│   ├── overlay.ts        # Visual highlighting on page
│   └── utils.ts          # Shared utilities (new)
│
├── .env.example          # Environment variable template
├── .env                  # (GITIGNORED) Your API keys
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .gitignore            # Git exclusions
└── README.md             # This file
```

### Data Flow

```
1. Browser Launch
   └─→ Navigate to LMS
       └─→ Prompt user to login
           └─→ Wait for Enter

2. Quiz URL Input
   └─→ Validate URL format
       └─→ Navigate to quiz
           └─→ Wait for page load

3. Question Processing Loop
   ├─→ Scrape questions from DOM
   │   ├─→ Extract text
   │   ├─→ Extract options
   │   ├─→ Detect images
   │   └─→ Build CSS selectors
   │
   ├─→ Send to GPT-4o
   │   ├─→ Build prompt with options
   │   ├─→ Attach screenshot if image exists
   │   └─→ Parse response for letter (A/B/C/D)
   │
   ├─→ Print to console
   │   └─→ Formatted question + answer + explanation
   │
   ├─→ Apply visual highlights
   │   ├─→ Inject CSS styles
   │   ├─→ Add green border to correct option
   │   └─→ Add badge showing answer letter
   │
   └─→ Check for next page
       ├─→ If Next button exists → click it
       ├─→ If not → end of quiz
       └─→ If reached 100 questions → stop

4. Final Summary
   └─→ Show statistics
       └─→ Wait for user to close
```

### Module Responsibilities

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| **index.ts** | Orchestration | main(), exitWithError() |
| **browser.ts** | Browser lifecycle | launchBrowser() |
| **navigation.ts** | Quiz navigation | isQuizAttemptPage(), findNextButton(), PageTracker |
| **scraper.ts** | DOM extraction | scrapeQuestions() |
| **gpt.ts** | AI integration | validateApiKey(), analyzeQuestion() |
| **overlay.ts** | Visual highlighting | applyHighlights() |
| **utils.ts** | Shared helpers | waitForEnter(), printSuccess(), etc. |

---

## 🐛 Troubleshooting

### Windows-Specific Browser Issues

Since Playwright browser automation on Windows can be finicky, here's a comprehensive guide to get it working.

#### Step-by-Step Windows Troubleshooting

**1. Install/Update Microsoft Edge (Recommended)**

Edge is the most reliable browser on Windows for this tool. It's usually pre-installed, but update it to latest:

```
1. Go to: https://www.microsoft.com/en-us/edge
2. Click "Download for Windows"
3. Run the installer
4. Restart your computer
5. Try running bun run start again
```

Edge is preferred because:
- ✅ Built for Windows
- ✅ Integrated with system
- ✅ Most reliable with Playwright
- ✅ Better performance than Chromium port

**2. Reinstall Playwright Browsers**

```bash
# Remove existing browser installations
rm -r %USERPROFILE%\.cache\ms-playwright
# or manually: Navigate to C:\Users\[YourUsername]\AppData\Local\ms-playwright and delete

# Reinstall fresh
bunx playwright install chromium firefox
```

**3. Kill Existing Browser Processes**

If multiple browser instances are running, they can block new launches:

```bash
# PowerShell (Admin mode required):
Get-Process | Where-Object {$_.ProcessName -like "*chrome*" -or $_.ProcessName -like "*msedge*" -or $_.ProcessName -like "*firefox*"} | Stop-Process -Force

# Or manually via Task Manager:
# 1. Press Ctrl+Shift+Esc
# 2. Find: chrome.exe, msedge.exe, firefox.exe
# 3. Right-click → End task
# 4. Try again
```

**4. Run as Administrator**

Some Windows systems need elevated permissions:

```bash
# Open PowerShell as Administrator:
# Right-click PowerShell → Run as Administrator

# Then:
cd C:\Users\YourUsername\Desktop\troll\bk-quiz
bun run start
```

**5. Disable Antivirus/Firewall Temporarily**

Antivirus software can block browser launches. Test without it:

```
Windows Defender:
  1. Settings → Privacy & Security
  2. Virus & threat protection
  3. Manage settings
  4. Toggle "Real-time protection" OFF
  5. Try bun run start
  6. Toggle protection back ON when done

Other antivirus:
  - Look for "disable" or "pause protection" option
  - Disable for 10 minutes
  - Re-enable after testing
```

**6. Clear Playwright Cache**

```bash
# On Windows PowerShell:
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
Remove-Item -Path "$env:USERPROFILE\.cache\ms-playwright" -Recurse -Force

# Then reinstall:
bunx playwright install chromium
```

**7. Check for System Updates**

Outdated Windows can cause issues:

```
Settings → System → About
Click "Check for updates"
Install all available updates
Restart computer
```

**8. Increase Browser Launch Timeout**

If browser launches slowly on your system:

```bash
# PowerShell - set environment variable:
$env:PLAYWRIGHT_LAUNCH_TIMEOUT="60000"
bun run start

# Or permanently (for current session):
$env:DEBUG="pw:api"
bun run start
```

**9. Try Different Browser**

If Edge doesn't work, the tool will try Chromium and Firefox automatically. But you can force a specific browser:

```bash
# Force Firefox (more stable on some systems):
bunx playwright install firefox
bun run start

# The tool will auto-detect and use Firefox if Chromium fails
```

**10. Clean System Resources**

Free up memory and disk space:

```bash
# Check disk space:
Get-Volume  # PowerShell

# Free up space if < 500MB available:
# - Delete Downloads folder
# - Empty Recycle Bin (Shift+Del)
# - Run Disk Cleanup: cleanmgr.exe

# Restart computer after cleanup:
shutdown /r /t 0
```

#### Windows Browser Priority Chain

The tool now tries browsers in this order on Windows:

```
Windows 10/11:
  1. Edge (msedge) - PREFERRED ✅ Most reliable
  2. Chromium (Playwright's Chromium) - Fallback 
  3. Firefox - Final fallback

macOS/Linux:
  1. Chromium - Preferred
  2. Firefox - Fallback
```

#### Testing Individual Browser Launches

To test if a specific browser can launch:

```bash
# Create test-edge.js in project root:
const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Testing Edge launch...');
    const browser = await chromium.launch({ channel: 'msedge', headless: false });
    console.log('✅ Edge launched successfully!');
    await browser.close();
  } catch (e) {
    console.log('❌ Edge launch failed:', e.message);
  }
})();

# Run it:
bun test-edge.js
```

---

### Common Issues

#### 1. "❌ Invalid OPENAI_API_KEY"

**Cause:** API key not set or invalid

**Solution:**
```bash
# 1. Check .env file exists
ls -la .env

# 2. Verify API key format
cat .env

# 3. Get new key from https://platform.openai.com/api-keys
# 4. Replace in .env file
# 5. Save and try again
```

#### 2. "Cannot find module 'playwright'"

**Cause:** Dependencies not installed

**Solution:**
```bash
# Reinstall dependencies
bun install

# Verify Chromium is installed
bunx playwright install chromium
```

#### 3. Browser Window Doesn't Open

**Cause:** Chromium not installed or permissions issue

**Solution:**
```bash
# Reinstall Chromium
bunx playwright install chromium

# On Linux, may need system dependencies
# Ubuntu/Debian:
sudo apt-get install -y libxss1 libappindicator1 libindicator7

# Fedora:
sudo dnf install -y chromium
```

#### 4. "No MCQ questions found"

**Cause:** 
- URL is not a quiz attempt page
- Quiz hasn't started yet
- Wrong question type

**Solution:**
- Verify URL contains `/mod/quiz/attempt.php?attempt=`
- Click "Attempt quiz now" if not started
- Check quiz contains radio button questions
- Some Moodle instances use different HTML - contact support if needed

#### 5. Quiz Page Doesn't Load

**Cause:** Network timeout or LMS issue

**Solution:**
- Verify internet connection
- Try accessing LMS manually first
- Wait a moment and retry
- Check if LMS is under maintenance

#### 6. GPT Timeout / API Errors

**Cause:** Network issues or API overload

**Solution:**
```bash
# 1. Check internet connection
# 2. Verify API key is valid
# 3. Check OpenAI status: https://status.openai.com/
# 4. Try again in a few minutes
# 5. Run with fewer questions (try smaller quiz)
```

### Debug Mode

To see more detailed logging:

**In src/index.ts, uncomment debug lines:**
```typescript
// Uncomment for debugging
// console.log('DEBUG: URL =', currentUrl);
// console.log('DEBUG: Questions scraped =', questions.length);
```

Or add temporary logs before running.

---

## ❓ FAQ

### Q: Is this cheating?

**A:** The tool is designed as a **study aid**, not a cheating mechanism. It:
- ✅ Does NOT auto-submit answers
- ✅ Does NOT hide from the LMS
- ✅ Requires YOU to select each answer manually
- ✅ Shows you the reasoning (explanation)
- ✅ Lets you verify answers before submitting

**Your responsibility:** Use this tool in compliance with your institution's academic integrity policies.

### Q: Why do I need to login manually?

**A:** For security and control:
- ✅ Your login credentials are never stored
- ✅ You can use 2FA if required
- ✅ You maintain full session control
- ✅ No risk of credential exposure

### Q: Why only single-choice questions?

**A:** Multi-select (checkboxes) are intentionally not supported because:
- Require human judgment (multiple correct answers)
- Higher likelihood of mistakes
- Different scoring logic

### Q: How much does it cost?

**Cost Breakdown:**
- Simple text question: ~$0.005
- Image question: ~$0.015-0.02
- Full 10-question quiz: ~$0.10
- Full 100-question quiz: ~$1-2

**Monitor costs:**
- Track usage at https://platform.openai.com/account/billing/overview
- Set spending limits in account settings
- Start with free trial credits

### Q: Does it work with other Moodle instances?

**Short answer:** Probably yes!

**Requirements:**
- Standard Moodle question structure (.que.multichoice)
- Radio buttons for single-choice
- Similar DOM layout to HCMUT

**If it doesn't work:**
- Different Moodle theme might use different selectors
- Contact us with the Moodle version + theme
- May need selector adjustment

### Q: Can I use my Free OpenAI credits?

**Yes!**
1. Go to https://platform.openai.com/account/billing/overview
2. You'll see free credits if available
3. They auto-expire after 3 months
4. Use them while you have them!

### Q: What if the AI gets the answer wrong?

**A:** You still have control:
1. ❌ Don't click the highlighted answer
2. ✅ Click the correct answer instead
3. The tool only **suggests**, you **decide**

### Q: Can I run multiple quizzes at once?

**A:** Not simultaneously, but:
- Run it once for Quiz 1
- Run it again for Quiz 2
- Each run is independent
- No state is stored between runs

### Q: Why does it need GPU/high-spec hardware?

**A:** It doesn't! The tool:
- ✅ Runs on any modern laptop
- ✅ Minimal CPU requirements
- ✅ Minimal RAM (< 500MB)
- ✅ Just needs internet connection

### Q: What if I hit the OpenAI rate limit?

**A:** The tool now has **intelligent rate limiting** built-in:

1. **Automatic Rate Limiting:**
   - Waits 1 second between requests (default)
   - Prevents most rate limit issues
   - Works for most OpenAI API plans

2. **Automatic Retry on Rate Limit:**
   - Retries up to 3 times on 429 errors
   - Uses exponential backoff (1s → 2s → 4s → ...)
   - Caps at 60-second max wait

3. **Customize Delay (if needed):**
   ```bash
   # Increase delay to 2 seconds between requests
   export REQUEST_DELAY_MS=2000
   bun run src/index.ts
   
   # Or 3 seconds for very strict rate limits
   export REQUEST_DELAY_MS=3000
   bun run src/index.ts
   ```

4. **If Still Rate Limited:**
   - You may have a strict API plan (e.g., free tier)
   - Options:
     - Increase REQUEST_DELAY_MS to 3000-5000
     - Upgrade your OpenAI plan
     - Split quiz into smaller batches (50 questions at a time)
     - Wait 1-2 minutes between runs

5. **Example with Very Conservative Settings:**
   ```bash
   # For free tier or strict limits:
   export REQUEST_DELAY_MS=5000
   bun run src/index.ts
   
   # This adds 5 seconds between each question
   # For 100 questions = ~500 seconds = 8+ minutes total
   # But guarantees no rate limits
   ```

---

## 📊 Performance

### Typical Running Times

| Operation | Time |
|-----------|------|
| Browser launch | 2-3 seconds |
| Login wait | User dependent |
| URL input | User dependent |
| Per question (text) | 1-2 seconds |
| Per question (image) | 2-5 seconds |
| Page navigation | 1-2 seconds |

**Total for 10-question quiz:** ~15-30 seconds

### Memory Usage

| Component | Memory |
|-----------|--------|
| Node.js/Bun | ~50MB |
| Chromium browser | ~150-200MB |
| API processing | ~10MB |
| **Total** | **~250MB** |

---

## 🔒 Security & Privacy

### What is NOT stored:

- ❌ Login credentials
- ❌ Quiz answers
- ❌ LMS session data
- ❌ Your API key (only in .env, not shared)

### What happens during a run:

1. Your API key is used to call OpenAI
2. Screenshots are sent to OpenAI API
3. Answers are printed to your console
4. Everything is discarded when the tool ends

### Best Practices:

1. **Keep .env safe** - Don't commit to git
2. **Rotate API keys** - If compromised
3. **Use personal API keys** - Not shared team keys
4. **Monitor usage** - Check your OpenAI account
5. **Run locally** - Not on shared computers

---

## 📝 License

MIT License - See LICENSE file for details

**TL;DR:** Use this code freely, including commercial use. Just don't claim you wrote it.

---

## 🤝 Contributing

Found a bug? Have a suggestion?

1. Test it thoroughly
2. Describe the issue clearly
3. Include steps to reproduce
4. Submit a pull request or issue

---

## ⚡ Acknowledgments

- **[Playwright](https://playwright.dev)** - Browser automation
- **[OpenAI](https://openai.com)** - GPT-4o API
- **[Bun](https://bun.sh)** - Fast JavaScript runtime
- **[HCMUT LMS](https://lms.hcmut.edu.vn)** - Target platform

---

## 📬 Support

### Getting Help

1. **Read the FAQ** above first
2. **Check Troubleshooting** section
3. **Review console output** for error messages
4. **Check OpenAI status** (https://status.openai.com/)
5. **Test with simple quiz first**

### Common Commands

```bash
# View logs of last run
tail -f bun.log

# Check TypeScript for errors
bunx tsc --noEmit

# Run with verbose output
DEBUG=* bun run start

# Clean reinstall
rm -rf node_modules bun.lock
bun install
```

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

For the latest updates, check the [GitHub repository](https://github.com/yourusername/bk-quiz).
