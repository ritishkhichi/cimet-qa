import { DeepgramClient } from "@deepgram/sdk";
import { getDeepgramApiKey } from "@/lib/env";
import { normalizeDeepgramResult } from "@/server/transcription/normalize";
import type { Utterance, WordTiming } from "@/types/transcript";

export type DeepgramTranscription = {
  utterances: Utterance[];
  words: WordTiming[];
  plainText: string;
  durationMs: number | null;
};

export async function transcribeWithDeepgram(
  audio: Buffer,
): Promise<DeepgramTranscription> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error(
      "DEEPGRAM_API_KEY is not set. Use Option B (direct transcript upload) or add the key to .env",
    );
  }

  const client = new DeepgramClient({ apiKey });
  const response = await client.listen.v1.media.transcribeFile(audio, {
    model: "nova-2",
    smart_format: true,
    diarize: true,
    utterances: true,
    punctuate: true,
  });

  // SDK may return SyncPrerecordedResponse-like shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = response as any;
  const normalized = normalizeDeepgramResult(result);
  const durationSec = result?.metadata?.duration ?? null;

  return {
    ...normalized,
    durationMs:
      durationSec != null ? Math.round(Number(durationSec) * 1000) : null,
  };
}
