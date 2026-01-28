# Documentation Index

## 📋 Quick Navigation

### Getting Started (Pick One)
- **[QUICK_START.md](./QUICK_START.md)** (5 min read)
  - Installation and first run
  - Common issues and solutions
  - Quick troubleshooting

- **[README.md](./README.md)** (Full guide, 30 min read)
  - Complete feature documentation
  - Installation and usage
  - Troubleshooting FAQ
  - Advanced configuration

### Problem-Specific Guides
- **[COMMANDS.md](./COMMANDS.md)** (Command reference)
  - Copy-paste commands for any situation
  - Environment variable reference
  - Recommended workflows
  - One-liners for common tasks

- **[SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md)** (Rate limit solutions)
  - Skip-and-continue mode explained
  - Error types and what they mean
  - Hybrid approach strategy
  - Failed question tracking

- **[RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md)** (Rate limiting details)
  - How rate limiting works
  - Configuration options
  - Cost control strategies
  - Troubleshooting

### Reference & Status
- **[STATUS_REPORT.md](./STATUS_REPORT.md)** (Technical details)
  - Project structure
  - Build status
  - Feature checklist
  - Known issues

- **[SESSION_SUMMARY.md](./SESSION_SUMMARY.md)** (Today's work)
  - What was done this session
  - Before/after comparison
  - Success metrics
  - Commits list

---

## 🎯 By Use Case

### "I'm starting for the first time"
1. Read: [QUICK_START.md](./QUICK_START.md)
2. Copy: `.env.example` to `.env`
3. Add: Your OpenAI API key
4. Run: `bun run start`

### "I keep getting rate limited"
**Option A:** Increase delays
```bash
export REQUEST_DELAY_MS=15000
bun run start
```

**Option B:** Use skip mode (recommended)
```bash
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

See: [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md) for details

### "My quota is exhausted"
1. Check: https://platform.openai.com/account/billing/overview
2. Options:
   - **Upgrade plan** → Higher limits
   - **Use skip mode** → Get partial results
   - **Wait** → Until next month (free tier)

See: [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md#quota-exhaustion)

### "I need a specific command"
See: [COMMANDS.md](./COMMANDS.md) for:
- Scenarios (first time, rate limited, etc.)
- Environment variable reference
- One-liner commands
- Troubleshooting commands

### "I want to understand how it works"
1. Read: [README.md](./README.md) (Overview)
2. Read: [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md) (Technical)
3. Check: [STATUS_REPORT.md](./STATUS_REPORT.md) (Details)

---

## 📊 File Structure

```
Root Documentation:
├── INDEX.md                    ← You are here
├── QUICK_START.md             ← 5-minute intro
├── README.md                  ← Full guide
├── COMMANDS.md                ← Command reference
├── SKIP_MODE_GUIDE.md         ← Skip mode & quotas
├── RATE_LIMITING_GUIDE.md     ← Rate limiting details
├── STATUS_REPORT.md           ← Technical status
└── SESSION_SUMMARY.md         ← Today's work

Source Code:
├── src/
│   ├── index.ts              ← Main entry point
│   ├── gpt.ts                ← GPT & rate limiting ⭐ Enhanced
│   ├── scraper.ts            ← Moodle extraction
│   ├── browser.ts            ← Browser control
│   ├── overlay.ts            ← Visual highlighting
│   ├── navigation.ts         ← URL navigation
│   ├── utils.ts              ← Utilities
│   └── validation.ts         ← Input validation
├── package.json              ← Dependencies
├── tsconfig.json             ← TypeScript config
└── .env.example              ← API key template
```

---

## 🔄 Documentation Updates (This Session)

**New Documentation:**
- [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md) (500+ lines)
- [COMMANDS.md](./COMMANDS.md) (300+ lines)
- [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) (300+ lines)
- [INDEX.md](./INDEX.md) (this file)

**Updated Documentation:**
- README.md - Added skip mode FAQ
- QUICK_START.md - Simplified with skip mode solutions

**New Features:**
- Skip-and-continue mode (via `SKIP_ON_RATE_LIMIT=true`)
- Quota exhaustion detection
- Failed question tracking
- Improved error messages

---

## ⚡ Common Commands

### Start Fresh
```bash
bun run start
```

### With Rate Limit Prevention
```bash
export REQUEST_DELAY_MS=15000
bun run start
```

### With Quota Handling (RECOMMENDED)
```bash
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Check Your Settings
```bash
echo "API: ${OPENAI_API_KEY:0:20}... | Skip: ${SKIP_ON_RATE_LIMIT:-false} | Delay: ${REQUEST_DELAY_MS:-1000}ms"
```

See [COMMANDS.md](./COMMANDS.md) for 20+ more examples.

---

## ✨ Key Features

### 🚀 Automatic Question Analysis
- Scrapes Moodle quiz questions
- Sends to GPT-4o for analysis
- Returns answers with confidence

### 🎯 Visual Highlighting
- Highlights answers in Moodle
- Shows confidence (high/low)
- Clickable to select

### ⏱️ Rate Limiting
- Automatic delays between requests
- Configurable via `REQUEST_DELAY_MS`
- Exponential backoff on failures

### 📋 Skip Mode
- Skip failed questions
- Continue processing remaining
- Track which questions failed

### 🛡️ Error Detection
- Distinguishes quota vs rate limit
- Provides actionable solutions
- Links to relevant resources

---

## 🐛 Troubleshooting Quick Links

- Getting rate limited? → [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md#rate-limit)
- Quota exhausted? → [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md#quota-exhaustion)
- Command not found? → [COMMANDS.md](./COMMANDS.md#installation-issues)
- API key issues? → [README.md](./README.md#troubleshooting)
- Questions not found? → [README.md](./README.md#faq)

---

## 📞 Quick Help

### Setup
```bash
cd ~/Desktop/bk-quiz
cp .env.example .env
# Edit .env with your OpenAI API key
bun run start
```

### Not Working?
1. Check [QUICK_START.md](./QUICK_START.md) Common Issues
2. Try [COMMANDS.md](./COMMANDS.md) scenarios
3. Read full [README.md](./README.md)

### Rate Limited?
```bash
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Still Stuck?
Check [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md#troubleshooting) troubleshooting section.

---

## 📈 Documentation Statistics

| Document | Lines | Purpose |
|----------|-------|---------|
| README.md | 1200+ | Full guide |
| SKIP_MODE_GUIDE.md | 500+ | Skip mode & quota handling |
| RATE_LIMITING_GUIDE.md | 400+ | Rate limiting details |
| COMMANDS.md | 300+ | Command reference |
| QUICK_START.md | 200+ | Quick intro |
| STATUS_REPORT.md | 300+ | Technical status |
| SESSION_SUMMARY.md | 300+ | Today's work |
| **Total** | **3600+** | **Comprehensive** |

---

## ✅ What's New This Session

**Feature:** Skip-and-Continue Mode
- Skip rate-limited questions instead of exiting
- Continue processing remaining questions
- Track and display failed questions

**Feature:** Quota Detection
- Distinguish quota exhaustion from rate limiting
- Provide specific solutions for each case
- Link to OpenAI billing page

**Improvement:** Better Error Messages
- Actionable solutions included
- Examples of commands to try
- Links to helpful resources

**Documentation:** 4 New Guides
- Skip mode guide (comprehensive)
- Command reference (copy-paste)
- Session summary (what was done)
- Documentation index (this file)

---

## 🎓 Learning Path

1. **First Time?** Start → [QUICK_START.md](./QUICK_START.md) (5 min)
2. **Want Commands?** → [COMMANDS.md](./COMMANDS.md) (ref)
3. **Need Deep Dive?** → [README.md](./README.md) (30 min)
4. **Rate Limit Issues?** → [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md) (15 min)
5. **Technical Details?** → [STATUS_REPORT.md](./STATUS_REPORT.md) (10 min)

---

**Last Updated:** January 28, 2026
**Status:** ✅ Production Ready
**All Tests:** ✅ Passing

