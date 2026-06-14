# ReLoop — Complete Setup Guide

This guide walks you through setting up everything from scratch, including fixing common issues.

---

## Step 1: Install Node.js Dependencies

```bash
cd IsRepoKoKiaNaamDu
npm install
```

---

## Step 2: Set Up PostgreSQL

You need a running PostgreSQL instance.

### Option A: Already have PostgreSQL installed
Make sure it's running, then create the database:
```bash
psql -U postgres
CREATE DATABASE reloop;
\q
```

### Option B: Using Docker
```bash
docker run --name reloop-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

---

## Step 3: Configure .env

Copy the example and edit with your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/reloop?schema=public"
AI_SERVICE_URL="http://localhost:8000"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
YOLO_MODEL_PATH=""
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

---

## Step 4: Set Up Database

This generates the Prisma client, runs migrations, and seeds demo data:
```bash
npm run db:setup
```

If you get a "database already exists" error, reset it:
```bash
npm run prisma:reset
```

---

## Step 5: Install Ollama (Free Local LLM)

Ollama runs LLMs locally with zero cost. This is OPTIONAL — the app works fully without it using deterministic fallbacks.

### Install Ollama

**Windows:**
1. Download from https://ollama.com/download/windows
2. Run the installer
3. Ollama starts automatically as a background service

**Mac:**
```bash
brew install ollama
ollama serve
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

### Pull a Model

After installing Ollama, pull a model. Choose ONE:

```bash
# Recommended — small and fast (2GB)
ollama pull llama3.2

# Alternative — larger, better quality (4.7GB)
ollama pull llama3.1

# Alternative — very small, fastest (1.3GB)
ollama pull phi3:mini
```

### Update .env to match your model

If you pulled `llama3.2`, set:
```env
OLLAMA_MODEL="llama3.2"
```

If you pulled `phi3:mini`, set:
```env
OLLAMA_MODEL="phi3:mini"
```

### Verify Ollama is working

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Test a generation
curl http://localhost:11434/api/generate -d '{"model":"llama3.2","prompt":"Say hello","stream":false}'
```

### What if I don't install Ollama?

**The app works completely fine without Ollama.** All AI features have deterministic fallback logic:
- Grading uses keyword-based text scoring
- Routing uses priority-based rules
- Pricing uses formula-based estimation
- Listing rewrites use template-based patterns
- The only difference: AI reasoning text will say "template-fallback" instead of LLM-generated prose

---

## Step 6: Set Up the AI Service (Optional)

The FastAPI AI service adds OpenCV image analysis. It's optional — the Next.js app has full fallback logic.

### Install Python dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

If you get OpenCV install issues on Windows:
```bash
pip install opencv-python-headless
```

### Start the AI service

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

### Verify it's running

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "ollama": "available",
    "opencv": "available",
    "yolo": "not-configured",
    "embeddings": "unavailable"
  }
}
```

---

## Step 7: Start the Next.js App

```bash
npm run dev
```

Open http://localhost:3000

---

## Troubleshooting

### "File upload not working"

The app saves uploaded images to `public/uploads/`. Make sure:
1. The `public/uploads/` directory exists (it should — there's a `.gitkeep`)
2. Your user has write permissions to that directory
3. If running in WSL, make sure the path is accessible

### "Database connection refused"

1. Make sure PostgreSQL is running: `pg_isready`
2. Check your `DATABASE_URL` in `.env` matches your actual credentials
3. Try connecting manually: `psql -U postgres -d reloop`

### "Ollama not available" (warnings in AI service)

This is fine! The app works without Ollama. If you want it:
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. If not running: `ollama serve` (or restart the Ollama app on Windows)
3. Make sure you pulled a model: `ollama list`

### "YOLO not configured"

This is expected. YOLO defect detection is a placeholder. Set `YOLO_MODEL_PATH` to a `.pt` file if you have one, otherwise leave it empty.

### "Build fails with type errors"

```bash
npx prisma generate   # Regenerate Prisma client
npm run build         # Retry build
```

### "Port 3000 already in use"

```bash
# Kill the process on port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

---

## Summary: What You Need vs What's Optional

| Component | Required? | Purpose |
|-----------|-----------|---------|
| Node.js 18+ | ✅ Yes | Next.js runtime |
| PostgreSQL | ✅ Yes | Database for items, passports, credits |
| Ollama | ❌ Optional | LLM reasoning (has fallback) |
| Python + FastAPI | ❌ Optional | OpenCV vision analysis (has fallback) |
| YOLO model | ❌ Optional | Defect detection placeholder |
| sentence-transformers | ❌ Optional | Embeddings (has hash fallback) |

**Minimum setup for a working demo:**
```bash
npm install
# Configure .env with DATABASE_URL
npm run db:setup
npm run dev
```

That's it. Everything else is optional enhancement.
