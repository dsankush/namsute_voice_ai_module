// A weaker model like gpt-4o-mini doesn't always distinguish "context I was
// given" from "values I should write" — it can echo the prompt's own status
// vocabulary ("PENDING_INTAKE") or its own JSON-schema example text
// ("Specialty Department", "Doctor Name") back as if those were real
// extracted values, instead of leaving a field blank when it doesn't
// actually know it yet. Filters those out at the one place all of GPT's
// structured output passes through, so no caller has to remember to.
const PLACEHOLDER_FIELD_VALUES = new Set([
  "pending", "n/a", "na", "none", "tbd", "unknown", "null", "undefined", "-", "—",
  "specialty department", "doctor name", "preferred date", "preferred time",
  "full name", "10-digit mobile number", "age or doctor", "age or dob", "intent summary",
]);

// Returns the value unchanged if it looks like real data, or "" if it's one
// of GPT's own placeholder/schema-echo strings — callers can then fall back
// to whatever they already had, exactly as if GPT had returned "" itself.
export function sanitizeLlmField(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  if (PLACEHOLDER_FIELD_VALUES.has(value.toLowerCase())) return "";
  return value;
}

// ─── OpenAI Chat Handler ──────────────────────────────────────────────────────
// Industry-agnostic — takes a fully-built system prompt and message history,
// returns parsed JSON. No clinic-specific knowledge here.
export async function callOpenAI(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  apiKey: string
) {
  const attempt = async (timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 350,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  // One short retry on a plausibly-transient failure (network error, timeout,
  // 5xx, or rate limit) — previously any single hiccup dropped straight to
  // the much weaker generic fallback (loses language, loses structured
  // extraction). A 4xx (bad request/auth) is never retried since it will
  // just fail identically again. Total worst case ~9s, still bounded for a
  // live voice call, and this fallback already has its own fallback behind it.
  let res: Response | null = null;
  try {
    res = await attempt(5000);
    if (!res.ok && (res.status >= 500 || res.status === 429)) {
      res = await attempt(3000);
    }
  } catch {
    res = await attempt(3000).catch(() => null);
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";

  if (!res || !res.ok) {
    // If OpenAI fails (e.g. 401 auth, rate limit, quota, network) and Gemini API key is available,
    // seamlessly fall back to Gemini 2.5 Flash with zero downtime
    if (geminiKey) {
      try {
        return await callGemini(systemPrompt, messages, geminiKey);
      } catch (geminiErr: any) {
        console.warn("[Gemini fallback warn]:", geminiErr?.message || geminiErr);
      }
    }
    const errText = res ? await res.text().catch(() => "") : "network error";
    throw new Error(`OpenAI ${res ? res.status : "failed"}: ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    if (geminiKey) {
      return await callGemini(systemPrompt, messages, geminiKey);
    }
    throw new Error("Empty OpenAI response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (geminiKey) {
      return await callGemini(systemPrompt, messages, geminiKey);
    }
    throw new Error("OpenAI returned malformed JSON");
  }

  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { reply?: unknown }).reply !== "string") {
    if (geminiKey) {
      return await callGemini(systemPrompt, messages, geminiKey);
    }
    throw new Error("OpenAI response missing required 'reply' field");
  }

  return parsed as Record<string, any>;
}

// Scans a growing buffer of raw (possibly-incomplete) JSON text for a given
// top-level string field and returns its decoded value the INSTANT it's
// syntactically complete (an unescaped closing quote found) — before the
// rest of the JSON object has necessarily finished. Returns null if the
// field hasn't appeared yet, isn't a string, or hasn't closed yet; callers
// should keep calling this as more of the stream arrives. Not a general JSON
// parser — deliberately narrow, since the exact schema (reply is always the
// first field) is known ahead of time.
function extractCompletedJsonStringField(buffer: string, fieldName: string): string | null {
  const keyPattern = `"${fieldName}"`;
  const keyIdx = buffer.indexOf(keyPattern);
  if (keyIdx === -1) return null;

  let i = keyIdx + keyPattern.length;
  while (i < buffer.length && /\s/.test(buffer[i])) i++;
  if (buffer[i] !== ":") return null;
  i++;
  while (i < buffer.length && /\s/.test(buffer[i])) i++;
  if (buffer[i] !== '"') return null;

  const valueStart = i;
  let j = valueStart + 1;
  while (j < buffer.length) {
    if (buffer[j] === "\\") { j += 2; continue; }
    if (buffer[j] === '"') {
      const literal = buffer.slice(valueStart, j + 1);
      try {
        return JSON.parse(literal);
      } catch {
        return null;
      }
    }
    j++;
  }
  return null; // not closed yet — more of the stream still to arrive
}

// ─── OpenAI Chat Handler — streaming variant ─────────────────────────────────
// Same request/response contract as callOpenAI() — extracted/isComplete etc.
// go through the exact same complete, fully-parsed JSON at the end, so
// nothing about validation changes. The only difference: since the schema
// always writes "reply" first, onReplyReady fires with the caller's spoken
// reply text (and the language it was generated for) the moment that one
// field closes — typically well before the rest of the JSON (extracted,
// isComplete, etc.) finishes streaming — so a caller can start synthesizing
// speech for it immediately instead of waiting for the whole turn to
// resolve. On any failure (network, non-OK, malformed JSON), this throws;
// callers are expected to fall back to the non-streaming callOpenAI(), which
// keeps its own retry + Gemini fallback chain unchanged as the safety net.
export async function callOpenAIStreaming(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  apiKey: string,
  onReplyReady?: (replyText: string) => void
): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 350,
        stream: true,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI streaming ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let contentBuffer = "";
  let replyFired = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    let newlineIdx;
    while ((newlineIdx = sseBuffer.indexOf("\n")) >= 0) {
      const line = sseBuffer.slice(0, newlineIdx).trim();
      sseBuffer = sseBuffer.slice(newlineIdx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        const delta = evt.choices?.[0]?.delta?.content;
        if (typeof delta === "string") {
          contentBuffer += delta;
          if (!replyFired && onReplyReady) {
            const reply = extractCompletedJsonStringField(contentBuffer, "reply");
            if (reply !== null) {
              replyFired = true;
              onReplyReady(reply);
            }
          }
        }
      } catch {
        // Partial/malformed SSE chunk boundary — the next chunk completes it.
      }
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contentBuffer);
  } catch {
    throw new Error("OpenAI streaming returned malformed JSON");
  }
  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { reply?: unknown }).reply !== "string") {
    throw new Error("OpenAI streaming response missing required 'reply' field");
  }
  return parsed as Record<string, any>;
}

async function callGemini(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  apiKey: string
): Promise<Record<string, any>> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 450,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || typeof (parsed as { reply?: unknown }).reply !== "string") {
      throw new Error("Gemini response missing required 'reply' field");
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
