import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { IngestPanel } from "@/components/leads/IngestPanel";
import { TranscriptPanel } from "@/components/leads/TranscriptPanel";
import type { Utterance } from "@/types/transcript";
import type { CrmFields } from "@/types/transcript";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const lead =
    (await prisma.lead.findUnique({
      where: { id },
      include: {
        transcript: true,
        recordings: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })) ??
    (await prisma.lead.findUnique({
      where: { externalLeadId: id },
      include: {
        transcript: true,
        recordings: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }));

  if (!lead) notFound();

  const crm = (lead.crmFields ?? {}) as CrmFields;
  const utterances = (lead.transcript?.utterances ?? []) as Utterance[];
  const recording = lead.recordings[0];
  const audioSrc = recording ? `/api/recordings/${recording.id}/file` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Lead {lead.externalLeadId}
          </h1>
          <p className="text-sm text-muted">
            {lead.retailerId} · {lead.agentId} · call{" "}
            {lead.callAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            CRM snapshot
          </h2>
          <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
            {Object.entries(crm).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="font-mono text-text">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <IngestPanel leadId={lead.id} externalLeadId={lead.externalLeadId} />
      </div>

      <TranscriptPanel
        utterances={utterances}
        audioSrc={audioSrc}
        cardDataDetected={lead.transcript?.cardDataDetected}
        source={lead.transcript?.source}
      />
    </div>
  );
}
