import { Prisma, PrismaClient, CheckType, UserRole } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { normalizeUploadedUtterances } from "../src/server/transcription/normalize";
import { redactUtterances } from "../src/lib/redact";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demo123!";

async function seedUsers() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: Array<{ email: string; name: string; role: UserRole }> = [
    { email: "admin@cimet.local", name: "Demo Admin", role: "ADMIN" },
    { email: "tl@cimet.local", name: "Demo Team Lead", role: "TL" },
    { email: "qa@cimet.local", name: "Demo QA", role: "QA" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hash,
      },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: hash,
      },
    });
  }
  console.log(`Seeded users (password: ${DEMO_PASSWORD})`);
}

async function seedChecks() {
  // Clear score data that references check definitions before recreating library
  await prisma.override.deleteMany({});
  await prisma.scoreResult.deleteMany({});
  await prisma.scoreRun.deleteMany({});

  const existing = await prisma.checkVersion.findFirst({
    where: { retailerId: "provider_a", label: "provider_a-v1" },
  });
  if (existing) {
    await prisma.checkDefinition.deleteMany({ where: { versionId: existing.id } });
    await prisma.checkVersion.delete({ where: { id: existing.id } });
  }

  const version = await prisma.checkVersion.create({
    data: {
      retailerId: "provider_a",
      label: "provider_a-v1",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      checks: {
        create: [
          {
            code: "RECORDING_DISCLAIMER",
            type: CheckType.A_VERBATIM,
            title: "Recording disclaimer",
            instruction:
              "Verify the agent advised the call will be recorded for quality assurance and/or training. Near-verbatim is OK if meaning is clear.",
            critical: true,
            weight: 5,
            config: {
              scriptHints: ["call will be recorded", "quality assurance", "training"],
            },
          },
          {
            code: "PLAN_PROMO_PRICE",
            type: CheckType.B_FACTUAL,
            title: "Promo plan price",
            instruction:
              "Agent must quote promotional price matching CRM planPromoPrice (42.9 / forty two dollars and ninety).",
            critical: true,
            weight: 5,
            config: { crmField: "planPromoPrice", expected: 42.9 },
          },
          {
            code: "PLAN_REGULAR_PRICE",
            type: CheckType.B_FACTUAL,
            title: "Regular plan price after promo",
            instruction:
              "Agent must quote ongoing/regular price matching CRM planRegularPrice (72.9).",
            critical: true,
            weight: 4,
            config: { crmField: "planRegularPrice", expected: 72.9 },
          },
          {
            code: "MODEM_MODEL",
            type: CheckType.B_FACTUAL,
            title: "Modem model",
            instruction:
              "Agent must correctly state the modem as Netcom CF40 / CF forty Wi-Fi 6 matching CRM modemModel. Flag mismatches like PS forty.",
            critical: true,
            weight: 4,
            config: { crmField: "modemModel" },
          },
          {
            code: "EMAIL_CAPTURED",
            type: CheckType.B_FACTUAL,
            title: "Email verified on call",
            instruction:
              "Agent must verify customer email on the call (may appear as [EMAIL] placeholder in redacted transcript).",
            critical: true,
            weight: 4,
            config: { crmField: "email" },
          },
          {
            code: "PHONE_CAPTURED",
            type: CheckType.B_FACTUAL,
            title: "Mobile verified on call",
            instruction:
              "Agent must verify customer mobile on the call (may appear as [PHONE]).",
            critical: true,
            weight: 3,
            config: { crmField: "phone" },
          },
          {
            code: "DELIVERY_CONFUSION",
            type: CheckType.C_BEHAVIOUR,
            title: "Delivery address confusion / dead air coaching",
            instruction:
              "Note prolonged confusion about delivery vs service address or long awkward stretches. Non-critical coaching only.",
            critical: false,
            weight: 1,
            config: {},
          },
        ],
      },
    },
  });

  console.log(`Seeded check version ${version.label} (${version.id})`);
}

async function seedScenarioLeads() {
  const fixturesDir = path.join(process.cwd(), "fixtures");
  const leadFiles = readdirSync(fixturesDir).filter(
    (f) => f.startsWith("lead-BB-") && f.endsWith(".json"),
  );

  if (leadFiles.length === 0) {
    throw new Error("No lead-BB-*.json fixtures — run: npx tsx scripts/generate-fixtures.ts");
  }

  for (const file of leadFiles) {
    const lead = JSON.parse(
      readFileSync(path.join(fixturesDir, file), "utf8"),
    ) as {
      externalLeadId: string;
      retailerId: string;
      agentId: string;
      callAt: string;
      crmFields: Prisma.InputJsonValue;
    };

    const tPath = path.join(
      fixturesDir,
      `transcript-${lead.externalLeadId}.json`,
    );
    const transcriptJson = JSON.parse(readFileSync(tPath, "utf8")) as {
      utterances: Array<{
        speaker: string;
        text: string;
        startMs?: number | null;
        endMs?: number | null;
      }>;
      title?: string;
      expectGate?: string;
    };

    const utterances = normalizeUploadedUtterances(transcriptJson.utterances);
    const { utterances: redacted, cardDataDetected } = redactUtterances(utterances);
    const redactedText = redacted
      .map((u) => `[${u.speaker}] ${u.text}`)
      .join("\n");

    const crm = {
      ...(lead.crmFields as Record<string, unknown>),
      scenarioTitle: transcriptJson.title ?? lead.externalLeadId,
      expectGate: transcriptJson.expectGate ?? "",
    };

    const row = await prisma.lead.upsert({
      where: { externalLeadId: lead.externalLeadId },
      create: {
        externalLeadId: lead.externalLeadId,
        retailerId: lead.retailerId,
        agentId: lead.agentId,
        callAt: new Date(lead.callAt),
        status: "TRANSCRIBED",
        crmFields: crm as Prisma.InputJsonValue,
      },
      update: {
        retailerId: lead.retailerId,
        agentId: lead.agentId,
        callAt: new Date(lead.callAt),
        status: "TRANSCRIBED",
        crmFields: crm as Prisma.InputJsonValue,
      },
    });

    await prisma.transcript.upsert({
      where: { leadId: row.id },
      create: {
        leadId: row.id,
        source: "UPLOAD",
        utterances: redacted,
        words: [],
        redactedText,
        cardDataDetected,
      },
      update: {
        source: "UPLOAD",
        utterances: redacted,
        words: [],
        redactedText,
        cardDataDetected,
      },
    });

    console.log(`Seeded ${row.externalLeadId} + transcript (${redacted.length} turns)`);
  }

  // Legacy alias BB-SAMPLE-001 → clean scenario for old docs
  const clean = await prisma.lead.findUnique({
    where: { externalLeadId: "BB-CLEAN-001" },
  });
  if (clean) {
    const sampleLead = JSON.parse(
      readFileSync(path.join(fixturesDir, "lead-sample.json"), "utf8"),
    ) as {
      externalLeadId: string;
      retailerId: string;
      agentId: string;
      callAt: string;
      crmFields: Prisma.InputJsonValue;
    };
    await prisma.lead.upsert({
      where: { externalLeadId: "BB-SAMPLE-001" },
      create: {
        externalLeadId: "BB-SAMPLE-001",
        retailerId: sampleLead.retailerId,
        agentId: "agent_sample",
        callAt: new Date(sampleLead.callAt),
        status: "PENDING",
        crmFields: sampleLead.crmFields,
      },
      update: {
        status: "PENDING",
        crmFields: sampleLead.crmFields,
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedChecks();
  await seedScenarioLeads();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
