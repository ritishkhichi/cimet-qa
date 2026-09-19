import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

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

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const lead =
      (await prisma.lead.findUnique({ where: { id } })) ??
      (await prisma.lead.findUnique({ where: { externalLeadId: id } }));
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id: lead.id } });

    const { logActivity } = await import("@/server/activity/logActivity");
    await logActivity({
      type: "LEAD_DELETED",
      leadId: null,
      message: `Deleted lead ${lead.externalLeadId}`,
      meta: { externalLeadId: lead.externalLeadId, id: lead.id },
    });

    return NextResponse.json({ ok: true, deleted: lead.externalLeadId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
