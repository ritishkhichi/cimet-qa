import type { SpeakerRole, Utterance, WordTiming } from "@/types/transcript";

function mapSpeakerIndex(index: number | string | undefined): SpeakerRole {
  const n = typeof index === "string" ? Number(index) : index;
  if (n === 0) return "agent";
  if (n === 1) return "customer";
  return "unknown";
}

/** Map CIMET sample "Speaker 1/2" labels */
export function mapNamedSpeaker(label: string): SpeakerRole {
  const lower = label.toLowerCase();
  if (lower.includes("2") || lower.includes("agent")) return "agent";
  if (lower.includes("1") || lower.includes("customer")) return "customer";
  return "unknown";
}

export function secondsToMs(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 1000);
}

type DeepgramUtterance = {
  transcript?: string;
  speaker?: number;
  start?: number;
  end?: number;
};

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  speaker?: number;
};

type DeepgramResult = {
  results?: {
    utterances?: DeepgramUtterance[];
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

export function normalizeDeepgramResult(result: DeepgramResult): {
  utterances: Utterance[];
  words: WordTiming[];
  plainText: string;
} {
  const dgUtterances = result.results?.utterances ?? [];
  const utterances: Utterance[] =
    dgUtterances.length > 0
      ? dgUtterances
          .filter((u) => (u.transcript ?? "").trim().length > 0)
          .map((u) => ({
            speaker: mapSpeakerIndex(u.speaker),
            text: (u.transcript ?? "").trim(),
            startMs: secondsToMs(u.start),
            endMs: secondsToMs(u.end),
          }))
      : [];

  const wordsRaw =
    result.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  const words: WordTiming[] = wordsRaw.map((w) => ({
    word: w.punctuated_word ?? w.word ?? "",
    startMs: secondsToMs(w.start) ?? 0,
    endMs: secondsToMs(w.end) ?? 0,
    speaker: w.speaker != null ? mapSpeakerIndex(w.speaker) : undefined,
  }));

  if (utterances.length === 0) {
    const alt = result.results?.channels?.[0]?.alternatives?.[0];
    const text = (alt?.transcript ?? "").trim();
    if (text) {
      utterances.push({
        speaker: "unknown",
        text,
        startMs: words[0]?.startMs ?? null,
        endMs: words[words.length - 1]?.endMs ?? null,
      });
    }
  }

  const plainText = utterances.map((u) => u.text).join("\n");
  return { utterances, words, plainText };
}

export function assignSyntheticTimestamps(
  utterances: Array<{ speaker: SpeakerRole; text: string }>,
  gapMs = 4500,
): Utterance[] {
  let cursor = 0;
  return utterances.map((u) => {
    const duration = Math.min(12000, Math.max(2000, u.text.length * 45));
    const startMs = cursor;
    const endMs = cursor + duration;
    cursor = endMs + gapMs;
    return { ...u, startMs, endMs };
  });
}

export function normalizeUploadedUtterances(
  raw: Array<{
    speaker: string;
    text: string;
    startMs?: number | null;
    endMs?: number | null;
  }>,
): Utterance[] {
  const mapped = raw.map((u) => ({
    speaker: mapNamedSpeaker(u.speaker),
    text: u.text.trim(),
    startMs: u.startMs ?? null,
    endMs: u.endMs ?? null,
  }));

  const missingTimes = mapped.every((u) => u.startMs == null);
  if (missingTimes) {
    return assignSyntheticTimestamps(
      mapped.map((u) => ({ speaker: u.speaker, text: u.text })),
    );
  }
  return mapped;
}
