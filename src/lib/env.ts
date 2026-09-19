import { z } from "zod";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getDeepgramApiKey(): string | null {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  return key ? key : null;
}

export const utteranceSchema = z.object({
  speaker: z.enum(["agent", "customer", "unknown"]),
  text: z.string().min(1),
  startMs: z.number().nullable(),
  endMs: z.number().nullable(),
});

export const transcriptUploadSchema = z.object({
  leadId: z.string().min(1),
  externalLeadId: z.string().optional(),
  utterances: z.array(utteranceSchema).min(1),
  callAt: z.string().datetime().optional(),
});
