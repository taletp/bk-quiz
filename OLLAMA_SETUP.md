# Ollama Setup Guide - Free Local LLM

## What is Ollama?

Ollama lets you run large language models **locally on your computer** without paying for API access:

- ✅ Completely free
- ✅ No API keys needed
- ✅ Offline (works without internet)
- ✅ Unlimited queries (no rate limits)
- ✅ Privacy-focused (data stays local)
- ✅ No quotas or billing

**Downside:** Slower than cloud APIs (depends on your CPU), but works great for quiz questions.

---

## Installation

### Windows / Mac / Linux

**Option 1: Download (Recommended)**
```bash
# Download from https://ollama.ai/download
# Select your OS and install
```

**Option 2: Command Line (Linux/Mac)**
```bash
curl https://ollama.ai/install.sh | sh
```

**After installation:**
```bash
# Verify it's installed
ollama --version
```

---

## Getting Started (3 Steps)

### Step 1: Start Ollama Server

```bash
# Start the server (runs in background on port 11434)
ollama serve
```

**Output should show:**
```
2025-01-28 10:00:00 INFO Starting server...
2025-01-28 10:00:02 INFO Listening on 127.0.0.1:11434
```

**⚠️ Keep this running!** Open a new terminal window for step 2.

---

### Step 2: Download a Model

Choose ONE of these models (in new terminal):

**Small & Fast (Recommended for Quiz):**
```bash
ollama pull mistral
# 4.1 GB, very fast
```

**Quality & Speed Balance:**
```bash
ollama pull neural-chat
# 4.1 GB, good accuracy
```

**Best Accuracy (Slower):**
```bash
ollama pull llama2
# 3.8 GB, very accurate but slower
```

**Tiny (For slow computers):**
```bash
ollama pull phi
# 1.6 GB, smaller/faster
```

**You only need ONE.** Mistral is recommended.

---

### Step 3: Test It Works

```bash
# Test with a simple question
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

Should respond with something like:
```json
{
  "model": "mistral",
  "created_at": "2025-01-28T10:00:00Z",
  "response": "2+2=4",
  "done": true
}
```

✅ **If you see this, Ollama is working!**

---

## Using Ollama with bk-quiz

### Step 1: Update .env

```bash
cd ~/Desktop/bk-quiz

# Edit .env to use Ollama instead of OpenAI
echo "export LLM_PROVIDER=ollama" >> .env
echo "export OLLAMA_MODEL=mistral" >> .env

# Or manually edit .env:
# Comment out: export OPENAI_API_KEY=...
# Add:
# export LLM_PROVIDER=ollama
# export OLLAMA_MODEL=mistral
```

### Step 2: Run the Quiz Solver

```bash
# Make sure Ollama server is running (from step 1)
bun run start
```

**That's it!** The tool will:
1. Connect to local Ollama server
2. Use Mistral model
3. Process quiz questions locally
4. No API key needed
5. No rate limits
6. No costs

---

## Configuration Options

### Change Model

```bash
# In .env:
export OLLAMA_MODEL=llama2  # or neural-chat, phi, etc.
```

### Change Server Endpoint

```bash
# Default: http://localhost:11434
# If running on different machine:
export OLLAMA_ENDPOINT=http://192.168.1.100:11434
```

### Quick Commands

```bash
# Use Ollama with custom model
export LLM_PROVIDER=ollama && export OLLAMA_MODEL=llama2
bun run start

# Run Ollama on specific port
ollama serve --port 8000

# List available models
ollama list

# Remove a model (free up disk space)
ollama rm mistral

# Pull a new model
ollama pull neural-chat
```

---

## Troubleshooting

### "Connection refused"
```bash
# Ollama server is not running
# Start it:
ollama serve
```

### "Model not found: mistral"
```bash
# Download it first:
ollama pull mistral

# Check what's installed:
ollama list
```

### "Response is slow / timeout"
```bash
# Ollama needs time for first inference
# Give it 30+ seconds for first question

# To speed up:
1. Use smaller model: phi (1.6GB)
2. Get better CPU/GPU
3. Increase timeout in code

