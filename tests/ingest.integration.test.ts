import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { saveUploadedTranscript } from "@/server/ingestion/saveTranscript";
import { redactCardData } from "@/lib/redact";

const prisma = new PrismaClient();
const EXTERNAL_ID = "TEST-INGEST-001";

describe("saveUploadedTranscript integration", () => {
  beforeAll(async () => {
    await prisma.lead.deleteMany({ where: { externalLeadId: EXTERNAL_ID } });
    await prisma.lead.create({
      data: {
        externalLeadId: EXTERNAL_ID,
        retailerId: "provider_a",
        agentId: "agent_test",
        callAt: new Date("2026-03-15T04:00:00.000Z"),
        status: "PENDING",
        crmFields: { email: "test@example.com" },
      },
    });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { externalLeadId: EXTERNAL_ID } });
    await prisma.$disconnect();
  });

  it("stores redacted utterances and sets TRANSCRIBED", async () => {
    const panLine = `Please use 4111 1111 1111 1111 to pay`;
    expect(redactCardData(panLine).redacted).toContain("[REDACTED_CARD_DATA]");

    const result = await saveUploadedTranscript({
      externalLeadId: EXTERNAL_ID,
      utterances: [
        {
          speaker: "agent",
          text: panLine,
          startMs: 0,
          endMs: 2000,
        },
        {
          speaker: "customer",
          text: "My email is test@example.com",
          startMs: 2500,
          endMs: 4000,
        },
      ],
    });

    expect(result.lead.status).toBe("TRANSCRIBED");
    expect(result.transcript.cardDataDetected).toBe(true);
    expect(result.transcript.redactedText).toContain("[REDACTED_CARD_DATA]");
    expect(result.transcript.redactedText).not.toContain("4111");
    expect(result.transcript.redactedText).toContain("test@example.com");

    const utterances = result.transcript.utterances as Array<{ text: string }>;
    expect(utterances[0].text).toContain("[REDACTED_CARD_DATA]");
  });
});
