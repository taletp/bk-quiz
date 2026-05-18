# bk-quiz

> **One-command quiz solver for Moodle LMS.** Paste a quiz URL, get AI-suggested answers highlighted in your browser.

## Quick Start (2 minutes)

```bash
# 1. Install Node.js (if you don't have it)
#    → https://nodejs.org (version 18 or higher)

# 2. Clone and enter the project
git clone <repo-url>
cd bk-quiz

# 3. Install dependencies
npm install

# 4. Install Playwright browsers
npm run install:browsers

# 5. Run the interactive setup wizard
npm run setup

# 6. Start solving quizzes
npm run start
```

That's it. The setup wizard will ask which AI provider you want (Groq = free & recommended) and create your `.env` file automatically.

---

## Usage

### Solve Mode (default)

Paste a quiz URL and let the AI suggest answers:

```bash
npm run start
# → paste your quiz URL → answers appear in console + browser highlights
```

### Review Mode

Extract correct answers from a completed quiz to build an answer bank:

```bash
npm run review
# or pass URL directly:
npm run start --review "https://lms.hcmut.edu.vn/mod/quiz/review.php?attempt=12345"
```

### Auto Mode

Use a saved answer bank to automatically select answers:

```bash
npm run auto
# or pass answer file directly:
npm run start --auto "./quiz-answers/review-12345-2026-01-15.json"
```

---

## AI Providers

| Provider | Cost | Speed | Setup | Best For |
|----------|------|-------|-------|----------|
| **Groq** ⭐ | FREE | ⚡⚡⚡ Fast | 1 minute | Default choice |
| **Ollama** | FREE | 🐢 Slow | 10 minutes | Offline use |
| **OpenAI** | Paid | ⚡ Fast | 2 minutes | Best accuracy |

**Recommendation:** Use Groq. It's free, fast, and requires no local setup.

---

## Workflow

```
npm run start
  ↓
Browser opens → Log in to LMS manually → Press Enter
  ↓
Paste quiz URL
  ↓
AI analyzes each question → Shows answer + explanation
  ↓
Correct answers highlighted in browser (green border)
  ↓
You review and submit manually
```

---

## Configuration

The setup wizard (`npm run setup`) creates a `.env` file for you. Advanced users can edit it manually:

```bash
# AI Provider
LLM_PROVIDER=groq          # or openai, ollama
GROQ_API_KEY=gsk_xxxxx     # Get free key: https://console.groq.com/keys

# Optional tuning
MAX_QUESTIONS=500          # Stop after N questions
REQUEST_DELAY_MS=1000      # Wait between API calls
```

---

## Troubleshooting

**"Browser won't open"**
- Windows: Make sure Edge or Chrome is installed
- Run: `npm run install:browsers`

**"Invalid API key"**
- Run `npm run setup` again to reconfigure
- For Groq: get a new key at https://console.groq.com/keys

**"No questions found"**
- Make sure you're on an active quiz attempt page (URL contains `/mod/quiz/attempt.php`)

---

## Project Structure

```
src/
  index.ts         # Main entry — routes to solve/review/auto modes
  setup.ts         # Interactive setup wizard
  browser.ts       # Browser launch (Edge → Chrome → Firefox fallback)
  scraper.ts       # Extract questions from Moodle DOM
  gpt-provider.ts  # AI provider switcher (OpenAI/Groq/Ollama)
  overlay.ts       # Highlight answers in the browser page
  navigation.ts    # Quiz pagination, URL prompts
  mode-review.ts   # Extract answers from completed quizzes
  mode-auto.ts     # Auto-select using answer bank
```

---

## Requirements

- [Node.js](https://nodejs.org) 18.0+
- Windows/macOS/Linux
- ~500MB disk space (for browser binaries)

---

## License

MIT
