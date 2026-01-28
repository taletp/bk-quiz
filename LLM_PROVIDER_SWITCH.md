# Switching LLM Providers - Quick Guide

## 🎯 Three Options Available

### Option 1: Ollama (LOCAL - FREE) ⭐ RECOMMENDED
**Best for:** No API costs, unlimited queries, offline

```bash
# 1. Install from https://ollama.ai/download
# 2. Start server
ollama serve

# 3. In another terminal, download model
ollama pull mistral

# 4. Configure bk-quiz
export LLM_PROVIDER=ollama
bun run start
```

**Pros:**
- ✅ Completely FREE
- ✅ No API key needed
- ✅ Unlimited queries (no rate limits/quotas)
- ✅ Works offline
- ✅ Privacy-focused

**Cons:**
- ❌ Slower than cloud APIs
- ❌ Requires decent CPU/RAM

---

### Option 2: OpenAI (CLOUD - PAID)
**Best for:** Best quality, fast responses (but limited free tier)

```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Add to .env
export OPENAI_API_KEY=sk-...
export LLM_PROVIDER=openai  # or just leave unset
bun run start
```

**Pros:**
- ✅ Best quality answers
- ✅ Fastest inference
- ✅ GPT-4o model

**Cons:**
- ❌ Free tier ($5 credits) exhausts quickly
- ❌ Rate limiting issues
- ❌ Quota exhaustion (original problem you had)

---

### Option 3: Groq (CLOUD - FREE) 
**Best for:** Free tier with good models, no rate limiting

```bash
# 1. Sign up FREE at https://console.groq.com/keys
# 2. No credit card required!
# 3. Add to .env
export GROQ_API_KEY=gsk_...
export LLM_PROVIDER=groq
bun run start
```

**Pros:**
- ✅ Completely FREE (no rate limits)
- ✅ Very fast
- ✅ No credit card needed
- ✅ Generous free tier

**Cons:**
- ❌ Provider switching code not yet implemented
- ❌ Smaller models than GPT-4o

---

## How to Switch Providers

### Method 1: Environment Variable (Recommended)

```bash
# Use Ollama (local)
export LLM_PROVIDER=ollama
bun run start

# Use OpenAI (cloud)
export LLM_PROVIDER=openai
bun run start

# Use Groq (cloud, free)
export LLM_PROVIDER=groq
bun run start
```

### Method 2: Modify .env File

```bash
# Edit .env:
# LLM_PROVIDER=ollama  # or openai, groq

# Then just run:
bun run start
```

### Method 3: Modify index.ts

```typescript
// In src/index.ts, change import from:
import { analyzeQuestion, validateApiKey } from './gpt.js';

// To:
import { analyzeQuestion, validateApiKey } from './gpt-provider.js';  // Auto-detects
// or manually:
import { analyzeQuestion, validateApiKey } from './gpt-ollama.js';    // Force Ollama
import { analyzeQuestion, validateApiKey } from './gpt.js';           // Force OpenAI
```

---

## Quick Reference

### Ollama (Recommended - FREE)

```bash
# 1. Install Ollama
curl https://ollama.ai/install.sh | sh

# 2. Start server (Terminal 1)
ollama serve

# 3. Download model (Terminal 2)
ollama pull mistral

# 4. Configure tool
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=mistral  # optional, this is default

# 5. Run
bun run start
```

### OpenAI (Original)

```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Configure
export OPENAI_API_KEY=sk-...
export LLM_PROVIDER=openai

# 3. Run
bun run start
```

### Groq (When implemented)

```bash
# 1. Sign up at https://console.groq.com/keys
# 2. Get API key (no credit card needed!)
# 3. Configure
export GROQ_API_KEY=gsk_...
export LLM_PROVIDER=groq

# 4. Run
bun run start
```

---

## Comparison Table

| Feature | Ollama | OpenAI | Groq |
|---------|--------|--------|------|
| **Cost** | FREE | Paid | FREE |
| **Speed** | ⚡⚡ Slow | ⚡⚡⚡ Fast | ⚡⚡⚡ Fast |
| **Quality** | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐ Very Good |
| **API Key** | None | Required | Required |
| **Rate Limits** | None | Strict | None |
| **Offline** | ✅ Yes | ❌ No | ❌ No |
| **Setup Time** | 10 min | 1 min | 2 min |

---

## Recommendation

### If you want FREE and UNLIMITED:
→ Use **Ollama** (local, offline)
- Installation guide: [OLLAMA_SETUP.md](./OLLAMA_SETUP.md)

### If you want BEST QUALITY (and willing to pay):
→ Use **OpenAI** (GPT-4o)
- Already configured, just add API key

### If you want FREE + FAST (best of both):
→ Use **Groq** (when implemented)
- Sign up at https://console.groq.com/keys

---

## Provider Files

```
src/
├── gpt.ts              ← OpenAI (original)
├── gpt-ollama.ts       ← Ollama (NEW)
├── gpt-provider.ts     ← Factory (auto-selects based on env var)
└── gpt-groq.ts         ← TODO (Groq, not yet implemented)
```

All have the same interface (`analyzeQuestion()`, `validateApiKey()`, etc.)
So switching is just one env var away.

---

## Environment Variables

| Variable | Options | Default | Example |
|----------|---------|---------|---------|
| `LLM_PROVIDER` | ollama, openai, groq | openai | `export LLM_PROVIDER=ollama` |
| `OPENAI_API_KEY` | sk-... | (required) | `sk-proj-...` |
| `OLLAMA_ENDPOINT` | http://... | http://localhost:11434 | `http://localhost:11434` |
| `OLLAMA_MODEL` | mistral, llama2, etc | mistral | `export OLLAMA_MODEL=neural-chat` |
| `GROQ_API_KEY` | gsk_... | (required) | `gsk_...` |

---

## Testing Your Provider

### Test Ollama
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

### Test OpenAI
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Test Groq (when set up)
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

---

## Troubleshooting

### "Provider not found"
```bash
# Check what's set:
echo $LLM_PROVIDER

# Set it:
export LLM_PROVIDER=ollama
```

### "Connection refused" (Ollama)
```bash
# Ollama server not running
ollama serve
```

### "Invalid API key" (OpenAI/Groq)
```bash
# Check key is correct
echo $OPENAI_API_KEY | head -c 20  # Should show: sk-proj-...
echo $GROQ_API_KEY | head -c 10    # Should show: gsk_...
```

---

## FAQ

**Q: Can I use multiple providers?**
A: Yes! Switch via env var. Just restart tool.

**Q: Which is fastest?**
A: OpenAI > Groq > Ollama (but Ollama is free!)

**Q: Which is cheapest?**
A: Ollama & Groq (free), then Claude, then OpenAI

**Q: Can I mix providers?**
A: Not currently, but you can add it. All have same interface.

**Q: Do I need to modify code to switch?**
A: No! Just set env var: `export LLM_PROVIDER=ollama`

---

## See Also

- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - Detailed Ollama guide
- [OPENCODE_ALTERNATIVE.md](./OPENCODE_ALTERNATIVE.md) - All alternatives
- [README.md](./README.md) - Main documentation

