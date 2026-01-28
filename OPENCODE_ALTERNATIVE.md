# Using OpenCode API Instead of OpenAI (Free Alternative)

## ⚠️ Important Note

OpenCode API is designed for **IDE/Editor integration** within the OpenCode development environment, not as a standalone chat API service. Here's what you need to know:

---

## OpenCode API Limitations

### ✅ What OpenCode Can Do
- Send prompts within the OpenCode IDE via Sessions API
- Supports multiple LLM providers (Anthropic, OpenAI, etc.)
- Works within the development environment

### ❌ What OpenCode Can't Do (for this use case)
- **No standalone API endpoint** for external applications
- **No browser automation** - can't integrate with Moodle
- **Sessions API requires** OpenCode IDE to be running
- **Not designed for** programmatic quiz answering from external apps
- **Tied to OpenCode environment** - not a general LLM API service

---

## Better Alternatives to OpenAI Free Tier

### Option 1: Ollama (Local LLM - FREE)
**Best if:** You have a decent computer, want free unlimited access

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Download a free model
ollama pull llama2  # or mistral, neural-chat, etc.

# Run local server (no API key needed!)
ollama serve

# Then use in our tool:
export LLM_PROVIDER=ollama
export LLM_ENDPOINT=http://localhost:11434
bun run start
```

✅ **Pros:** Completely free, offline, no rate limits, no quotas
❌ **Cons:** Requires local computing power, slower inference

---

### Option 2: Claude (Anthropic) via OpenRouter
**Best if:** You want better quality than free tier, pay-as-you-go

```bash
# Get free credits or API key from OpenRouter
# https://openrouter.ai

# Then use:
export LLM_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-or-v1-...
bun run start
```

✅ **Pros:** Free credits available, better models, reasonable pricing
❌ **Cons:** Not completely free after credits expire

---

### Option 3: Groq (FREE - Fastest LLM)
**Best if:** You want free API access, very fast inference

```bash
# Get free API key (no payment required!)
# https://console.groq.com/keys

# Then use:
export LLM_PROVIDER=groq
export GROQ_API_KEY=gsk_...
bun run start
```

✅ **Pros:** Free tier is generous, very fast, no rate limiting, no credit card needed
❌ **Cons:** Smaller models than GPT-4o, but still good for quiz questions

---

### Option 4: Hugging Face Inference API
**Best if:** You want free API with good models

```bash
# Free tier available at https://huggingface.co/inference-api

export LLM_PROVIDER=huggingface
export HF_API_KEY=hf_...
bun run start
```

✅ **Pros:** Free tier available, open source models
❌ **Cons:** Slightly slower than commercial APIs

---

## Recommendation for You

### Best Option: **Groq** (My suggestion)
```bash
# 1. Sign up (FREE, no credit card): https://console.groq.com
# 2. Get API key
# 3. Update .env:
export GROQ_API_KEY=gsk_...
# 4. Run tool with Groq:
bun run start
```

**Why Groq?**
- ✅ Completely free (no hidden costs)
- ✅ No rate limits on free tier
- ✅ Super fast (good for quiz questions)
- ✅ No credit card required
- ✅ Generous free tier limits

---

## Implementation Steps

### For Groq (Recommended)

1. **Sign up** → https://console.groq.com
2. **Create API key** → Copy it
3. **Update .env**:
   ```bash
   # Comment out OpenAI key
   # export OPENAI_API_KEY=sk-...
   
   # Add Groq key
   export GROQ_API_KEY=gsk_...
   ```

4. **Modify src/gpt.ts** to support Groq:
   ```typescript
   import Groq from "groq-sdk";  // Instead of OpenAI
   
   const groq = new Groq({
     apiKey: process.env.GROQ_API_KEY,
   });
   
   // Use groq.chat.completions.create() instead of openai...
   ```

5. **Install Groq SDK**:
   ```bash
   bun add groq-sdk
   ```

---

## Full Integration (Groq Alternative)

I can help you create `src/gpt-groq.ts` that uses Groq API instead of OpenAI. This would:

✅ Use same interface as current code
✅ No rate limits (free tier)
✅ Fast inference for quiz questions
✅ Drop-in replacement for OpenAI

Would you like me to:

1. **Create Groq integration** (15 min)
2. **Add Groq provider switching** (20 min)
3. **Both + full documentation** (30 min)

---

## Cost Comparison

| Provider | Free Tier | Cost |
|----------|-----------|------|
| OpenAI | $5 credits (3 months) | $0.15/1k tokens |
| **Groq** | **Unlimited queries** | **FREE** |
| Ollama | Unlimited (local) | FREE |
| Claude | $5 credits (3 months) | $0.003/1k tokens |
| HuggingFace | Limited free tier | FREE |

**Groq is the clear winner for your use case!**

---

## Next Steps

**Option A: Quick Fix (5 min)**
```bash
# Use Groq instead of OpenAI
export GROQ_API_KEY=gsk_...
# Then I can modify gpt.ts to support it
```

**Option B: Local LLM (30 min)**
```bash
# Run Ollama locally
ollama pull mistral
ollama serve
# Use local endpoint, no API key needed
```

**Option C: Multiple Providers (1 hour)**
```bash
# Support multiple providers:
# - Groq (recommended, free)
# - Ollama (local, free)
# - Claude (fallback)
# Switch easily via env vars
```

---

## Summary

- ❌ **OpenCode API:** Not suitable (IDE-only, no Moodle integration)
- ✅ **Groq:** Best alternative (free, fast, unlimited)
- ✅ **Ollama:** Best if you want truly local/offline
- ✅ **Claude:** Best quality but not free

**My recommendation:** Use **Groq** (free, no rate limits) + I can integrate it in 15 minutes.

Let me know what you'd like to do!

