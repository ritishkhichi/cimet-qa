import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import {
  applyGate,
  effectiveStatusesForGate,
} from "@/server/gate/applyGate";
import { ScoreStatus } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  newStatus: z.enum(["PASS", "FAIL", "NOTE", "LOW_CONFIDENCE"]),
  reason: z.string().max(500).optional().default(""),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const result = await prisma.scoreResult.findUnique({
      where: { id },
      include: {
        checkDefinition: true,
        scoreRun: { include: { results: { include: { checkDefinition: true } } } },
      },
    });
    if (!result) {
      return NextResponse.json({ error: "Score result not found" }, { status: 404 });
    }

    await prisma.override.create({
      data: {
        scoreResultId: result.id,
        originalStatus: result.effectiveStatus,
        newStatus: body.newStatus as ScoreStatus,
        reason: body.reason?.trim() || "No reason provided",
        overridingUserId: session.user.id,
      },
    });

    await prisma.scoreResult.update({
      where: { id: result.id },
      data: { effectiveStatus: body.newStatus as ScoreStatus },
    });

    const refreshed = await prisma.scoreResult.findMany({
      where: { scoreRunId: result.scoreRunId },
      include: { checkDefinition: true },
    });

    const gateStatus = applyGate(
      effectiveStatusesForGate(
        refreshed.map((r) => ({
          critical: r.checkDefinition.critical,
          status: r.status,
          effectiveStatus: r.effectiveStatus,
        })),
      ),
    );

    await prisma.scoreRun.update({
      where: { id: result.scoreRunId },
      data: { gateStatus },
    });

    await prisma.lead.update({
      where: { id: result.scoreRun.leadId },
      data: { status: gateStatus === "HELD" ? "HELD" : "SUBMITTED" },
    });

    const { logActivity } = await import("@/server/activity/logActivity");
    await logActivity({
      type: "OVERRIDE",
      leadId: result.scoreRun.leadId,
      message: `Override ${result.checkDefinition.code}: ${result.effectiveStatus} → ${body.newStatus} (gate now ${gateStatus})`,
      meta: {
        scoreResultId: result.id,
        newStatus: body.newStatus,
        reason: body.reason?.trim() || "No reason provided",
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, gateStatus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Override failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
