import { prisma } from "@/lib/prisma";

export async function resolveCheckVersion(retailerId: string, callAt: Date) {
  const version = await prisma.checkVersion.findFirst({
    where: {
      retailerId,
      effectiveFrom: { lte: callAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: callAt } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: { checks: true },
  });

  if (!version) {
    throw new Error(
      `No check library version found for retailer ${retailerId} on ${callAt.toISOString()}`,
    );
  }

  return version;
}
