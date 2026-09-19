import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAge } from "@/lib/format";
import { HeldQueueFilters } from "@/components/queue/HeldQueueFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ agent?: string; reason?: string }>;

export default async function HeldQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const agentFilter = sp.agent?.trim() || "";
  const reasonFilter = sp.reason?.trim() || "";

  const leads = await prisma.lead.findMany({
    where: {
      status: "HELD",
      ...(agentFilter ? { agentId: { contains: agentFilter, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      scoreRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          results: {
            where: {
              OR: [
                { effectiveStatus: "FAIL" },
                { effectiveStatus: "LOW_CONFIDENCE" },
              ],
            },
            include: { checkDefinition: true },
          },
        },
      },
    },
  });

  const rows = leads
    .map((lead) => {
      const results = lead.scoreRuns[0]?.results ?? [];
      const criticalFails = results.filter(
        (r) => r.checkDefinition.critical && r.effectiveStatus === "FAIL",
      );
      const lowConf = results.filter((r) => r.effectiveStatus === "LOW_CONFIDENCE");
      const failChips = results
        .filter((r) => r.effectiveStatus === "FAIL")
        .map((r) => r.checkDefinition.code);
      const reasons: string[] = [];
      if (criticalFails.length) reasons.push(`${criticalFails.length} critical`);
      if (lowConf.length) reasons.push(`${lowConf.length} low-conf`);
      const reasonLabel = reasons.join(" · ") || "Held";
      return {
        lead,
        reasonLabel,
        failChips,
        criticalCount: criticalFails.length,
        lowConfCount: lowConf.length,
      };
    })
    .filter((row) => {
      if (!reasonFilter) return true;
      if (reasonFilter === "critical") return row.criticalCount > 0;
      if (reasonFilter === "low-conf") return row.lowConfCount > 0;
      return true;
    });

  const agents = Array.from(new Set(leads.map((l) => l.agentId))).sort();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Held Queue</h1>
        <span className="badge-pill bg-warn/20 text-warn">{rows.length}</span>
      </div>
      <p className="mb-6 text-sm text-muted">
        Critical fails or low-confidence scores awaiting TL review
      </p>

      <HeldQueueFilters agents={agents} />

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Lead ID</th>
              <th className="px-4 py-3">Retailer</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Failed checks</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No held sales right now.
                </td>
              </tr>
            )}
            {rows.map(({ lead, reasonLabel, failChips }) => (
              <tr key={lead.id} className="border-b border-line/70 hover:bg-[#12181f]">
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {lead.externalLeadId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{lead.retailerId}</td>
                <td className="px-4 py-3 text-muted">{lead.agentId}</td>
                <td className="px-4 py-3 text-xs text-warn">{reasonLabel}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {failChips.length === 0 && (
                      <span className="text-muted">—</span>
                    )}
                    {failChips.map((code) => (
                      <span
                        key={code}
                        className="badge-pill bg-fail/20 text-fail"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted" title={lead.updatedAt.toLocaleString()}>
                  {formatAge(lead.updatedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="inline-flex rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#041018]"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
