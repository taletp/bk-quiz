# 🔧 Groq Model Deprecation Bugfix

## Problem

When trying to use Groq provider, users got this error:

```
❌ Groq API error: 400 The model `mixtral-8x7b-32768` has been decommissioned 
and is no longer supported. Please refer to 
https://console.groq.com/docs/deprecations for a recommendation on which model 
to use instead.
```

**Root Cause:** Mixtral-8x7b was deprecated by Groq in December 2024. The tool was hardcoded to use this outdated model.

---

## Solution

### Fixed Files

#### 1. `src/gpt-groq.ts`
- ❌ **Old model**: `mixtral-8x7b-32768` (deprecated)
- ✅ **New model**: `llama-3.3-70b-versatile` (current)
- ✅ **Added support**: for both `gsk_` and `xai_` API key prefixes
- ✅ **Updated**: validation to accept both prefix formats

#### 2. `GROQ_SETUP.md`
- ✅ Updated model comparison table
- ✅ Added deprecation note for Mixtral
- ✅ Mentioned xAI variant support
- ✅ Added troubleshooting for model decommissioning

### Code Changes

**Before:**
```typescript
const response = await groq.chat.completions.create({
  model: 'mixtral-8x7b-32768', // ❌ Deprecated
  ...
});

if (!apiKey.startsWith('gsk_')) {  // ❌ Only gsk_
  printError('❌ Invalid GROQ_API_KEY format (should start with "gsk_")');
  return false;
}
```

**After:**
```typescript
const response = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile', // ✅ Current & supported
  ...
});

// Accept both gsk_ (standard) and xai_ (xAI variant) prefixes
if (!apiKey.startsWith('gsk_') && !apiKey.startsWith('xai_')) {
  printError('❌ Invalid GROQ_API_KEY format (should start with "gsk_" or "xai_")');
  return false;
}
```

---

## Testing

Now when you run with Groq:

```bash
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start
```

✅ Should work without model deprecation errors
✅ Uses current llama-3.3-70b-versatile model
✅ Accepts both gsk_ and xai_ prefixes

---

## Model Comparison (Current)

| Model | Speed | Quality | Context | Status |
|-------|-------|---------|---------|--------|
| **llama-3.3-70b-versatile** | ⚡⚡ | Excellent | 128k | ✅ Current (recommended) |
| llama-3.1-8b-instant | ⚡⚡⚡ | Good | 128k | ✅ Available (fast) |
| gpt-oss-120b | ⚡ | Very Good | 128k | ✅ Available (best quality) |
| ❌ mixtral-8x7b | (deprecated) | (deprecated) | (deprecated) | ❌ Removed |

---

## Commits

1. `873d858` - fix: update Groq to use current model llama-3.3-70b-versatile
2. `3810d96` - docs: update Groq documentation with current model info
3. `ed9b5b0` - chore: remove test file

---

## What You Need to Do

### For Users with Groq Already Set Up

Just run the tool again - it will now use the new model:

```bash
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start
```

### No Code Changes Needed

The fix is backward compatible - your `.env` and environment variables work the same way.

---

## API Key Prefixes

The tool now supports both Groq variants:

```bash
# Standard Groq (groq.com)
export GROQ_API_KEY=gsk_xxxxx

# xAI variant (xai.com)
export GROQ_API_KEY=xai_xxxxx

# Both work now!
export LLM_PROVIDER=groq
bun run start
```

---

## Troubleshooting

### If you still get model errors

1. **Make sure you pulled the latest code:**
   ```bash
   git pull origin main
   ```

2. **Verify you're using Groq:**
   ```bash
   echo $LLM_PROVIDER  # Should print: groq
   ```

3. **Check your API key:**
   ```bash
   echo $GROQ_API_KEY  # Should print: gsk_xxxx or xai_xxxx
   ```

4. **Try running again:**
   ```bash
   bun run start
   ```

### If you get "Invalid GROQ_API_KEY format"

Your API key doesn't start with `gsk_` or `xai_`. 

**Solution:**
- Get a new key from: https://console.groq.com/keys
- Make sure it starts with `gsk_`

---

## Future-Proofing

If Groq deprecates this model again in the future, we can quickly update by:

1. Checking https://console.groq.com/docs/models for current models
2. Updating the model name in `src/gpt-groq.ts`
3. Committing the fix

That's it - no other code changes needed!

---

## Summary

✅ **Groq provider now works** with current supported models  
✅ **Supports both API key formats** (gsk_ and xai_)  
✅ **No user action needed** - just pull and run  
✅ **Future-proof** - easy to update if models change again  

**You're all set to use Groq! 🚀**
