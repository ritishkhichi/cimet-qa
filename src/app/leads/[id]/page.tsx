import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { TranscriptPanel } from "@/components/leads/TranscriptPanel";
import { ScorePanel } from "@/components/leads/ScorePanel";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { humanizeLabel } from "@/lib/format";
import type { Utterance, CrmFields } from "@/types/transcript";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const leadInclude = {
  transcript: true,
  recordings: { orderBy: { createdAt: "desc" as const }, take: 1 },
  scoreRuns: {
    orderBy: { startedAt: "desc" as const },
    take: 1,
    include: {
      checkVersion: true,
      results: {
        include: {
          checkDefinition: true,
          overrides: { orderBy: { createdAt: "desc" as const }, take: 1 },
        },
      },
    },
  },
};

const HIDDEN_CRM = new Set(["scenarioTitle", "expectGate"]);

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const lead =
    (await prisma.lead.findUnique({
      where: { id },
      include: leadInclude,
    })) ??
    (await prisma.lead.findUnique({
      where: { externalLeadId: id },
      include: leadInclude,
    }));

  if (!lead) notFound();

  const crm = (lead.crmFields ?? {}) as CrmFields;
  const utterances = (lead.transcript?.utterances ?? []) as Utterance[];
  const recording = lead.recordings[0];
  const audioSrc = recording ? `/api/recordings/${recording.id}/file` : null;
  const latest = lead.scoreRuns[0];
  const canScore = !!lead.transcript && lead.status !== "TRANSCRIBING";

  const heldFails =
    latest?.results.filter(
      (r) =>
        r.checkDefinition.critical &&
        (r.effectiveStatus === "FAIL" || r.effectiveStatus === "LOW_CONFIDENCE"),
    ) ?? [];
  const lowConf =
    latest?.results.filter((r) => r.effectiveStatus === "LOW_CONFIDENCE") ?? [];

  let heldReason = "Awaiting TL review";
  if (heldFails.length && lowConf.length) {
    heldReason = `${heldFails.length} critical issue(s) and low-confidence scores`;
  } else if (heldFails.length) {
    heldReason = `${heldFails.length} critical check(s) failed`;
  } else if (lowConf.length) {
    heldReason = `${lowConf.length} low-confidence score(s)`;
  }

  const crmEntries = Object.entries(crm).filter(([k]) => !HIDDEN_CRM.has(k));

  return (
    <div className="space-y-6">
      {lead.status === "HELD" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/20 px-4 py-3">
          <span className="badge-pill bg-warn/30 text-warn">HELD</span>
          <div>
            <p className="text-sm font-semibold text-warn">Sale held for QA review</p>
            <p className="text-xs text-muted">{heldReason}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Lead {lead.externalLeadId}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {lead.retailerId} · {lead.agentId} · call{" "}
            {lead.callAt.toISOString().slice(0, 10)}
          </p>
          {typeof crm.scenarioTitle === "string" && crm.scenarioTitle && (
            <p className="mt-2 text-base text-accent/90">{crm.scenarioTitle}</p>
          )}
          {typeof crm.expectGate === "string" && crm.expectGate && (
            <p className="text-sm text-muted">Expected: {crm.expectGate}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <LeadStatusBadge status={lead.status} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DeleteLeadButton
              leadId={lead.id}
              externalLeadId={lead.externalLeadId}
              redirectToList
            />
            <Link
              href={`/ingest?leadId=${lead.id}`}
              className="text-sm text-accent hover:underline"
            >
              Upload on Ingest page →
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          CRM snapshot
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {crmEntries.map(([k, v]) => (
            <div key={k} className="flex gap-3 text-sm">
              <dt className="w-36 shrink-0 text-[11px] font-semibold tracking-wide text-muted">
                {humanizeLabel(k)}
              </dt>
              <dd className="min-w-0 break-words font-mono text-text">
                {String(v)}
              </dd>
            </div>
          ))}
          {crmEntries.length === 0 && (
            <p className="text-muted">No CRM fields</p>
          )}
        </dl>
      </div>

      <ScorePanel
        leadId={lead.id}
        leadStatus={lead.status}
        checkVersionLabel={latest?.checkVersion.label}
        gateStatus={latest?.gateStatus}
        canScore={canScore}
        audioSrc={audioSrc}
        results={(latest?.results ?? []).map((r) => ({
          id: r.id,
          status: r.status,
          effectiveStatus: r.effectiveStatus,
          confidence: r.confidence,
          evidenceText: r.evidenceText,
          startMs: r.startMs,
          reasoning: r.reasoning,
          checkDefinition: {
            code: r.checkDefinition.code,
            title: r.checkDefinition.title,
            critical: r.checkDefinition.critical,
            type: r.checkDefinition.type,
          },
          overrides: r.overrides.map((o) => ({
            id: o.id,
            reason: o.reason,
            newStatus: o.newStatus,
          })),
        }))}
      />

      <TranscriptPanel
        utterances={utterances}
        audioSrc={audioSrc}
        cardDataDetected={lead.transcript?.cardDataDetected}
        source={lead.transcript?.source}
      />
    </div>
  );
}
