/**
 * Groq OpenAI-compatible client (https://console.groq.com).
 * Env: GROQ_API_KEY, optional GROQ_MODEL (default llama-3.3-70b-versatile).
 */

export function getGroqConfig() {
  const apiKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim(); // tolerate old env name briefly
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add your Groq key from https://console.groq.com to .env, then restart npm run dev.",
    );
  }
  // Prefer an explicit GROQ_MODEL; ignore old xAI model names if still in .env
  const rawModel = process.env.GROQ_MODEL?.trim();
  const legacy = process.env.XAI_MODEL?.trim();
  const looksLikeXai =
    !!legacy && /^grok/i.test(legacy) && !process.env.GROQ_MODEL?.trim();
  const model =
    rawModel ||
    (looksLikeXai ? "llama-3.3-70b-versatile" : legacy) ||
    "llama-3.3-70b-versatile";
  const baseUrl = (
    process.env.GROQ_BASE_URL?.trim() ||
    "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

function formatGroqError(status: number, body: unknown): string {
  const obj = body as {
    error?: { message?: string; type?: string };
    message?: string;
  };
  const msg = obj.error?.message || obj.message || JSON.stringify(body).slice(0, 400);
  if (status === 401) {
    return `Groq 401 Unauthorized: ${msg}. Check GROQ_API_KEY in .env and restart the server.`;
  }
  if (status === 403) {
    return `Groq 403 Forbidden: ${msg}. Check key permissions / org access in console.groq.com.`;
  }
  return `Groq error HTTP ${status}: ${msg}`;
}

export async function llmChatJson(opts: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const { apiKey, model, baseUrl } = getGroqConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = { message: "Non-JSON response from Groq" };
  }

  if (!res.ok) {
    throw new Error(formatGroqError(res.status, body));
  }

  const text = (body as { choices?: Array<{ message?: { content?: string } }> })
    .choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty content");
  return text;
}

/** @deprecated alias — scoring/PDF used grokChatJson name */
export const grokChatJson = llmChatJson;

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}
