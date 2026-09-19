"use client";

import { IngestPanel } from "@/components/leads/IngestPanel";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LeadOpt = {
  id: string;
  externalLeadId: string;
  agentId: string;
  retailerId: string;
  status: string;
};

export function IngestWorkspace({
  leads,
  initialLeadId,
}: {
  leads: LeadOpt[];
  initialLeadId: string;
}) {
  const router = useRouter();
  const selected = leads.find((l) => l.id === initialLeadId) ?? leads[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border border-line bg-panel p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Target lead
        </p>
        <ul className="max-h-[420px] space-y-1 overflow-y-auto">
          {leads.map((l) => {
            const active = l.id === selected.id;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/ingest?leadId=${l.id}`)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-accent/15 text-text ring-1 ring-accent/40"
                      : "text-muted hover:bg-[#12181f] hover:text-text"
                  }`}
                >
                  <div className="font-medium text-accent">{l.externalLeadId}</div>
                  <div className="text-xs opacity-80">
                    {l.agentId} · {l.retailerId}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
          <div>
            <p className="text-sm text-muted">Uploading into</p>
            <p className="text-lg font-semibold">{selected.externalLeadId}</p>
          </div>
          <div className="flex items-center gap-3">
            <LeadStatusBadge status={selected.status} />
            <Link
              href={`/leads/${selected.id}`}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-accent hover:border-accent"
            >
              Open lead →
            </Link>
          </div>
        </div>

        <IngestPanel
          leadId={selected.id}
          externalLeadId={selected.externalLeadId}
        />
      </div>
    </div>
  );
}
