const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const DEFAULT_ROUTING = {
  primary: process.env.MODEL_PRIMARY || 'gemini-2.5-flash',
  fallback: process.env.MODEL_FALLBACK || 'gemini-2.5-flash-lite',
  escalation: process.env.MODEL_ESCALATION || 'gemini-2.0-flash-lite',
  maxRetries: Number(process.env.MODEL_MAX_RETRIES || 1),
};

function parseRoutingPolicy(body) {
  const fromBody = body && body.modelRouting ? body.modelRouting : {};

  return {
    ...DEFAULT_ROUTING,
    ...fromBody,
    maxRetries: Math.max(0, Number(fromBody.maxRetries ?? DEFAULT_ROUTING.maxRetries ?? 1)),
  };
}

function buildPrompt(payload) {
  const history = Array.isArray(payload && payload.messageHistory)
    ? payload.messageHistory
    : [];

  const turns = history
    .slice(-8)
    .map((m) => `${m && m.role ? m.role : 'user'}: ${m && m.text ? m.text : ''}`)
    .join('\n');

  const firstName = payload && payload.context && payload.context.firstName
    ? String(payload.context.firstName)
    : 'there';

  const latestInput = String((payload && payload.userInput) || '');

  return [
    'You are IRIS, a clinical visit preparation assistant.',
    'Never diagnose and never prescribe treatment.',
    'Keep response concise (max 3 sentences).',
    'Ask exactly one focused follow-up question.',
    turns ? `Recent conversation:\n${turns}` : '',
    `Patient first name: ${firstName}`,
    `Latest user message: ${latestInput}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function callGemini(model, prompt) {
  const apiKey = (GEMINI_API_KEY.value() || '').trim();
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

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini failed (${response.status}): ${raw}`);
    error.statusCode = response.status;
    error.rawBody = raw;
    throw error;
  }

  const data = JSON.parse(raw);
  const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

  if (!text || typeof text !== 'string') {
    throw new Error(`Gemini model ${model} returned empty text`);
  }

  return text.trim();
}

async function callGroq(prompt) {
  const apiKey = (GROQ_API_KEY.value() || '').trim();
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY');
  }

  const model = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 220,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Groq failed (${response.status}): ${raw}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = JSON.parse(raw);
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

  if (!text || typeof text !== 'string') {
    throw new Error('Groq returned empty text');
  }

  return {
    text: text.trim(),
    model: data.model || model,
  };
}

function shouldFallbackToGroq(error) {
  const status = Number((error && error.statusCode) || 0);
  const body = String((error && error.rawBody) || (error && error.message) || '').toLowerCase();

  return (
    status === 429 ||
    status >= 500 ||
    body.includes('quota') ||
    body.includes('rate limit') ||
    body.includes('resource_exhausted')
  );
}

async function verifyFirebaseAuth(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    return decoded;
  } catch {
    return null;
  }
}

exports.health = onRequest({ region: 'us-central1' }, (_req, res) => {
  res.json({ ok: true, service: 'voxpatient-functions-ai' });
});

exports.interviewReply = onRequest({
  region: 'us-central1',
  timeoutSeconds: 60,
  cors: true,
  secrets: [GEMINI_API_KEY, GROQ_API_KEY],
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const startedAt = Date.now();
  const body = req.body || {};
  const routing = parseRoutingPolicy(body);
  const models = [routing.primary, routing.fallback, routing.escalation].filter(Boolean);
  const attemptsPerModel = Math.max(1, Number(routing.maxRetries || 1) + 1);
  const prompt = buildPrompt(body);

  const user = await verifyFirebaseAuth(req);
  const errors = [];
  let switchedForQuota = false;

  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
      try {
        const text = await callGemini(model, prompt);

        res.json({
          text,
          model,
          provider: 'gemini',
          latencyMs: Date.now() - startedAt,
          attempt,
          uid: user ? user.uid : undefined,
        });
        return;
      } catch (error) {
        errors.push(String(error && error.message ? error.message : error));

        if (shouldFallbackToGroq(error)) {
          switchedForQuota = true;
          break;
        }
      }
    }

    if (switchedForQuota) {
      break;
    }
  }

  try {
    const groq = await callGroq(prompt);
    res.json({
      text: groq.text,
      model: groq.model,
      provider: 'groq',
      latencyMs: Date.now() - startedAt,
      fallbackReason: switchedForQuota ? 'gemini-quota-or-rate-limit' : 'gemini-failed',
      uid: user ? user.uid : undefined,
    });
    return;
  } catch (groqError) {
    errors.push(String(groqError && groqError.message ? groqError.message : groqError));
  }

  logger.error('All providers failed', { errors: errors.slice(-3) });

  res.status(503).json({
    error: 'All providers failed',
    details: errors.slice(-3),
  });
});
