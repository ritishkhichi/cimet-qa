import { NextResponse } from "next/server";
import { saveRecordingAndTranscribe } from "@/server/ingestion/saveTranscript";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const leadId = (form.get("leadId") as string | null) ?? undefined;
    const externalLeadId =
      (form.get("externalLeadId") as string | null) ?? undefined;
    const file = form.get("audio");

    if (!leadId && !externalLeadId) {
      return NextResponse.json(
        { error: "leadId or externalLeadId is required" },
        { status: 400 },
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "audio file is required" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveRecordingAndTranscribe({
      leadId,
      externalLeadId,
      fileName: file.name || "recording.audio",
      mimeType: file.type || undefined,
      buffer,
    });

    return NextResponse.json({
      lead: result.lead,
      recording: {
        id: result.recording.id,
        filePath: result.recording.filePath,
        durationMs: result.recording.durationMs,
      },
      transcript: {
        id: result.transcript.id,
        source: result.transcript.source,
        cardDataDetected: result.transcript.cardDataDetected,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recording ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
