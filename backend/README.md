# VoxPatient Backend AI Proxy

This backend reads secrets from `../.env` and exposes:

- `GET /health`
- `POST /ai/interview-reply`

Flow:

1. Try Gemini models in order from env (`MODEL_PRIMARY`, `MODEL_FALLBACK`, `MODEL_ESCALATION`)
2. Retry each model up to `MODEL_MAX_RETRIES + 1`
3. On quota/rate-limit/server errors, switch to Groq
4. Return `{ text, model, provider, latencyMs }`

## Run

```bash
cd backend
npm install
npm start
```

## Required env vars in project root `.env`

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL` (recommended: `llama-3.3-70b-versatile`)
- `MODEL_PRIMARY`, `MODEL_FALLBACK`, `MODEL_ESCALATION`, `MODEL_MAX_RETRIES`
