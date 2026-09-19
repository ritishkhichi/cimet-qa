import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { logActivity } from "@/server/activity/logActivity";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const updated = await prisma.lead.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await logActivity({
      type: "SALE_CANCELLED",
      leadId: id,
      message: `Cancel sale by ${session.user.name || session.user.email} → ${updated.externalLeadId}`,
      meta: { userId: session.user.id },
    });
    return NextResponse.json({ lead: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cancel failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
