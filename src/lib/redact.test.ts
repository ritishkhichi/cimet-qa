import { describe, expect, it } from "vitest";
import { redactCardData, sanitizeTranscriptForPersistence } from "@/lib/redact";

describe("redactCardData", () => {
  it("redacts spaced Visa test PAN", () => {
    const input =
      "Please pay with 4111 1111 1111 1111 and confirm email j.smith@gmail.com";
    const { redacted, hitCount } = redactCardData(input);
    expect(hitCount).toBe(1);
    expect(redacted).toContain("[REDACTED_CARD_DATA]");
    expect(redacted).toContain("j.smith@gmail.com");
    expect(redacted).not.toMatch(/4111/);
  });

  it("leaves rates untouched", () => {
    const input = "forty two dollars and ninety is 42.90 per month";
    const { redacted, hitCount } = redactCardData(input);
    expect(hitCount).toBe(0);
    expect(redacted).toBe(input);
  });

  it("sanitizeTranscriptForPersistence flags detection", () => {
    const result = sanitizeTranscriptForPersistence(
      "card 4111111111111111 entered",
    );
    expect(result.cardDataDetected).toBe(true);
    expect(result.text).toContain("[REDACTED_CARD_DATA]");
  });
});
