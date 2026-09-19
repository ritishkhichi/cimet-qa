import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { logActivity } from "@/server/activity/logActivity";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        scoreRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled sales cannot be submitted" },
        { status: 400 },
      );
    }

    const latest = lead.scoreRuns[0];
    if (latest) {
      await prisma.scoreRun.update({
        where: { id: latest.id },
        data: { gateStatus: "SUBMITTED" },
      });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    await logActivity({
      type: "SUBMIT_APPROVED",
      leadId: id,
      message: `Approve submit by ${session.user.name || session.user.email} → ${lead.externalLeadId} SUBMITTED`,
      meta: { userId: session.user.id },
    });

    return NextResponse.json({
      lead: updated,
      message: "Sale approved and submitted",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
