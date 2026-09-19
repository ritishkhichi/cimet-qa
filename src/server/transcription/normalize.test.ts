import { describe, expect, it } from "vitest";
import {
  assignSyntheticTimestamps,
  mapNamedSpeaker,
  normalizeDeepgramResult,
  normalizeUploadedUtterances,
} from "@/server/transcription/normalize";

describe("normalize", () => {
  it("maps Speaker 1/2 to customer/agent", () => {
    expect(mapNamedSpeaker("Speaker 1")).toBe("customer");
    expect(mapNamedSpeaker("Speaker 2")).toBe("agent");
  });

  it("assigns synthetic timestamps when missing", () => {
    const out = assignSyntheticTimestamps([
      { speaker: "agent", text: "Hello" },
      { speaker: "customer", text: "Hi there" },
    ]);
    expect(out[0].startMs).toBe(0);
    expect(out[0].endMs).toBeGreaterThan(0);
    expect(out[1].startMs).toBeGreaterThan(out[0].endMs!);
  });

  it("normalizes Deepgram-like payload", () => {
    const { utterances, words } = normalizeDeepgramResult({
      results: {
        utterances: [
          { transcript: "This call is recorded", speaker: 0, start: 1.2, end: 3.4 },
          { transcript: "Okay", speaker: 1, start: 3.5, end: 4.0 },
        ],
        channels: [
          {
            alternatives: [
              {
                words: [
                  { word: "This", start: 1.2, end: 1.4, speaker: 0 },
                  { word: "call", start: 1.4, end: 1.6, speaker: 0 },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(utterances).toHaveLength(2);
    expect(utterances[0].speaker).toBe("agent");
    expect(utterances[0].startMs).toBe(1200);
    expect(words).toHaveLength(2);
  });

  it("fills timestamps for upload without times", () => {
    const out = normalizeUploadedUtterances([
      { speaker: "Speaker 2", text: "Disclaimer read" },
      { speaker: "Speaker 1", text: "Yes" },
    ]);
    expect(out.every((u) => u.startMs != null)).toBe(true);
    expect(out[0].speaker).toBe("agent");
    expect(out[1].speaker).toBe("customer");
  });
});
