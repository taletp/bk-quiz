# Skip-and-Continue Mode Guide

## Overview

**Skip Mode** allows the tool to gracefully handle rate limiting and quota exhaustion by skipping failed questions and continuing to process the rest of the quiz. This is useful when:

- Your OpenAI API quota has been exceeded
- Your account has billing issues
- Your API key has strict rate limits
- You want to gather as many answers as possible before hitting limits

## Quick Start

### Enable Skip Mode
```bash
export SKIP_ON_RATE_LIMIT=true
bun run start
```

### What Happens
- Tool processes quiz questions normally
- If a question gets rate-limited or quota-limited:
  - ⚠️ Logs warning with question number
  - ❌ Skips that question (marks as UNKNOWN)
  - ✅ Continues to next question
- At the end: Shows summary of skipped questions

### Example Output
```
⚠️ Q1: Rate limited (attempt 1/6). Waiting 3.0s before retry...
⚠️ Q1: Rate limited (attempt 2/6). Waiting 9.0s before retry...
...
⚠️ Q1: Skipped (quota exhausted)

⚠️ Q2: API error - Invalid request
✅ Q3: B (high confidence)

🔍 Quiz processing complete!
   Questions answered: 8
   Questions skipped: 2
   Questions skipped (rate limited): Q1, Q5
```

## Error Types

### Quota Exhaustion (STOP without skip)
```
Error: Your OpenAI account has reached its spending or usage limit.
Solutions:
1. Check https://platform.openai.com/account/billing/overview
2. Update your billing method or increase your spending limit
3. Wait until next month if on a monthly plan
4. Upgrade your plan for higher limits

Or use SKIP_ON_RATE_LIMIT=true to skip failed questions
```

**What to do:**
- Check your OpenAI usage at https://platform.openai.com/account/billing/overview
- Update billing method or increase limit
- Then either:
  - Run again without skip mode (wait for quota reset)
  - Use skip mode to get partial results

### Rate Limit (STOP without skip)
```
Error: Rate limited by OpenAI API after 6 attempts.
Your API plan may have very strict rate limits.

Options:
1. Wait 1-2 minutes and run again
2. Increase delays between requests:
   export REQUEST_DELAY_MS=30000  # 30 seconds
   bun run start
3. Upgrade your OpenAI plan for higher limits
4. Use skip mode to continue with failed questions:
   export SKIP_ON_RATE_LIMIT=true && bun run start
```

**What to do:**
- Wait 1-2 minutes and try again
- Or increase REQUEST_DELAY_MS for longer waits between requests
- Or use skip mode to get answers for remaining questions

## Environment Variables

### SKIP_ON_RATE_LIMIT
```bash
# Enable skip mode
export SKIP_ON_RATE_LIMIT=true

# Disable skip mode (default)
export SKIP_ON_RATE_LIMIT=false
# or just don't set it
```

### REQUEST_DELAY_MS
```bash
# Increase delay between requests (milliseconds)
export REQUEST_DELAY_MS=30000  # 30 seconds between questions
bun run start
```

**Recommended delays for strict API keys:**
```bash
export REQUEST_DELAY_MS=5000   # 5 seconds (start here)
export REQUEST_DELAY_MS=10000  # 10 seconds (if still failing)
export REQUEST_DELAY_MS=30000  # 30 seconds (very conservative)
export REQUEST_DELAY_MS=60000  # 60 seconds (extremely conservative)
```

## Strategy: Hybrid Approach

For maximum success, combine these settings:

```bash
# Conservative: Long delays + skip mode
export REQUEST_DELAY_MS=15000 && export SKIP_ON_RATE_LIMIT=true
bun run start
```

**Why this works:**
- Long delays reduce frequency of API calls
- Skip mode allows tool to continue even if it hits limits
- You get maximum coverage of the quiz

## Monitoring Failed Questions

The tool tracks which questions failed:

```
Questions skipped (rate limited): Q1, Q5, Q10, Q23
```

You can:
1. **Re-run the tool later** when quota resets (next month for free tier)
2. **Focus on those specific questions** manually
3. **Use a different API key** if available and then rerun for just those questions

## Checking Your API Usage

Always check your quota before running the tool:

```bash
# Visit this URL to see your usage
https://platform.openai.com/account/billing/overview
```

**Free tier:** 
- $5 free credits
- Available for 3 months from account creation
- No payment method required
- Limited to demo/testing

**Paid tier:**
- Pay-as-you-go billing
- Requires valid payment method
- Higher rate limits
- More generous quota

## Cost Control

The tool has built-in cost limits:

- **Maximum 100 questions per run** (prevents runaway costs)
- **Suggests long delays** before each request
- **Supports per-question cost tracking** (future)

Set environment variables to be extra safe:

```bash
# Limit questions processed
export MAX_QUESTIONS=50  # Process max 50 questions
bun run start

# Combined with skip mode
export MAX_QUESTIONS=50 && export SKIP_ON_RATE_LIMIT=true && export REQUEST_DELAY_MS=10000
bun run start
```

## Troubleshooting

### "Still getting rate limited even with skip mode"

Check:
1. Is `SKIP_ON_RATE_LIMIT=true` actually set?
   ```bash
   echo $SKIP_ON_RATE_LIMIT  # Should print "true"
   ```

2. Increase delays more:
   ```bash
   export REQUEST_DELAY_MS=60000  # 60 seconds
   bun run start
   ```

3. Check your quota:
   - Visit https://platform.openai.com/account/billing/overview
   - If usage is near limit, you need new plan or to wait

### "Skip mode doesn't seem to work"

Skip mode only works for rate limit and quota errors. Other errors (like auth errors) still exit:
- Quota exhausted → SKIP ✓
- Rate limit after retries → SKIP ✓
- Invalid API key → EXIT (can't skip auth errors)
- Server error (500) → SKIP (already handled)

### "I want to see which questions I skipped"

At end of run, the tool shows:
```
Questions skipped (rate limited): Q1, Q5, Q10
```

You can manually answer these later.

## Advanced: Retry Failed Questions

Create a helper script to retry only failed questions:

```bash
#!/bin/bash
# File: retry-failed.sh

# Run with skip mode first
export SKIP_ON_RATE_LIMIT=true
bun run start

# Wait for quota to reset
echo "Waiting 30 seconds..."
sleep 30

# Run again (will retry failed questions)
export SKIP_ON_RATE_LIMIT=false  # Exit on errors this time
bun run start
```

Run it:
```bash
chmod +x retry-failed.sh
./retry-failed.sh
```

## See Also

- [README.md](./README.md) - Complete user guide
- [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md) - Rate limiting details
- [QUICK_START.md](./QUICK_START.md) - Quick reference

## Questions?

Check the troubleshooting section in README.md or run:
```bash
bun run start --help
```
