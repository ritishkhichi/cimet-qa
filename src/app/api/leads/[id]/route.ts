import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const lead =
    (await prisma.lead.findUnique({
      where: { id },
      include: {
        transcript: true,
        recordings: { orderBy: { createdAt: "desc" } },
      },
    })) ??
    (await prisma.lead.findUnique({
      where: { externalLeadId: id },
      include: {
        transcript: true,
        recordings: { orderBy: { createdAt: "desc" } },
      },
    }));

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}
