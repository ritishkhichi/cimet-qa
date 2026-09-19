import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IngestWorkspace } from "@/components/ingest/IngestWorkspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ leadId?: string }>;

export default async function IngestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      externalLeadId: true,
      agentId: true,
      retailerId: true,
      status: true,
    },
  });

  const selected =
    leads.find((l) => l.id === sp.leadId) ??
    leads.find((l) => l.externalLeadId === sp.leadId) ??
    leads[0] ??
    null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Ingest</h1>
        <p className="mt-1 text-sm text-muted">
          Upload audio, JSON, or PDF outside the lead ticket — then open the lead
          to Score.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="text-muted">
          No leads yet. Run <code className="text-accent">npm run db:seed</code>{" "}
          first.
        </p>
      ) : (
        <IngestWorkspace
          leads={leads}
          initialLeadId={selected?.id ?? leads[0].id}
        />
      )}

      <p className="text-xs text-muted">
        Sample audio (Deepgram STT):{" "}
        <a
          href="/fixtures/sample-call.wav"
          className="text-accent hover:underline"
          download
        >
          Download sample-call.wav
        </a>
        {" · "}
        Sample JSON:{" "}
        <Link href="/fixtures/sample-transcript.json" className="text-accent hover:underline">
          sample-transcript.json
        </Link>
      </p>
    </div>
  );
}
