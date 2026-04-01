# Backend Gemini Production Example (Redis + Firestore Audit Logging)

Use this when deploying multiple backend instances. It upgrades the basic proxy with:

1. Redis-backed distributed rate limits
2. Firebase ID token verification
3. Firestore audit logs for success and failure events

## Install

```bash
npm install express firebase-admin express-rate-limit rate-limit-redis ioredis
```

## Environment Variables

Set these on your backend host:

- `GEMINI_API_KEY=...`
- `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`
- `REDIS_URL=redis://localhost:6379`
- `PORT=8080`

## Example (Node + Express + TypeScript)

```ts
import express from 'express';
import admin from 'firebase-admin';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

type InterviewRequest = {
  userInput?: string;
  messageHistory?: Array<{ id?: string; role?: string; text?: string; createdAt?: number }>;
  context?: { firstName?: string };
  modelRouting?: {
    primary?: string;
    fallback?: string;
    escalation?: string;
    maxRetries?: number;
  };
};

const app = express();
app.use(express.json({ limit: '256kb' }));

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const DEFAULT_ROUTING = {
  primary: 'gemini-3.1-flash-lite',
  fallback: 'gemini-2.5-flash-lite',
  escalation: 'gemini-2.5-flash',
  maxRetries: 1,
};

function buildPrompt(payload: InterviewRequest): string {
  const history = Array.isArray(payload?.messageHistory) ? payload.messageHistory : [];
  const turns = history
    .slice(-8)
    .map((m) => `${m.role ?? 'user'}: ${m.text ?? ''}`)
    .join('\n');

  const name = payload?.context?.firstName ? String(payload.context.firstName) : 'there';
  const userInput = String(payload?.userInput ?? '');

  return [
    'You are IRIS, a clinical-visit preparation assistant.',
    'Never diagnose. Keep responses concise, practical, and safe.',
    'If symptoms suggest urgent risk, advise immediate local emergency care.',
    `User first name: ${name}`,
    turns ? `Recent conversation:\n${turns}` : '',
    `Latest user message: ${userInput}`,
    'Ask one focused follow-up question at the end.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function verifyFirebaseAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const idToken = authHeader.slice('Bearer '.length);
    const decoded = await admin.auth().verifyIdToken(idToken, true);
    (req as any).auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
}

const ipRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // rate-limit-redis expects a sendCommand bridge
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
    prefix: 'rl:ip:',
  }),
  message: { error: 'Too many requests from this IP. Try again in a minute.' },
});

const uidRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String((req as any)?.auth?.uid ?? req.ip),
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
    prefix: 'rl:uid:',
  }),
  message: { error: 'Too many requests for this user. Try again in a minute.' },
});

async function writeAuditLog(event: {
  uid?: string;
  requestId: string;
  status: 'success' | 'failure';
  modelTried: string[];
  modelUsed?: string;
  attempt?: number;
  latencyMs: number;
  promptChars: number;
  responseChars?: number;
  error?: string;
}) {
  await db.collection('ai_audit_logs').add({
    ...event,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`${model} failed: ${response.status} ${raw}`);
  }

  const data: any = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error(`${model} returned empty text`);
  }

  return text.trim();
}

app.post('/ai/interview-reply', verifyFirebaseAuth, ipRateLimiter, uidRateLimiter, async (req, res) => {
  const startedAt = Date.now();
  const body: InterviewRequest = req.body ?? {};
  const uid = String((req as any)?.auth?.uid ?? 'unknown');
  const requestId = String(req.headers['x-request-id'] ?? `${Date.now()}-${Math.random()}`);

  const routing = {
    ...DEFAULT_ROUTING,
    ...(body.modelRouting ?? {}),
  };

  const orderedModels = [routing.primary, routing.fallback, routing.escalation].filter(Boolean) as string[];
  const attemptsPerModel = Math.max(1, Number(routing.maxRetries ?? 1) + 1);
  const prompt = buildPrompt(body);

  const errors: string[] = [];
  const tried: string[] = [];

  for (const model of orderedModels) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
      tried.push(`${model}#${attempt}`);
      try {
        const text = await callGemini(model, prompt);

        await writeAuditLog({
          uid,
          requestId,
          status: 'success',
          modelTried: tried,
          modelUsed: model,
          attempt,
          latencyMs: Date.now() - startedAt,
          promptChars: prompt.length,
          responseChars: text.length,
        });

        return res.json({ text, modelUsed: model, attempt });
      } catch (error) {
        errors.push(String(error));
      }
    }
  }

  await writeAuditLog({
    uid,
    requestId,
    status: 'failure',
    modelTried: tried,
    latencyMs: Date.now() - startedAt,
    promptChars: prompt.length,
    error: errors.slice(-1)[0],
  });

  return res.status(503).json({
    error: 'All configured models failed',
    details: errors.slice(-3),
  });
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI proxy running on http://localhost:${port}`);
});
```

## Firestore Collection Recommendation

Store audit events in `ai_audit_logs` with a short retention policy (for example, 7-30 days) and avoid persisting raw sensitive medical text unless required.

## Production Notes

- Redis is required for consistent limits across multiple instances.
- Use a real request ID from ingress (Cloud Run, API Gateway, NGINX) and pass it in `x-request-id`.
- Add PII redaction if you plan to persist prompt/response text.
- Add alerting on repeated model failures or high 429 rates.
