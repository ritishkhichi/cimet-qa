import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import path from "path";

export async function POST() {
  const leadPath = path.join(process.cwd(), "fixtures", "lead-sample.json");
  const lead = JSON.parse(readFileSync(leadPath, "utf8")) as {
    externalLeadId: string;
    retailerId: string;
    agentId: string;
    callAt: string;
    crmFields: Prisma.InputJsonValue;
  };

  const row = await prisma.lead.upsert({
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
      retailerId: lead.retailerId,
      agentId: lead.agentId,
      callAt: new Date(lead.callAt),
      crmFields: lead.crmFields,
    },
  });

  return NextResponse.json({ lead: row });
}
