# 🚀 Groq Integration Guide

> **TL;DR**: Free, unlimited, super-fast cloud LLM. Get API key, run 1 command, solve quizzes instantly.

---

## Why Groq? 🤔

| Feature | Groq | Ollama | OpenAI |
|---------|------|--------|--------|
| **Cost** | ✅ FREE | ✅ FREE | ❌ $$ |
| **Speed** | ⚡⚡⚡ Super fast | 🐢 Slow (local CPU) | ⚡ Fast |
| **Setup** | 3 minutes | 15+ minutes | 5 minutes |
| **Quality** | ✅ Good (Mixtral) | 🟡 OK (depends on model) | ⚡⚡⚡ Best (GPT-4o) |
| **No API Key Required** | ❌ | ✅ | ❌ |
| **Rate Limits** | ✅ None (unlimited) | ✅ None (local) | ⚠️ Has limits |
| **Requires Internet** | ✅ (cloud) | ❌ (local) | ✅ (cloud) |
| **Offline Use** | ❌ | ✅ | ❌ |

**Best choice for most users**: **Groq** (fast + free + no installation)

---

## Setup (3 Minutes)

### Step 1: Get Free API Key

1. Go to: https://console.groq.com/keys
2. Sign up (free account, no credit card needed)
3. Click "Create New API Key"
4. Copy the key (starts with `gsk_`)

### Step 2: Add to .env

```bash
# Edit .env file
nano .env  # or open in your editor
```

Add this line:
```bash
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
```

**Replace** `gsk_xxxxxxxxxxxxxxxxxxxxx` with your actual key from Step 1.

### Step 3: Run with Groq

```bash
export LLM_PROVIDER=groq
bun run start
```

That's it! The tool will now use Groq instead of OpenAI.

---

## Usage

### Basic Workflow

```bash
# Terminal setup (one time per session)
export LLM_PROVIDER=groq
bun run start
```

Then:
1. Log in manually when browser opens
2. Paste quiz URL
3. Tool analyzes with Groq (super fast!)
4. Review and submit answers

### Speed Comparison

| Provider | Time per Question |
|----------|-------------------|
| Groq | ~2-5 seconds |
| Ollama (local) | ~10-30 seconds |
| OpenAI | ~3-8 seconds |

**For a 10-question quiz:**
- Groq: ~30-50 seconds
- Ollama: ~2-5 minutes
- OpenAI: ~30-80 seconds

---

## Groq Models Available

