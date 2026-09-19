import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { readFileSync } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function seedDemoLead() {
  "use server";
  const lead = JSON.parse(
    readFileSync(path.join(process.cwd(), "fixtures", "lead-sample.json"), "utf8"),
  ) as {
    externalLeadId: string;
    retailerId: string;
    agentId: string;
    callAt: string;
    crmFields: Prisma.InputJsonValue;
  };
  await prisma.lead.upsert({
    where: { externalLeadId: lead.externalLeadId },
    create: {
      externalLeadId: lead.externalLeadId,
      retailerId: lead.retailerId,
      agentId: lead.agentId,
      callAt: new Date(lead.callAt),
      status: "PENDING",
      crmFields: lead.crmFields,
    },
    update: {
      crmFields: lead.crmFields,
    },
  });
  redirect("/leads");
}

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted">
            Phase 1 — recording & transcript ingestion
          </p>
        </div>
        <form action={seedDemoLead}>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-[#041018]"
          >
            Seed demo lead
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Retailer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No leads yet. Click Seed demo lead.
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
                <td className="px-4 py-3 text-muted">{lead.agentId}</td>
                <td className="px-4 py-3 text-muted">{lead.retailerId}</td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-muted">
                  {lead.updatedAt.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