# Check if GPU is being used:
# On NVIDIA: nvidia-smi
# On AMD: rocm-smi
```

### "Out of memory"
```bash
# Model too big for your RAM
# Try smaller model:
ollama rm mistral
ollama pull phi  # Only 1.6 GB

# Or increase system RAM/VRAM
```

### "Questions are not good"
```bash
# Try different model:
export OLLAMA_MODEL=neural-chat  # Better accuracy

# Or increase temperature for more creativity:
# (This is in the code, ask me to adjust)
```

---

## Model Recommendations

| Model | Size | Speed | Accuracy | Recommendation |
|-------|------|-------|----------|---|
| **phi** | 1.6 GB | ⚡⚡⚡ Very Fast | ⭐⭐ Fair | Old computer |
| **mistral** | 4.1 GB | ⚡⚡ Fast | ⭐⭐⭐ Good | **Best Overall** |
| **neural-chat** | 4.1 GB | ⚡⚡ Fast | ⭐⭐⭐⭐ Very Good | Best Quality |
| **llama2** | 3.8 GB | ⚡ Slow | ⭐⭐⭐⭐ Very Good | Best but Slow |
| **dolphin-mixtral** | 26 GB | Very Slow | ⭐⭐⭐⭐⭐ Excellent | Overkill |

**Recommendation:** Start with **Mistral** (good balance), try **neural-chat** if you want better answers.

---

## Cost Savings

### Compared to OpenAI Free Tier:
- OpenAI: $5 credits (exhausted in hours for quizzes)
- Ollama: **FREE** (unlimited local queries)
- Savings: **Infinite** ✅

### System Requirements
- Disk: 4-5 GB per model
- RAM: 8 GB minimum (16 GB recommended)
- CPU: Any modern processor works
- GPU: Optional (makes it faster)

---

## Advanced: GPU Acceleration

If your computer has a good GPU, Ollama can use it for faster inference:

**NVIDIA GPU:**
```bash
# Install CUDA support
# Ollama will auto-detect and use GPU
# Check: nvidia-smi while running
```

**AMD GPU:**
```bash
# Install ROCm support
# Run: export OLLAMA_CUDA_COMPUTE_CAPABILITY=compute_60
ollama serve
```

---

## Keeping Ollama Running

### Option 1: Keep Terminal Window Open
```bash
ollama serve
# Leave this running
```

### Option 2: Run in Background
```bash
# macOS/Linux
ollama serve > ollama.log 2>&1 &

# Windows (PowerShell)
Start-Process ollama serve
```

### Option 3: Auto-Start on Boot
```bash
# macOS: Already installed as service
# Linux/Windows: Install as daemon service
# See https://ollama.ai/docs for your OS
```

---

## Quick Reference

```bash
# 1. Install Ollama
# Download from https://ollama.ai/download

# 2. Start server (in terminal 1)
ollama serve

# 3. Download model (in terminal 2)
ollama pull mistral

# 4. Configure bk-quiz
cd ~/Desktop/bk-quiz
echo "LLM_PROVIDER=ollama" >> .env
echo "OLLAMA_MODEL=mistral" >> .env

# 5. Run tool
bun run start
```

---

## Switching Back to OpenAI

If you want to use OpenAI instead:

```bash
# In .env:
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...

# Or unset provider (defaults to OpenAI):
unset LLM_PROVIDER

# Run:
bun run start
```

---

## See Also

- **[OPENCODE_ALTERNATIVE.md](./OPENCODE_ALTERNATIVE.md)** - All free LLM options
- **[SKIP_MODE_GUIDE.md](./SKIP_MODE_GUIDE.md)** - Handling errors gracefully
- **[README.md](./README.md)** - Full project guide
- **Official Ollama Docs:** https://ollama.ai/docs

---

## Support

Having issues? Check:
1. Is `ollama serve` running? (Check terminal for "Listening on...")
2. Did you `ollama pull mistral`?
3. Try `curl http://localhost:11434/api/generate` to test
4. Check [Troubleshooting](#troubleshooting) section above

