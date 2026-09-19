import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("sample transcript fixture", () => {
  it("has speaker-mapped utterances with synthetic timestamps", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "fixtures", "sample-transcript.json"),
        "utf8",
      ),
    ) as {
      utterances: Array<{
        speaker: string;
        text: string;
        startMs: number | null;
        endMs: number | null;
      }>;
    };

    expect(fixture.utterances.length).toBeGreaterThan(20);
    expect(fixture.utterances.every((u) => u.startMs != null)).toBe(true);
    expect(fixture.utterances.some((u) => u.speaker === "agent")).toBe(true);
    expect(fixture.utterances.some((u) => u.speaker === "customer")).toBe(true);
    expect(
      fixture.utterances.some((u) =>
        u.text.toLowerCase().includes("recorded"),
      ),
    ).toBe(true);
  });
});
