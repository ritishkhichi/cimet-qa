import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { redactUtterances } from "@/lib/redact";
import { transcribeWithDeepgram } from "@/server/transcription/deepgram";
import type { Utterance, WordTiming } from "@/types/transcript";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

async function resolveLeadId(opts: {
  leadId?: string;
  externalLeadId?: string;
}) {
  if (opts.leadId) {
    const byId = await prisma.lead.findUnique({ where: { id: opts.leadId } });
    if (byId) return byId;
  }
  if (opts.externalLeadId) {
    const byExt = await prisma.lead.findUnique({
      where: { externalLeadId: opts.externalLeadId },
    });
    if (byExt) return byExt;
  }
  throw new Error("Lead not found. Pass a valid leadId or externalLeadId.");
}

export async function saveUploadedTranscript(opts: {
  leadId?: string;
  externalLeadId?: string;
  utterances: Utterance[];
}) {
  const lead = await resolveLeadId(opts);
  const { utterances, cardDataDetected } = redactUtterances(opts.utterances);
  const redactedText = utterances.map((u) => `[${u.speaker}] ${u.text}`).join("\n");

  const transcript = await prisma.transcript.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      source: "UPLOAD",
      utterances,
      words: [],
      redactedText,
      cardDataDetected,
    },
    update: {
      source: "UPLOAD",
      utterances,
      words: [],
      redactedText,
      cardDataDetected,
    },
  });

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "TRANSCRIBED" },
  });

  return { lead: updatedLead, transcript };
}

export async function saveRecordingAndTranscribe(opts: {
  leadId?: string;
  externalLeadId?: string;
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}) {
  const lead = await resolveLeadId(opts);

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "TRANSCRIBING" },
  });

  try {
    const dir = path.join(UPLOAD_ROOT, lead.externalLeadId);
    await mkdir(dir, { recursive: true });
    const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dir, `${Date.now()}-${safeName}`);
    await writeFile(filePath, opts.buffer);

    const recording = await prisma.recording.create({
      data: {
        leadId: lead.id,
        filePath,
        mimeType: opts.mimeType,
      },
    });

    const dg = await transcribeWithDeepgram(opts.buffer);
    const { utterances, cardDataDetected } = redactUtterances(dg.utterances);
    const words = dg.words as WordTiming[];
    const redactedText = utterances
      .map((u) => `[${u.speaker}] ${u.text}`)
      .join("\n");

    if (dg.durationMs != null) {
      await prisma.recording.update({
        where: { id: recording.id },
        data: { durationMs: dg.durationMs },
      });
    }

    const transcript = await prisma.transcript.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        source: "DEEPGRAM",
        utterances,
        words,
        redactedText,
        cardDataDetected,
      },
      update: {
        source: "DEEPGRAM",
        utterances,
        words,
        redactedText,
        cardDataDetected,
      },
    });

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "TRANSCRIBED" },
    });

    return { lead: updatedLead, recording, transcript };
  } catch (err) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "FAILED" },
    });
    throw err;
  }
}
