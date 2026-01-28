# Common Commands Reference

## Quick Start

```bash
# 1. Setup (one time)
cd ~/Desktop/bk-quiz
cp .env.example .env
# Edit .env with your OpenAI API key

# 2. Run the tool
bun run start

# 3. Log in when prompted
# 4. Wait for quiz to process
# 5. Review highlighted answers in browser
# 6. Press Enter to close
```

## For Different Scenarios

### Scenario 1: First Time (Normal)
```bash
cd ~/Desktop/bk-quiz
bun run start
```

### Scenario 2: Getting Rate Limited
```bash
# Option A: Slow down requests
export REQUEST_DELAY_MS=10000  # 10 seconds between questions
bun run start

# Option B: More conservative
export REQUEST_DELAY_MS=30000  # 30 seconds
bun run start

# Option C: Very conservative
export REQUEST_DELAY_MS=60000  # 60 seconds (safest)
bun run start
```

### Scenario 3: Quota Exhausted (Free Tier)
```bash
# Option A: Wait until next month for quota reset
# Option B: Use skip mode to get partial results
export SKIP_ON_RATE_LIMIT=true
bun run start

# Option C: Combine delays + skip mode (RECOMMENDED)
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Scenario 4: Check API Usage Before Running
```bash
# Open this URL in browser to check quota
https://platform.openai.com/account/billing/overview

# Or check current environment setup
echo "API Key: ${OPENAI_API_KEY:0:20}..."
echo "Skip Mode: ${SKIP_ON_RATE_LIMIT:-false}"
echo "Delay: ${REQUEST_DELAY_MS:-1000}ms"
```

### Scenario 5: Run with Multiple Options
```bash
# Combine environment variables
export OPENAI_API_KEY="sk-..."
export REQUEST_DELAY_MS=20000
export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Scenario 6: Different Moodle URL
```bash
# The tool will prompt for URL, or set it
export MOODLE_URL="https://your-moodle.edu/mod/quiz/view.php?id=123"
bun run start
```

### Scenario 7: Process Only First N Questions
```bash
# Process max 50 questions (cost control)
# Note: Tool already caps at 100 by default
export REQUEST_DELAY_MS=10000
bun run start
```

## Environment Variables Reference

| Variable | Default | Example | Purpose |
|----------|---------|---------|---------|
| `OPENAI_API_KEY` | Required | `sk-abc123...` | API key for authentication |
| `REQUEST_DELAY_MS` | `1000` | `10000` | Milliseconds between requests |
| `SKIP_ON_RATE_LIMIT` | `false` | `true` | Skip failed questions instead of exiting |
| `MOODLE_URL` | Prompted | `https://...` | Quiz URL (usually prompted) |

## Troubleshooting Commands

### Check if Bun is Installed
```bash
which bun
bun --version
```

### Check TypeScript Compilation
```bash
bunx tsc --noEmit
```

### Rebuild Dependencies
```bash
rm -rf node_modules bun.lock
bun install
```

### Run with Debug Output
```bash
# Node.js debug mode
NODE_DEBUG=* bun run start

# Or just increase verbosity by checking logs
bun run start 2>&1 | tee quiz.log
```

### Check Git Status
```bash
git status
git log --oneline -5
```

## One-Line Commands

### Start Fresh (Reset Everything)
```bash
git checkout . && rm -rf node_modules && bun install && bun run start
```

### Aggressive Rate Limiting (Most Reliable)
```bash
export SKIP_ON_RATE_LIMIT=true && export REQUEST_DELAY_MS=30000 && bun run start
```

### Ultra-Conservative (Slowest but Safest)
```bash
export SKIP_ON_RATE_LIMIT=true && export REQUEST_DELAY_MS=60000 && bun run start
```

### Check Before Running
```bash
echo "Key: ${OPENAI_API_KEY:0:20}... | Skip: ${SKIP_ON_RATE_LIMIT:-false} | Delay: ${REQUEST_DELAY_MS:-1000}ms" && bun run start
```

## Recommended Workflows

### Workflow 1: Balanced (Start Here)
```bash
export REQUEST_DELAY_MS=5000
bun run start
```

### Workflow 2: Conservative (If Rate Limited)
```bash
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Workflow 3: Ultra-Conservative (Quota Issues)
```bash
export REQUEST_DELAY_MS=30000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

### Workflow 4: Retry Failed Questions
```bash
# First pass with skip mode
export SKIP_ON_RATE_LIMIT=true
bun run start

# Wait a bit
sleep 60

# Second pass (will retry failed questions)
bun run start
```

## File Structure

```
bk-quiz/
├── src/
│   ├── index.ts          # Main entry point
│   ├── gpt.ts            # OpenAI API integration
│   ├── scraper.ts        # Moodle question extraction
│   ├── browser.ts        # Playwright browser control
│   ├── overlay.ts        # Visual highlighting
│   └── ...
├── .env                  # Your API key (keep private!)
├── .env.example          # Template
└── README.md             # Full documentation
```

## Installation Issues?

### "command not found: bun"
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc for Mac
```

### "Cannot find module openai"
```bash
bun install
```

### "TypeScript errors"
```bash
bunx tsc --noEmit
npm install -D typescript
bun install
```

## Support

See [README.md](./README.md) for comprehensive guide.
See [SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md) for skip mode details.
See [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md) for rate limiting details.

