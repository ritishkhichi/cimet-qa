import { prisma } from "@/lib/prisma";
import { resolveCheckVersion } from "@/server/checks/resolveVersion";
import { applyGate } from "@/server/gate/applyGate";
import { scoreWithLlm } from "@/server/scoring/gemini";
import { sendCriticalAlert } from "@/server/alerts/sendCriticalAlert";
import type { Utterance } from "@/types/transcript";
import type { LeadStatus, ScoreStatus } from "@prisma/client";

export async function runScore(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { transcript: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (!lead.transcript) throw new Error("Lead has no transcript — ingest first");

  if (lead.status === "PENDING" || lead.status === "TRANSCRIBING") {
    throw new Error(`Lead status ${lead.status} cannot be scored yet`);
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "SCORING" },
  });

  try {
    const version = await resolveCheckVersion(lead.retailerId, lead.callAt);
    const utterances = lead.transcript.utterances as Utterance[];

    const llmResults = await scoreWithLlm({
      checks: version.checks,
      utterances,
      crmFields: lead.crmFields,
      checkVersionId: version.id,
      callAt: lead.callAt.toISOString(),
    });

    const merged = version.checks.map((check) => {
      const hit = llmResults.find((r) => r.checkCode === check.code);
      const status: ScoreStatus = hit?.status ?? "LOW_CONFIDENCE";
      return {
        check,
        status,
        confidence: hit?.confidence ?? 0.3,
        evidenceText: hit?.evidenceText ?? null,
        startMs: hit?.startMs ?? null,
        endMs: hit?.endMs ?? null,
        reasoning:
          hit?.reasoning ??
          "Model did not return this check; marked low confidence.",
      };
    });

    const gateStatus = applyGate(
      merged.map((m) => ({ critical: m.check.critical, status: m.status })),
    );

    const run = await prisma.scoreRun.create({
      data: {
        leadId: lead.id,
        checkVersionId: version.id,
        gateStatus,
        finishedAt: new Date(),
        results: {
          create: merged.map((m) => ({
            checkDefinitionId: m.check.id,
            status: m.status,
            effectiveStatus: m.status,
            confidence: m.confidence,
            evidenceText: m.evidenceText,
            startMs: m.startMs,
            endMs: m.endMs,
            reasoning: m.reasoning,
          })),
        },
      },
      include: {
        results: { include: { checkDefinition: true, overrides: true } },
        checkVersion: true,
      },
    });

    const leadStatus: LeadStatus =
      gateStatus === "HELD" ? "HELD" : "SUBMITTED";

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: leadStatus },
    });

    const { logActivity } = await import("@/server/activity/logActivity");
    await logActivity({
      type: "SCORE_COMPLETED",
      leadId: lead.id,
      message: `Scored ${lead.externalLeadId} → gate ${gateStatus} (lead ${leadStatus})`,
      meta: {
        gateStatus,
        leadStatus,
        checkCount: merged.length,
        failCount: merged.filter((m) => m.status === "FAIL").length,
      },
    });

    const failingCodes = merged
      .filter(
        (m) =>
          m.check.critical &&
          (m.status === "FAIL" || m.status === "LOW_CONFIDENCE"),
      )
      .map((m) => m.check.code);

    // Auto email ONLY on HELD (issues). All-pass / SUBMITTED → skip log, no send.
    await sendCriticalAlert({
      leadExternalId: lead.externalLeadId,
      leadId: lead.id,
      agentId: lead.agentId,
      retailerId: lead.retailerId,
      failingCodes,
      gateStatus,
    }).catch((e) => console.error("[alert]", e));

    return { lead: updatedLead, scoreRun: run };
  } catch (err) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "FAILED" },
    });
    throw err;
  }
}
