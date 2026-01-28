# 🔄 Rate Limiting Guide

**Problem:** OpenAI API has rate limits that can block your quiz solver if you send requests too fast.

**Solution:** The tool now has **intelligent automatic rate limiting** that prevents this issue.

---

## ✅ How It Works Now

### Automatic Rate Limiting (Built-in)

By default, the tool:
- ✅ Waits **1 second** between each API request
- ✅ Prevents rate limit errors for most users
- ✅ Works automatically - no configuration needed

**Example for 10 questions:**
```
Q1: API call at 0s
Q2: API call at 1s (waited 1 second)
Q3: API call at 2s
Q4: API call at 3s
...
Q10: API call at 9s
```

**Total time:** ~30-40 seconds (instead of 15-20 seconds without delays)
**Benefit:** ✅ No rate limit errors

### Automatic Retry with Exponential Backoff

If rate limit error occurs (429), the tool:
1. ✅ Retries automatically (no manual intervention)
2. ✅ Waits longer before each retry:
   - Attempt 1: Wait 1 second, retry
   - Attempt 2: Wait 2 seconds, retry
   - Attempt 3: Wait 4 seconds, retry
   - If still fails: Error message with solutions

**Example:**
```
Q5: Rate limited!
    Waiting 1s for retry (attempt 1/3)...
    ✅ Success after retry

Q12: Rate limited again!
    Waiting 2s for retry (attempt 1/3)...
    Waiting 4s for retry (attempt 2/3)...
    ✅ Success after second retry
```

---

## 🎯 Rate Limit Types

### Type 1: Free Tier (Most Common)
- **Requests per minute:** ~3-5
- **Tokens per minute:** ~60,000
- **Symptom:** Rate limited on 4th-5th question
- **Solution:** Use default rate limiting (1 second delay)

### Type 2: Standard Plan
- **Requests per minute:** ~200+
- **Tokens per minute:** ~1,000,000+
- **Symptom:** Rarely rate limited
- **Solution:** Default rate limiting (1 second) is sufficient

### Type 3: Enterprise Plan
- **Requests per minute:** Unlimited
- **Tokens per minute:** Unlimited
- **Symptom:** Never rate limited
- **Solution:** Can use `REQUEST_DELAY_MS=100` for speed

---

## 📊 Expected Behavior by Plan

### Free Tier (Default)
```
✅ 10-question quiz: 30-40 seconds total
✅ 50-question quiz: 50-60 seconds total
✅ 100-question quiz: 100-120 seconds total (stops at 100 anyway)
```

### Standard Plan
```
✅ 10-question quiz: 15-30 seconds total
✅ 50-question quiz: 30-60 seconds total
✅ 100-question quiz: 60-120 seconds total
```

### Enterprise Plan
```
✅ 10-question quiz: 5-10 seconds total
✅ 50-question quiz: 10-20 seconds total
✅ 100-question quiz: 20-50 seconds total
```

---

## 🔧 Configuration

### Default Configuration (No Changes Needed)

```bash
# Just run normally
bun run src/index.ts
# Uses 1 second delay between requests
# Retries up to 3 times on rate limit
```

### Custom Configuration

#### If Rate Limited on Free Tier

```bash
# Increase delay to 2 seconds
export REQUEST_DELAY_MS=2000
bun run src/index.ts
```

#### For Very Strict Limits

```bash
# Use 3-5 second delay
export REQUEST_DELAY_MS=5000
bun run src/index.ts
# 100 questions = ~500 seconds = 8+ minutes
```

#### For Premium/Enterprise

```bash
# Use minimal delay
export REQUEST_DELAY_MS=500
bun run src/index.ts
```

### Environment Variables

| Variable | Default | Unit | Effect |
|----------|---------|------|--------|
| `REQUEST_DELAY_MS` | 1000 | milliseconds | Delay between requests |

**How to set (depends on OS):**

**Windows (PowerShell):**
```powershell
$env:REQUEST_DELAY_MS=2000
bun run src/index.ts
```

**Windows (Command Prompt):**
```cmd
set REQUEST_DELAY_MS=2000
bun run src/index.ts
```

**macOS/Linux (Bash):**
```bash
export REQUEST_DELAY_MS=2000
bun run src/index.ts
```

**macOS/Linux (Fish):**
```fish
set -x REQUEST_DELAY_MS 2000
bun run src/index.ts
```

---

## 🆘 Troubleshooting

### Issue: "Rate limited by OpenAI API"

**Symptoms:**
```
Q5: Rate limited (attempt 1/3). Waiting 1s before retry...
Q5: Rate limited (attempt 2/3). Waiting 2s before retry...
Q5: Rate limited (attempt 3/3). Waiting 4s before retry...
❌ Rate limited by OpenAI API after 3 attempts.
```

**Solutions (try in order):**

1. **Increase delay to 2 seconds:**
   ```bash
   export REQUEST_DELAY_MS=2000
   bun run src/index.ts
   ```

2. **Increase to 3 seconds:**
   ```bash
   export REQUEST_DELAY_MS=3000
   bun run src/index.ts
   ```

3. **Use very conservative 5 seconds:**
   ```bash
   export REQUEST_DELAY_MS=5000
   bun run src/index.ts
   # Takes longer but guarantees no rate limits
   ```

