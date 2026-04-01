# Backend Gemini Routing Example

Use this server-side route as your interview proxy so the mobile app never ships a Gemini API key.

## Behavior

1. Reads routing policy from request body (`modelRouting`) or falls back to defaults.
2. Tries models in order: primary, fallback, escalation.
3. Retries each model up to `maxRetries + 1` attempts.
4. Returns `{ "text": "..." }` when successful.

## Request Shape

```json
{
  "userInput": "I have chest tightness when climbing stairs",
  "messageHistory": [
    { "id": "1", "role": "assistant", "text": "What brings you in today?", "createdAt": 1710000000 },
    { "id": "2", "role": "user", "text": "I get chest pain.", "createdAt": 1710000010 }
  ],
  "context": { "firstName": "Alex" },
  "modelRouting": {
    "primary": "gemini-3.1-flash-lite",
    "fallback": "gemini-2.5-flash-lite",
    "escalation": "gemini-2.5-flash",
    "maxRetries": 1
  }
}
```

## Node + Express Example

```ts
import express from 'express';
import admin from 'firebase-admin';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const DEFAULT_ROUTING = {
  primary: 'gemini-3.1-flash-lite',
  fallback: 'gemini-2.5-flash-lite',
  escalation: 'gemini-2.5-flash',
  maxRetries: 1,
};

function buildPrompt(payload: any): string {
  const history = Array.isArray(payload?.messageHistory) ? payload.messageHistory : [];
  const turns = history
    .slice(-8)
    .map((m: any) => `${m.role}: ${m.text}`)
    .join('\n');

  const name = payload?.context?.firstName ? String(payload.context.firstName) : 'there';
  const userInput = String(payload?.userInput ?? '');

  return [
    'You are IRIS, a clinical-visit preparation assistant.',
    'Never diagnose. Keep responses concise, practical, and safe.',
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
  message: { error: 'Too many requests from this IP. Try again in a minute.' },
});

function perUidMinuteLimiter(limitPerMinute: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const uid = String((req as any)?.auth?.uid ?? 'anonymous');
    const current = hits.get(uid);

    if (!current || now - current.windowStart >= 60_000) {
      hits.set(uid, { count: 1, windowStart: now });
      return next();
    }

    if (current.count >= limitPerMinute) {
      return res.status(429).json({
        error: 'Too many requests for this user. Try again in a minute.',
      });
    }

    current.count += 1;
    return next();
  };
}

const uidRateLimiter = perUidMinuteLimiter(20);

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
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 220,
      },
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
  const routing = {
    ...DEFAULT_ROUTING,
    ...(req.body?.modelRouting ?? {}),
  };

  const orderedModels = [routing.primary, routing.fallback, routing.escalation].filter(Boolean);
  const attemptsPerModel = Math.max(1, Number(routing.maxRetries ?? 1) + 1);

  const prompt = buildPrompt(req.body);

  const errors: string[] = [];
  for (const model of orderedModels) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
      try {
        const text = await callGemini(model, prompt);
        return res.json({ text, modelUsed: model, attempt });
      } catch (error) {
        errors.push(String(error));
      }
    }
  }

  return res.status(503).json({
    error: 'All configured models failed',
    details: errors.slice(-3),
  });
});

app.listen(8080, () => {
  // eslint-disable-next-line no-console
  console.log('AI proxy running on http://localhost:8080');
});
```

## Environment Variables

Set this on the backend host, never in the mobile app:

- `GEMINI_API_KEY=...`
- `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`

## Suggested Dependencies

- `npm install express firebase-admin express-rate-limit`

## Security Notes

- Firebase ID token verification and IP/UID rate limiting are included in the example.
- Add a periodic cleanup job for the in-memory UID limiter or replace it with Redis for multi-instance deployments.
- Add safety filtering before returning final text.

## Production Upgrade

For multi-instance deployments with distributed rate limits and audit logging, use:

- `docs/backend-gemini-production-example.md`
