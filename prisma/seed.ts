import { Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
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

  console.log(`Seeded lead ${row.externalLeadId} (${row.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