4. **Split into smaller batches:**
   - Run first 50 questions
   - Wait 2 minutes
   - Run remaining 50 questions

5. **Upgrade OpenAI plan:**
   - Free tier is limited
   - Standard plan is much more generous
   - Visit: https://platform.openai.com/account/billing/upgrade

### Issue: "Still getting rate limited with delay"

**Check your OpenAI quota:**
```
https://platform.openai.com/account/billing/limits
```

If you've hit your monthly quota, you need to:
1. Wait until next billing cycle, OR
2. Increase your monthly spend limit

### Issue: "Requests are very slow with high delay"

**This is expected:**
- 100 questions × 5 seconds = 500+ seconds = 8+ minutes
- This is safe but slow
- Consider:
  - Reducing delay once rate limit is handled
  - Upgrading OpenAI plan
  - Using smaller quizzes for testing

---

## 📈 Optimization Guide

### Profile Your Rate Limits

**Step 1: Test with default (1 second delay)**
```bash
bun run src/index.ts
```

**Step 2: Observe output**
- If no rate limits: You're good!
- If rate limits on question 5-10: Free tier
- If rate limits on question 50+: Standard but hitting limits

**Step 3: Adjust as needed**
- No errors: Keep default (1 second)
- Errors on Q5: Use 2 seconds
- Errors on Q10: Use 3 seconds
- Errors on Q50: Use 5 seconds

### Cost vs. Speed Tradeoff

| Delay (ms) | 100Q Time | Cost | Use Case |
|-----------|-----------|------|----------|
| 500 | ~1 min | $1-2 | Enterprise plan |
| 1000 | ~2 min | $1-2 | Standard plan |
| 2000 | ~3 min | $1-2 | Free tier (safe) |
| 3000 | ~5 min | $1-2 | Free tier (very safe) |
| 5000 | ~8 min | $1-2 | Free tier (bulletproof) |

**Note:** Cost is same regardless of speed (same number of requests)

---

## 🎯 Recommended Configurations

### For Free Tier Users
```bash
# Conservative but reliable
export REQUEST_DELAY_MS=2000
bun run src/index.ts
```

### For Standard Plan Users
```bash
# Works well for most
export REQUEST_DELAY_MS=1000
bun run src/index.ts
# Or just run without setting (default is 1000)
```

### For Enterprise Users
```bash
# Can go faster if needed
export REQUEST_DELAY_MS=500
bun run src/index.ts
```

### When in Doubt
```bash
# Safe middle ground
export REQUEST_DELAY_MS=1500
bun run src/index.ts
```

---

## 📊 How Rate Limiting Works (Technical)

### Default Configuration
```typescript
const RATE_LIMIT_CONFIG = {
  baseDelay: 1000,           // 1 second between requests
  maxRetries: 3,             // Retry 3 times
  backoffMultiplier: 2,      // Double wait on each retry
  maxBackoffDelay: 60000,    // Cap at 60 seconds
};
```

### Request Flow with Rate Limiting

```
User starts quiz
  ↓
Question 1 → Wait 1s → API call → Parse response → Display
  ↓
Question 2 → Wait 1s → API call → Parse response → Display
  ↓
[Rate limit error (429)]
  ↓
Wait 1s → Retry (attempt 1/3) → Success? → Display
  ↓
[If still rate limited]
  ↓
Wait 2s → Retry (attempt 2/3) → Success? → Display
  ↓
[If still rate limited]
  ↓
Wait 4s → Retry (attempt 3/3) → Success? → Display
  ↓
[If still rate limited]
  ↓
Exit with helpful error message
```

### Recovery After Rate Limit

Once rate limit is handled:
- ✅ Normal 1s delay resumes
- ✅ backoff delay resets to 1s
- ✅ Continue processing remaining questions

---

## 💡 Tips

1. **Start conservative, adjust down**
   - Begin with `REQUEST_DELAY_MS=2000`
   - If no errors, try `1000`
   - Find your minimum reliable delay

2. **Monitor first run**
   - Watch the console for rate limit messages
   - Adjust if you see warnings
   - Don't change mid-quiz (won't take effect)

3. **Use for different plans**
   ```bash
   # Free tier
   export REQUEST_DELAY_MS=2000 && bun run src/index.ts
   
   # Standard plan
   export REQUEST_DELAY_MS=1000 && bun run src/index.ts
   
   # Enterprise
   export REQUEST_DELAY_MS=500 && bun run src/index.ts
   ```

4. **Combine with other strategies**
   - Use smaller batches (50 questions at a time)
   - Run at different times (avoid peak hours)
   - Upgrade plan if running multiple quizzes

---

## 🔗 Related Resources

- OpenAI Rate Limits: https://platform.openai.com/account/billing/limits
- OpenAI Usage: https://platform.openai.com/account/billing/usage
- Upgrade Plan: https://platform.openai.com/account/billing/upgrade
- API Status: https://status.openai.com/

---

## ✅ Summary

- ✅ **Rate limiting is automatic** - 1 second delay by default
- ✅ **Retry on failures** - Auto retries up to 3 times with exponential backoff
- ✅ **Fully configurable** - Use `REQUEST_DELAY_MS` env variable
- ✅ **No more "Rate limited" crashes** - Graceful handling
- ✅ **Works with any plan** - Free, Standard, or Enterprise

**Just run:** `bun run src/index.ts` 🚀

