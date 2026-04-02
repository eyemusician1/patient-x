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
    fallback: fromBody.fallback || Deno.env.get("MODEL_FALLBACK") || "gemini-2.5-flash",
    escalation: fromBody.escalation || Deno.env.get("MODEL_ESCALATION") || "gemini-2.5-flash",
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
        maxOutputTokens: 400,
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini failed (${response.status}): ${raw}`);
  }

  const data = JSON.parse(raw);
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim()
    : "";

  if (!text) {
    throw new Error(`Gemini model ${model} returned empty text`);
  }

  return text;
}

async function callGroq(prompt: string) {
  const apiKey = (Deno.env.get("GROQ_API_KEY") || "").trim();
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const model = (Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile").trim();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Groq failed (${response.status}): ${raw}`);
  }

  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== "string") {
    throw new Error("Groq returned empty text");
  }

  return {
    text: text.trim(),
    model: data?.model || model,
  };
}

function shouldFallbackToGroq(error: unknown): boolean {
  const candidate = error as { message?: string };
  const message = String(candidate?.message || "").toLowerCase();

  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
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

  const routing = parseRoutingPolicy(body);
  const models = [routing.primary, routing.fallback, routing.escalation].filter(Boolean);
  const attemptsPerModel = Math.max(1, Number(routing.maxRetries || 1) + 1);
  const prompt = buildPrompt(body);

  const errors: string[] = [];
  let switchedForQuota = false;

  for (const model of models) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
      try {
        const text = await callGemini(model, prompt);
        return json({
          text,
          model,
          provider: "gemini",
          userId: userId ?? undefined,
          latencyMs: Date.now() - startedAt,
          attempt,
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));

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
    return json({
      text: groq.text,
      model: groq.model,
      provider: "groq",
      userId: userId ?? undefined,
      latencyMs: Date.now() - startedAt,
      fallbackReason: switchedForQuota ? "gemini-quota-or-rate-limit" : "gemini-failed",
    });
  } catch (groqError) {
    errors.push(groqError instanceof Error ? groqError.message : String(groqError));
  }

  return json(
    {
      error: "All providers failed",
      details: errors.slice(-3),
    },
    503,
  );
});