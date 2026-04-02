# Supabase Edge Functions Setup For Iris AI

Use this to run the Iris AI backend on Supabase Edge Functions.

## 1. Install Supabase CLI and login

```bash
# Do not use: npm install -g supabase (unsupported by Supabase)

# Windows option A (recommended): Scoop
powershell -ExecutionPolicy Bypass -Command "iwr -useb get.scoop.sh | iex"
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Windows option B: manual binary install
# 1) Download the latest Windows x86_64 zip from:
#    https://github.com/supabase/cli/releases/latest
# 2) Extract supabase.exe to a folder, e.g. C:\tools\supabase
# 3) Add that folder to PATH

# Verify
supabase --version

# Login
supabase login
```

## 2. Link your Supabase project

From the app root:

```bash
supabase init
supabase link --project-ref <your-project-ref>
```

## 3. Create the function

```bash
supabase functions new ai-interview-reply
```

Replace the file at `supabase/functions/ai-interview-reply/index.ts` with this:

```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      ...extraHeaders,
    },
  });
}

function parseRoutingPolicy(body: any) {
  const fromBody = body?.modelRouting ?? {};

  return {
    primary: fromBody.primary || Deno.env.get("MODEL_PRIMARY") || "gemini-2.5-flash",
    fallback: fromBody.fallback || Deno.env.get("MODEL_FALLBACK") || "gemini-2.5-flash-lite",
    escalation: fromBody.escalation || Deno.env.get("MODEL_ESCALATION") || "gemini-3.1-flash-lite",
    maxRetries: Math.max(0, Number(fromBody.maxRetries ?? Deno.env.get("MODEL_MAX_RETRIES") ?? 1)),
  };
}

function buildPrompt(payload: any) {
  const history = Array.isArray(payload?.messageHistory) ? payload.messageHistory : [];

  const turns = history
    .slice(-8)
    .map((m: any) => `${m?.role ?? "user"}: ${m?.text ?? ""}`)
    .join("\n");

  const firstName = payload?.context?.firstName ? String(payload.context.firstName) : "there";
  const latestInput = String(payload?.userInput ?? "");

  return [
    "You are IRIS, a clinical visit preparation assistant.",
    "Never diagnose and never prescribe treatment.",
    "Keep response concise (max 3 sentences).",
    "Ask exactly one focused follow-up question.",
    turns ? `Recent conversation:\n${turns}` : "",
    `Patient first name: ${firstName}`,
    `Latest user message: ${latestInput}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callGemini(model: string, prompt: string) {
  const apiKey = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 220,
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini failed (${response.status}): ${raw}`);
  }

  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== "string") {
    throw new Error(`Gemini model ${model} returned empty text`);
  }

  return text.trim();
}

async function getUserIdFromBearerToken(request: Request): Promise<string | null> {
  const authHeader =
    request.headers.get("Authorization") || request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    return null;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (request.method === "GET") {
    return json({ ok: true, service: "iris-supabase-ai-proxy" });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const startedAt = Date.now();
  const body = await request.json().catch(() => ({}));
  const userId = await getUserIdFromBearerToken(request);
  if (!userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const routing = parseRoutingPolicy(body);
  const models = [routing.primary, routing.fallback, routing.escalation].filter(Boolean);
  const attemptsPerModel = Math.max(1, Number(routing.maxRetries || 1) + 1);
  const prompt = buildPrompt(body);

  const errors: string[] = [];

  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
      try {
        const text = await callGemini(model, prompt);
        return json({
          text,
          model,
          provider: "gemini",
          userId,
          latencyMs: Date.now() - startedAt,
          attempt,
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  return json(
    {
      error: "All Gemini attempts failed",
      details: errors.slice(-3),
    },
    503,
  );
});
```

## 4. Set function secrets

From project root:

```bash
supabase secrets set GEMINI_API_KEY=<your-key>
supabase secrets set GROQ_API_KEY=<your-groq-key>
supabase secrets set MODEL_PRIMARY=gemini-2.5-flash
supabase secrets set MODEL_FALLBACK=gemini-2.5-flash-lite
supabase secrets set MODEL_ESCALATION=gemini-3.1-flash-lite
supabase secrets set MODEL_MAX_RETRIES=1
supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
```

Note: `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the platform in Edge Functions.
Do not try to create `SUPABASE_*` secrets manually.

## 5. Deploy function

```bash
supabase functions deploy ai-interview-reply
```

Your function base URL format is:
- `https://<project-ref>.functions.supabase.co`

Your function endpoint is:
- `https://<project-ref>.functions.supabase.co/ai-interview-reply`

## 6. Point the app to Supabase Functions

Update app config:
- `src/config/ai.ts`
- `backendBaseUrl = https://<project-ref>.functions.supabase.co`
- `backendInterviewPath = /ai-interview-reply`

## 7. Test from terminal

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/ai-interview-reply" \
  -H "Content-Type: application/json" \
  -d "{\"userInput\":\"I have headaches\",\"messageHistory\":[],\"context\":{\"firstName\":\"Sam\"},\"modelRouting\":{\"primary\":\"gemini-2.5-flash\",\"fallback\":\"gemini-2.5-flash-lite\",\"escalation\":\"gemini-3.1-flash-lite\",\"maxRetries\":1}}"
```

## Notes

- Local development in the app still uses `http://10.0.2.2:8080` for Android emulator and `http://localhost:8080` for iOS simulator.
- Keep API keys only in Supabase secrets, never in app code.
- This function tries Gemini first and then falls back to Groq if Gemini fails.
- The app sends a bearer token to this function and the example validates it with Supabase Auth.
- During migration, app code tries Supabase token first, then Firebase token fallback if no Supabase session is stored yet.
