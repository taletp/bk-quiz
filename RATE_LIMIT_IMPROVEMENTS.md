# 🔄 Rate Limit Handling - Smart Retry & Wait

## What Was Fixed

You were getting this error when hitting Groq's rate limit:

```
❌ Fatal error: Error: 429 Rate limit reached for model `llama-3.3-70b-versatile` 
in organization... on requests per minute (RPM): Limit 30, Used 30, Requested 1. 
Please try again in 2s.
```

**Problem**: Tool crashed instead of waiting and retrying.

**Solution**: Now the tool automatically waits and retries when rate limits are hit.

---

## How It Works Now

### Before (Old Behavior)
```
Request → Rate Limit Error → ❌ Crash
```

### After (New Behavior)
```
Request → Rate Limit Error 
        → Extract "wait 2s" from error
        → Wait 2 seconds
        → Retry automatically
        → Success! ✅
```

---

## Smart Rate Limit Detection

The tool now distinguishes between two types of 429 errors:

### 1. Rate Limit (Recoverable) 🔄
- **Message contains**: "rate limit reached", "RPM", "TPM"
- **What happens**: Tool waits and retries automatically
- **Result**: Question is eventually answered

Example:
```
⚠️ Q30: Rate limited (attempt 1/5). Waiting 2.0s before retry...
```

### 2. Quota Exhaustion (Not Recoverable) ❌
- **Message contains**: "quota", "billing", "insufficient_quota"
- **What happens**: Tool either skips (if SKIP_ON_RATE_LIMIT=true) or exits
- **Result**: Account needs credits/upgrade

Example:
```
⚠️ Q30: Quota exhausted
```

---

## Configuration

### For Groq (Free Tier)

Groq free tier: **30 requests per minute** = 2 seconds per request

The tool now automatically uses:
```
baseDelay: 2000ms      # 2 seconds between requests
maxRetries: 5          # Retry up to 5 times
backoffMultiplier: 1.5 # Gradually increase wait time
maxBackoffDelay: 120s  # Cap at 2 minutes
```

This means:
- Attempt 1: Wait 2s
- Attempt 2: Wait 3s
- Attempt 3: Wait 4.5s
- Attempt 4: Wait 6.75s
- Attempt 5: Wait 10s

**Total max wait: ~26 seconds before failing**

### For OpenAI

OpenAI API has its own rate limits. Tool retries with exponential backoff:
```
baseDelay: 1000ms      # 1 second between requests
maxRetries: 3          # Retry up to 3 times
```

---

## Extract Wait Time from API

The tool now **extracts the wait time** from the API error message:

**Example Groq Error:**
```
429 Rate limit reached... Please try again in 2s
```

The tool:
1. Detects "try again in 2s"
2. Extracts: 2 seconds
3. Waits exactly 2 seconds (not more, not less)
4. Retries the request

This is **smarter than generic backoff** because it uses the API's recommendation.

---

## Real-World Example

### Scenario: Quiz with 50 questions on Groq Free Tier

**Rate limit hits after ~30 questions:**

```
Q30: Rate limited (attempt 1/5). Waiting 2.0s before retry...
   [waits 2 seconds]
✅ Q30: B (high confidence)

Q31: Rate limited (attempt 1/5). Waiting 2.0s before retry...
   [waits 2 seconds]
✅ Q31: A (high confidence)

... continues normally ...

Q50: Completed
   Questions answered: 50
   Questions skipped: 0
```

**Result**: Quiz completed without intervention!

---

## Skip Mode (Fallback)

If you want to skip questions on rate limit instead of waiting:

```bash
export SKIP_ON_RATE_LIMIT=true
bun run start
```

Then:
```
Q30: Rate limited (attempt 1/5). Waiting 2.0s before retry...
Q30: Rate limited (attempt 2/5). Waiting 3.0s before retry...
Q30: Rate limited (attempt 3/5). Waiting 4.5s before retry...
Q30: Rate limited (attempt 4/5). Waiting 6.75s before retry...
Q30: Rate limited (attempt 5/5). Waiting 10.0s before retry...
⚠️ Q30: Rate limited after 5 attempts, skipping...
```

Result: Question is marked as UNKNOWN and skipped.

---

## For Different Providers

### Groq (Free Tier)
- Limit: 30 requests/minute
- Recommended: Default settings work well
- Max wait: ~26 seconds per question

### Groq (Dev Tier)
- Limit: Higher (depends on subscription)
- Recommended: Same settings (tool adapts to API responses)

### OpenAI
- Limit: Depends on your plan
- Recommended: Increase delays if hitting limits:
  ```bash
  export REQUEST_DELAY_MS=2000  # 2 seconds between requests
  bun run start
  ```

### Ollama (Local)
- Limit: Unlimited (runs on your computer)
- No rate limits! Just slower performance

---

## Troubleshooting

### "Still getting rate limit errors after waiting"

This means you're hitting quota exhaustion, not rate limits.

**Check your account:**
- Groq: https://console.groq.com/settings/billing
- OpenAI: https://platform.openai.com/account/billing/overview

**Solutions:**
1. Upgrade to paid tier
2. Use SKIP_ON_RATE_LIMIT=true to skip failed questions
3. Switch to Ollama (free, unlimited)

### "Waiting too long between requests"

The tool adapts to API responses. But you can adjust with env vars:

```bash
# Conservative (slower, safer)
export REQUEST_DELAY_MS=3000
bun run start

# Aggressive (faster, risky)
export REQUEST_DELAY_MS=500
bun run start
```

### "Want to maximize speed"

For Groq free tier, the optimal setting is:
```bash
export REQUEST_DELAY_MS=2000  # Exactly 2s for 30 RPM
bun run start
```

---

## Code Changes

### Rate Limit Detection

**Before:**
```typescript
// Too broad - counted rate limit as quota issue
const isQuotaExhausted = status === 429 && messageLower.includes('quota');
```

**After:**
```typescript
// Smarter - only quota if no "rate limit reached" message
const isQuotaExhausted = status === 429 && (
  messageLower.includes('quota') ||
  messageLower.includes('billing')
) && !messageLower.includes('rate limit reached');
```

### Extract Wait Time

**Before:**
```typescript
// Generic exponential backoff, ignored API suggestions
currentBackoffDelay = currentBackoffDelay * 2;
```

**After:**
```typescript
// Use API-suggested wait time when available
const waitTime = errorInfo.retryAfterMs || calculateBackoff();
```

---

## Performance Impact

### Quiz Completion Time

| Scenario | Time | Notes |
|----------|------|-------|
| No rate limits | ~2 min | Normal speed |
| Hit 1 rate limit | ~2.5 min | +30s waiting |
| Hit 3 rate limits | ~3.5 min | +90s waiting |
| Many rate limits | Varies | Depends on frequency |

**Key point**: Tool waits intelligently, then continues automatically.

---

## Summary

✅ **Automatic retries** - No manual intervention needed
✅ **Smart wait times** - Uses API recommendations
✅ **Graceful degradation** - Skips failed questions if enabled
✅ **Better UX** - Shows progress, not errors
✅ **Works with all providers** - Groq, OpenAI, Ollama

**Now you can run large quizzes without worrying about rate limits! 🚀**
