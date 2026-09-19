import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      transcript: { select: { id: true, source: true, cardDataDetected: true } },
      recordings: { select: { id: true }, take: 1 },
    },
  });
  return NextResponse.json({ leads });
}
