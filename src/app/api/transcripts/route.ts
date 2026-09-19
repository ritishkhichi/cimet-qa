import { NextResponse } from "next/server";
import { normalizeUploadedUtterances } from "@/server/transcription/normalize";
import { saveUploadedTranscript } from "@/server/ingestion/saveTranscript";
import { z } from "zod";

const bodySchema = z.object({
  leadId: z.string().optional(),
  externalLeadId: z.string().optional(),
  utterances: z
    .array(
      z.object({
        speaker: z.string(),
        text: z.string(),
        startMs: z.number().nullable().optional(),
        endMs: z.number().nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    if (!parsed.leadId && !parsed.externalLeadId) {
      return NextResponse.json(
        { error: "leadId or externalLeadId is required" },
        { status: 400 },
      );
    }

    const utterances = normalizeUploadedUtterances(parsed.utterances);
    const result = await saveUploadedTranscript({
      leadId: parsed.leadId,
      externalLeadId: parsed.externalLeadId,
      utterances,
    });

    return NextResponse.json({
      lead: result.lead,
      transcript: {
        id: result.transcript.id,
        source: result.transcript.source,
        cardDataDetected: result.transcript.cardDataDetected,
        utteranceCount: utterances.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
