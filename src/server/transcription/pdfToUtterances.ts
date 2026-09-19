import { z } from "zod";
import { normalizeUploadedUtterances } from "@/server/transcription/normalize";
import type { Utterance } from "@/types/transcript";
import { extractJsonObject, grokChatJson } from "@/server/llm/grok";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || "").trim();
    if (!text) {
      throw new Error("PDF contained no extractable text");
    }
    return text;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

const extractedSchema = z.object({
  utterances: z
    .array(
      z.object({
        speaker: z.string(),
        text: z.string().min(1),
        startMs: z.number().nullable().optional(),
        endMs: z.number().nullable().optional(),
      }),
    )
    .min(1),
});

/**
 * Convert a call-transcript PDF into our utterance schema.
 * Text is extracted locally, then structured with Groq.
 */
export async function pdfToUtterances(buffer: Buffer): Promise<Utterance[]> {
  const pdfText = await extractPdfText(buffer);

  const text = await grokChatJson({
    system: `You convert sales-call transcript text into JSON for a QA system.
Return ONLY JSON: { "utterances": [ { "speaker": "agent"|"customer"|"unknown", "text": string, "startMs": number|null, "endMs": number|null } ] }
Never invent dialogue. Never output real card numbers — use [REDACTED_CARD_DATA].`,
    user: `Preserve turn order. Prefer speaker "agent" for salesperson and "customer" for buyer.
If timestamps appear (mm:ss), convert to ms; else null.
Skip headers/footers/page numbers.

TRANSCRIPT TEXT FROM PDF:
---
${pdfText.slice(0, 120000)}
---`,
    temperature: 0.1,
  });

  let parsed: z.infer<typeof extractedSchema>;
  try {
    parsed = extractedSchema.parse(extractJsonObject(text));
  } catch {
    throw new Error(
      "Could not extract utterances from PDF. Try a clearer transcript PDF or upload JSON instead.",
    );
  }

  return normalizeUploadedUtterances(parsed.utterances);
}
