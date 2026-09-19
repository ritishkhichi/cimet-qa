import type { CheckDefinition } from "@prisma/client";
import type { ScoreStatus } from "@prisma/client";
import type { Utterance } from "@/types/transcript";
import { z } from "zod";
import { extractJsonObject, grokChatJson } from "@/server/llm/grok";

const resultSchema = z.object({
  results: z.array(
    z.object({
      checkCode: z.string(),
      status: z.enum(["PASS", "FAIL", "NOTE", "LOW_CONFIDENCE"]),
      confidence: z.number().min(0).max(1),
      evidenceText: z.string().nullable().optional(),
      startMs: z.number().nullable().optional(),
      endMs: z.number().nullable().optional(),
      reasoning: z.string(),
    }),
  ),
});

export type LlmCheckResult = {
  checkCode: string;
  status: ScoreStatus;
  confidence: number;
  evidenceText?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  reasoning: string;
};

const SYSTEM = `SYSTEM — SAFETY / PCI GUARDRAIL (NON-NEGOTIABLE)

You are a QA scoring engine for regulated Australian energy/broadband sales calls.

HARD RULES:
1. Never reproduce, complete, or invent payment card numbers (PAN), CVV, or full track data.
2. If the transcript contains digit sequences that look like card numbers—even partial—treat them as already sensitive. In ALL outputs replace them with the exact token: [REDACTED_CARD_DATA]
3. You may flag that card data was spoken but you must not include the digits in evidenceText, reasoning, or any other field.
4. Do not contact customers. Do not rewrite CRM fields. Only score against the provided check library and CRM snapshot.
5. Return ONLY valid JSON matching the schema. No markdown fences.

OUTPUT: If you would have quoted a card number in evidence, quote the surrounding words with [REDACTED_CARD_DATA] instead.`;

export async function scoreWithLlm(opts: {
  checks: CheckDefinition[];
  utterances: Utterance[];
  crmFields: unknown;
  checkVersionId: string;
  callAt: string;
}): Promise<LlmCheckResult[]> {
  const userPrompt = `The transcript below has been pre-scrubbed by regex. Still enforce [REDACTED_CARD_DATA] if any PAN-like digits remain.

TRANSCRIPT (utterances with optional startMs):
${JSON.stringify(opts.utterances, null, 2)}

CRM SNAPSHOT:
${JSON.stringify(opts.crmFields, null, 2)}

CHECK LIBRARY (version ${opts.checkVersionId}, call date ${opts.callAt}):
${JSON.stringify(
  opts.checks.map((c) => ({
    code: c.code,
    type: c.type,
    title: c.title,
    instruction: c.instruction,
    critical: c.critical,
    config: c.config,
  })),
  null,
  2,
)}

Return JSON object:
{
  "results": [
    {
      "checkCode": string,
      "status": "PASS" | "FAIL" | "NOTE" | "LOW_CONFIDENCE",
      "confidence": number,
      "evidenceText": string | null,
      "startMs": number | null,
      "endMs": number | null,
      "reasoning": string
    }
  ]
}

Include exactly one result per check code. For Type C non-critical behavioural notes use NOTE when coaching-worthy, else PASS.
If unsure on a critical check use LOW_CONFIDENCE (never auto-pass uncertainty).`;

  const text = await grokChatJson({
    system: SYSTEM,
    user: userPrompt,
    temperature: 0.1,
  });
  const parsed = resultSchema.parse(extractJsonObject(text));

  const byCode = new Map(opts.checks.map((c) => [c.code, c]));
  return parsed.results
    .filter((r) => byCode.has(r.checkCode))
    .map((r) => ({
      checkCode: r.checkCode,
      status: r.status,
      confidence: r.confidence,
      evidenceText: r.evidenceText,
      startMs: r.startMs,
      endMs: r.endMs,
      reasoning: r.reasoning,
    }));
}

/** @deprecated use scoreWithLlm — kept name alias during migration */
export const scoreWithGemini = scoreWithLlm;
export type GeminiCheckResult = LlmCheckResult;
