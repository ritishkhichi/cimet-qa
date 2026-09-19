import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadsToolbar } from "@/components/leads/LeadsToolbar";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { formatRelative } from "@/lib/format";
import { LeadStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type SearchParams = Promise<{
  status?: string;
  retailer?: string;
  q?: string;
  page?: string;
}>;

function campaignFromCrm(crm: unknown): string {
  if (!crm || typeof crm !== "object") return "—";
  const c = (crm as Record<string, unknown>).campaign;
  if (typeof c === "string" && c.trim()) return c;
  return "—";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = sp.status?.trim() || "";
  const retailer = sp.retailer?.trim() || "";
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page || "1") || 1);

  const where: Prisma.LeadWhereInput = {};
  if (status && Object.values(LeadStatus).includes(status as LeadStatus)) {
    where.status = status as LeadStatus;
  }
  if (retailer) where.retailerId = retailer;
  if (q) {
    where.OR = [
      { externalLeadId: { contains: q, mode: "insensitive" } },
      { agentId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, leads, retailerRows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.findMany({
      distinct: ["retailerId"],
      select: { retailerId: true },
      orderBy: { retailerId: "asc" },
    }),
  ]);

  const retailers = retailerRows.map((r) => r.retailerId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (retailer) next.set("retailer", retailer);
    if (q) next.set("q", q);
    next.set("page", String(p));
    return `/leads?${next.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted">
            Review sales before submit · {total} match{total === 1 ? "" : "es"}
          </p>
        </div>
        <Link
          href="/ingest"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#041018]"
        >
          Go to Ingest
        </Link>
      </div>

      <Suspense fallback={null}>
        <LeadsToolbar retailers={retailers} />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Lead ID</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Retailer</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No leads match. Clear filters or run npm run db:seed.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-line/70 hover:bg-[#12181f]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {lead.externalLeadId}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{lead.agentId}</div>
                  <div className="text-xs text-muted">
                    {lead.agentId}@cimet.local
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{lead.retailerId}</div>
                  <div className="text-xs text-muted">provider checklist</div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {campaignFromCrm(lead.crmFields)}
                </td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-muted">
                  <div title={lead.updatedAt.toLocaleString()}>
                    {formatRelative(lead.updatedAt)}
                  </div>
                  <div className="text-xs opacity-60">
                    {lead.updatedAt.toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <DeleteLeadButton
                    leadId={lead.id}
                    externalLeadId={lead.externalLeadId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total} leads
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-line px-3 py-1.5 hover:border-accent hover:text-text"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-line/50 px-3 py-1.5 opacity-40">
                Previous
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-line px-3 py-1.5 hover:border-accent hover:text-text"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-line/50 px-3 py-1.5 opacity-40">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
