# 🎯 Provider Comparison & Quick Reference

Quick answer: **Use Groq** (unless you need offline or best quality)

---

## Side-by-Side Comparison

### Feature Matrix

| Feature | Groq | Ollama | OpenAI |
|---------|------|--------|--------|
| **Price** | 🟢 FREE | 🟢 FREE | 🔴 Paid ($1-2/quiz) |
| **Speed** | 🟢 Super fast (2-5s/q) | 🔴 Slow (10-30s/q) | 🟡 Fast (3-8s/q) |
| **Quality** | 🟡 Good | 🟡 OK | 🟢 Excellent |
| **Setup Time** | 🟢 3 minutes | 🔴 15+ minutes | 🟡 5 minutes |
| **Offline** | 🔴 No | 🟢 Yes | 🔴 No |
| **Rate Limits** | 🟢 None | 🟢 None | 🟡 Limited |
| **API Key** | 🟢 Free | 🟢 Not needed | 🔴 Required (paid) |
| **Installation** | 🟢 Just API key | 🔴 Need Ollama app | 🟢 Just API key |
| **Privacy** | 🟡 Cloud | 🟢 Local | 🟡 Cloud |

---

## Cost Analysis (100-question quiz)

| Provider | Time | Cost | Cost/Question |
|----------|------|------|----------------|
| Groq | ~5 min | $0 | $0.00 |
| Ollama | ~30 min | $0 | $0.00 |
| OpenAI | ~8 min | $1-2 | $0.01-0.02 |

**Annual cost (10 quizzes):**
- Groq: $0
- Ollama: $0
- OpenAI: $10-20

---

## Quick Setup (Copy & Paste)

### Groq (Recommended)

```bash
# 1. Get API key from https://console.groq.com/keys
# 2. Run:
export GROQ_API_KEY=gsk_xxxxxxxxxxxxx
export LLM_PROVIDER=groq
bun run start
```

**Total time: 3 minutes**

### Ollama

```bash
# 1. Install Ollama from https://ollama.ai/download
# 2. Start server:
ollama serve

# 3. In new terminal:
export LLM_PROVIDER=ollama
bun run start
```

**Total time: 15-20 minutes** (includes Ollama download)

### OpenAI

```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Run:
export OPENAI_API_KEY=sk_xxxxxxxxxxxxx
export LLM_PROVIDER=openai
bun run start
```

**Total time: 5 minutes**

---

## Decision Tree

```
┌─ Do you want to spend money?
│  └─ YES → Use OpenAI (best quality)
│  └─ NO → Continue
│
├─ Do you need offline access?
│  └─ YES → Use Ollama
│  └─ NO → Continue
│
└─ Default: Use Groq ✅
   (fast, free, easy setup)
```

---

## Feature Breakdown

### Groq

**What is it?** Cloud-based LLM API by Groq (fast inference company)

**Pros:**
- ✅ Completely free
- ✅ Super fast (2-5s per question)
- ✅ No setup hassles (just API key)
- ✅ Unlimited requests
- ✅ No rate limits
- ✅ Best for this use case

**Cons:**
- ❌ Requires internet
- ❌ Cloud-based (not private)
- ❌ Quality slightly below OpenAI

**Best for:** 99% of users

**Models available:**
- Mixtral-8x7b (recommended)
- Gemma-7b
- Llama2-70b

---

### Ollama

**What is it?** Local LLM server (runs on your computer)

**Pros:**
- ✅ Completely free
- ✅ Works offline
- ✅ Maximum privacy (data stays local)
- ✅ No rate limits
- ✅ Can use powerful models (Mistral, Llama2, etc.)

**Cons:**
- ❌ Slow (10-30s per question)
- ❌ Requires 15+ minutes setup
- ❌ Requires ~8GB RAM + decent CPU
- ❌ Depends on your computer power
- ❌ Overkill for most users

**Best for:** Users who need offline or paranoid about privacy

**Models available:**
- Mistral (recommended)
- Llama2
- Neural-chat
- 50+ others

---

### OpenAI

**What is it?** GPT-4o API by OpenAI (industry best)

