import { NextResponse } from "next/server";
import { pdfToUtterances } from "@/server/transcription/pdfToUtterances";
import { saveUploadedTranscript } from "@/server/ingestion/saveTranscript";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const leadId = String(form.get("leadId") || "").trim() || undefined;
    const externalLeadId =
      String(form.get("externalLeadId") || "").trim() || undefined;
    const file = form.get("pdf") ?? form.get("file");

    if (!leadId && !externalLeadId) {
      return NextResponse.json(
        { error: "leadId or externalLeadId is required" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing PDF file (field name: pdf)" },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    const isPdf =
      name.endsWith(".pdf") ||
      file.type === "application/pdf" ||
      file.type === "application/x-pdf";
    if (!isPdf) {
      return NextResponse.json(
        { error: "File must be a PDF (.pdf)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF too large (max 12 MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
      return NextResponse.json(
        { error: "File does not look like a valid PDF" },
        { status: 400 },
      );
    }

    const utterances = await pdfToUtterances(buffer);
    const result = await saveUploadedTranscript({
      leadId,
      externalLeadId,
      utterances,
    });

    return NextResponse.json({
      lead: result.lead,
      transcript: {
        id: result.transcript.id,
        source: result.transcript.source,
        cardDataDetected: result.transcript.cardDataDetected,
        utteranceCount: utterances.length,
        from: "pdf",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
