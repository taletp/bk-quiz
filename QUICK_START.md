# Quick Start Guide (5 Minutes)

## Installation

```bash
# 1. Navigate to project
cd ~/Desktop/bk-quiz

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with your OpenAI API key
# Get key from: https://platform.openai.com/api-keys
# Format: sk-xxxxxxxxx...
```

## First Run

```bash
# 1. Start the tool
bun run start

# 2. When prompted, enter Moodle quiz URL (or paste it)
# Example: https://moodle.example.edu/mod/quiz/view.php?id=123

# 3. Click "Log In" in the browser (manually authenticate)

# 4. Wait for processing
# The tool will:
# - Scrape quiz questions
# - Send to GPT-4o for analysis
# - Highlight answers in browser

# 5. Review answers
# Answers will be highlighted with colored borders

# 6. Press Enter to close
```

## Getting Rate Limited?

### ⚠️ If you see: "Rate limited (attempt 1/6)..."

Try one of these (in order):

#### Option 1: Small delay (Try First)
```bash
export REQUEST_DELAY_MS=5000
bun run start
```

#### Option 2: Medium delay (If still failing)
```bash
export REQUEST_DELAY_MS=15000
bun run start
```

#### Option 3: Large delay (Most reliable)
```bash
export REQUEST_DELAY_MS=30000
bun run start
```

#### Option 4: Skip failed + long delays (RECOMMENDED)
```bash
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### 💰 If you see: "Quota exhausted"

Free tier users hit limits quickly. Options:

1. **Wait until next month** (Free tier resets monthly)
2. **Upgrade to paid** (Higher limits)
3. **Use Skip Mode** (Get partial results):
   ```bash
   export SKIP_ON_RATE_LIMIT=true
   bun run start
   ```

## Common Issues

### "bun: command not found"
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun run start
```

### "Invalid API key"
1. Check `.env` file has correct key
2. Verify key format: `sk-xxxxx...`
3. Get new key: https://platform.openai.com/api-keys

### "Questions found: 0"
- Make sure you're logged in to Moodle (click Login in browser)
- Verify quiz page fully loaded before continuing
- Check HTML structure is Moodle 4.x (see README FAQ)

### "Browser won't open"
On Windows with WSL:
```bash
export BROWSER=edge
bun run start
```

## Environment Variables Cheat Sheet

```bash
# Simple delay
export REQUEST_DELAY_MS=10000  # 10 seconds

# Skip on errors
export SKIP_ON_RATE_LIMIT=true

# Combined (BEST for quota issues)
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true && bun run start
```

## Next Steps

- **For detailed rate limiting guide:** See [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md)
- **For skip mode guide:** See [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md)
- **For all commands:** See [COMMANDS.md](./COMMANDS.md)
- **For full guide:** See [README.md](./README.md)

## Pro Tips

1. **Check API usage first:**
   - Visit https://platform.openai.com/account/billing/overview
   - If near limit, use skip mode

2. **Use skip mode for best results:**
   ```bash
   export SKIP_ON_RATE_LIMIT=true && export REQUEST_DELAY_MS=15000
   bun run start
   ```

3. **Questions still marked UNKNOWN?**
   - Run again with longer delays
   - Or upgrade to paid plan for higher quota

4. **Track failed questions:**
   - Tool shows: "Questions skipped (rate limited): Q1, Q5, Q10"
   - Answer these manually or retry later

## Troubleshooting Flow

```
Start tool
  ↓
Run into issues?
  ├─ Rate limited? → Use delay: REQUEST_DELAY_MS=15000
  ├─ Quota expired? → Use skip: SKIP_ON_RATE_LIMIT=true
  ├─ Both? → Combine: REQUEST_DELAY_MS=15000 && SKIP_ON_RATE_LIMIT=true
  └─ Still failing? → See README.md troubleshooting
```

---

**Still stuck?** Check [README.md](./README.md) troubleshooting section or see [COMMANDS.md](./COMMANDS.md) for more examples.