**Pros:**
- ✅ Best quality answers
- ✅ Fastest inference
- ✅ Most reliable
- ✅ Easy setup
- ✅ Well-documented

**Cons:**
- ❌ Costs money ($1-2 per 100-question quiz)
- ❌ Has rate limits
- ❌ API key required (paid account)
- ❌ Overkill for quiz questions

**Best for:** Users who need highest accuracy or want to support OpenAI

**Models available:**
- GPT-4o (recommended)
- GPT-3.5-turbo
- Other GPT models

---

## Switching Between Providers

No code changes needed! Just change environment variables:

```bash
# Currently using Groq? Switch to Ollama:
ollama serve  # In another terminal

export LLM_PROVIDER=ollama
bun run start

# Or switch to OpenAI:
export OPENAI_API_KEY=sk_xxxxx
export LLM_PROVIDER=openai
bun run start

# Or back to Groq:
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start
```

---

## Detailed Guides

- **[Groq Setup](./GROQ_SETUP.md)** - 3-minute setup
- **[Ollama Setup](./OLLAMA_SETUP.md)** - 15-minute setup
- **[OpenAI Setup](./README.md#configuration)** - 5-minute setup

---

## Real-World Scenarios

### Scenario 1: "I just want to solve quizzes quickly and free"

```bash
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start
```

✅ **Groq** is perfect for you.

---

### Scenario 2: "I'm paranoid about privacy / need offline"

```bash
# Install Ollama (15 minutes)
# Then:
ollama serve  # Terminal 1
export LLM_PROVIDER=ollama
bun run start  # Terminal 2
```

✅ **Ollama** is your solution.

---

### Scenario 3: "I want the best possible answers"

```bash
export OPENAI_API_KEY=sk_xxxxx
export LLM_PROVIDER=openai
bun run start
```

✅ **OpenAI** is your choice (and you don't mind paying).

---

### Scenario 4: "I want to try all three"

```bash
# Try Groq first (3 min setup)
export GROQ_API_KEY=gsk_xxxxx
export LLM_PROVIDER=groq
bun run start

# If slow, try Ollama (15 min setup)
# If need best quality, try OpenAI (5 min setup)

# Switch anytime with environment variables!
```

✅ **Just try Groq first** - if you like it, stick with it!

---

## FAQ

### Q: Which one should I use?

**A:** Groq. It's the best default choice for 99% of users.

### Q: Can I use all three?

**A:** Yes! Switch between them anytime by changing `LLM_PROVIDER` env var.

### Q: What if Groq is down?

**A:** Switch to Ollama (if you have it set up) or OpenAI:

```bash
export LLM_PROVIDER=ollama
bun run start

# Or:
export LLM_PROVIDER=openai
bun run start
```

### Q: Is Groq really unlimited?

**A:** Yes, Groq has generous free tier:
- 30k tokens/minute
- Quiz questions use ~100-300 tokens each
- That's plenty!

### Q: Can I mix providers in one quiz?

**A:** No, pick one per run. But you can:
1. Run half quiz with Groq
2. Manually stop
3. Switch to Ollama
4. Run second half

(Though that's unnecessarily complicated)

### Q: Which is most private?

**A:** Ollama (local, data never leaves your computer)

### Q: Which is fastest?

**A:** Groq (2-5s per question)

### Q: Which is cheapest?

**A:** Tie between Groq and Ollama (both free)

### Q: Which has best quality?

**A:** OpenAI (GPT-4o is best)

### Q: Which is easiest to setup?

**A:** Groq (just API key, 3 minutes)

---

## Summary Table

| Provider | Use if... |
|----------|-----------|
| **Groq** ✅ | You want fast, free, and easy (default choice) |
| **Ollama** | You need offline or maximum privacy |
| **OpenAI** | You want the best possible answers |

---

## Next Steps

1. **Try Groq first**: https://console.groq.com/keys
2. **If you need offline**: Install Ollama
3. **If you want best quality**: Use OpenAI
4. **Switch anytime**: Just change env var!

**Happy studying! 📚**