The tool uses **Llama-3.3-70b** (Groq's current recommended model):

| Model | Speed | Quality | Status |
|-------|-------|---------|--------|
| **llama-3.3-70b-versatile** | ⚡⚡ | Excellent | ✅ Current |
| llama-3.1-8b-instant | ⚡⚡⚡ | Good | Available |
| gpt-oss-120b | ⚡ | Very Good | Available |

Llama-3.3-70b is the best balance of speed and quality.

**Note**: Mixtral-8x7b has been deprecated and is no longer available.

---

## Configuration

### Optional: Change Groq Endpoint

```bash
export LLM_PROVIDER=groq
export GROQ_API_KEY=gsk_xxxxx
export GROQ_ENDPOINT=https://api.groq.com/openai/v1
bun run start
```

(The endpoint is set automatically, no need to change)

### Optional: Adjust Rate Limiting

Groq is fast, so lower delays work:

```bash
export REQUEST_DELAY_MS=100  # 100ms between requests (vs 1000ms default)
export LLM_PROVIDER=groq
bun run start
```

---

## Troubleshooting

### "Invalid GROQ_API_KEY"

**Solution:**
1. Verify key starts with `gsk_` (standard) or `xai_` (xAI variant)
2. Check .env file has no typos
3. Get new key from https://console.groq.com/keys

### "Model has been decommissioned"

**Cause**: Mixtral model is no longer available

**Solution:**
- Update the tool to latest version (we fixed this)
- The tool now uses llama-3.3-70b-versatile which is current
- Run: `git pull` to get the latest version

### "Connection timeout"

**Solution:**
1. Check internet connection
2. Verify Groq status: https://status.groq.com
3. Try again in a minute

### "Rate limited"

**Unlikely** - Groq has generous limits. But if it happens:

```bash
export REQUEST_DELAY_MS=500  # Increase to 500ms
export LLM_PROVIDER=groq
bun run start
```

### "Model not found"

**Cause**: Groq might have deprecated the model

**Solution**: Check available models at https://console.groq.com/docs/speech-text

---

## Comparing Providers

### When to Use Each

| Provider | Best For |
|----------|----------|
| **Groq** | ✅ Default choice (fast + free) |
| **Ollama** | Offline use / paranoid about privacy |
| **OpenAI** | Highest accuracy needed |

### Cost Comparison (100-question quiz)

| Provider | Cost | Notes |
|----------|------|-------|
| Groq | $0 | Completely free |
| Ollama | $0 | Free but slow |
| OpenAI | $1-2 | Paid API |

### Quality Comparison

| Provider | Model | Quality | Speed |
|----------|-------|---------|-------|
| Groq | Mixtral-8x7b | Good | Super fast |
| Ollama | Mistral | OK | Slow |
| OpenAI | GPT-4o | Excellent | Fast |

---

## Switching Between Providers

### OpenAI → Groq

```bash
# Was using OpenAI?
export OPENAI_API_KEY=sk_xxxxx
export LLM_PROVIDER=openai
bun run start

# Now switch to Groq (no code changes!)
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start
```

### Groq → Ollama

```bash
# Using Groq
export LLM_PROVIDER=groq
bun run start

# Switch to Ollama (ensure Ollama server is running)
ollama serve  # In another terminal

# Then switch
export LLM_PROVIDER=ollama
bun run start
```

---

## Advanced Usage

### Using Different Groq Models

Edit `src/gpt-groq.ts`, find this line:

```typescript
model: 'mixtral-8x7b-32768', // Change this
```

Available models (check latest at https://console.groq.com/docs):
- `mixtral-8x7b-32768` (recommended)
- `gemma-7b-it`
- `llama2-70b-4096`

### Monitoring Groq Usage

1. Go to: https://console.groq.com
2. Click "Metrics" in left sidebar
3. See your API usage, tokens, and remaining quota

---

## FAQ

### Q: Is Groq really free?

**A:** Yes! Completely free with generous limits:
- No credit card needed
- 30k tokens/minute (plenty for quizzes)
- No expiration on free tier
- No hidden charges

### Q: How does Groq compare to OpenAI?

**A:** 
- **Speed**: Groq is faster
- **Quality**: OpenAI is slightly better
- **Cost**: Groq wins (free)

**Bottom line**: For quiz questions, Groq is good enough and much cheaper.

### Q: Can I use Groq offline?

**A:** No, Groq requires internet (it's cloud-based). Use Ollama for offline.

### Q: Will Groq work forever for free?

**A:** Groq says yes, but always monitor their pricing page:
https://groq.com/pricing

### Q: How many requests can I make?

**A:** 30,000 tokens per minute. For quiz questions:
- Text questions: ~100 tokens each
- Image questions: ~300 tokens each

That's plenty!

### Q: Can I share my Groq API key?

**A:** NO! It's like a password. Keep it secret.
- Never commit to git
- Never share with others
- If leaked, regenerate immediately

### Q: Do you track my quiz answers?

**A:** No. Groq processes your questions but doesn't store them. They're deleted after analysis.

---

## Switching Back to OpenAI

If Groq has issues, instantly switch back:

```bash
export LLM_PROVIDER=openai
bun run start
```

No code changes needed!

---

## Support

- **Groq Issues**: https://status.groq.com
- **API Documentation**: https://console.groq.com/docs
- **Get Help**: https://discord.gg/groq

---

## Summary

| Action | Command |
|--------|---------|
| Get API key | https://console.groq.com/keys |
| Enable Groq | `export LLM_PROVIDER=groq` |
| Run tool | `bun run start` |
| Switch to OpenAI | `export LLM_PROVIDER=openai` |
| Switch to Ollama | `export LLM_PROVIDER=ollama` |

**Groq is the recommended choice for 99% of users.** 🚀
