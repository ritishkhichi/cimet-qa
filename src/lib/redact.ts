export const CARD_PAN_RE = /\b(?:\d[ -]*?){13,19}\b/g;
export const REDACTED_CARD = "[REDACTED_CARD_DATA]";

export function redactCardData(text: string): {
  redacted: string;
  hitCount: number;
} {
  let hitCount = 0;
  const redacted = text.replace(CARD_PAN_RE, () => {
    hitCount += 1;
    return REDACTED_CARD;
  });
  return { redacted, hitCount };
}

/** Call before: DB write, LLM prompt assembly, API responses to UI */
export function sanitizeTranscriptForPersistence(raw: string) {
  const { redacted, hitCount } = redactCardData(raw);
  return {
    text: redacted,
    cardDataDetected: hitCount > 0,
    cardHitCount: hitCount,
  };
}

export function redactUtterances<
  T extends { text: string },
>(utterances: T[]): { utterances: T[]; cardDataDetected: boolean } {
  let cardDataDetected = false;
  const next = utterances.map((u) => {
    const { redacted, hitCount } = redactCardData(u.text);
    if (hitCount > 0) cardDataDetected = true;
    return { ...u, text: redacted };
  });
  return { utterances: next, cardDataDetected };
}
