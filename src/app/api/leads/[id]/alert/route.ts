import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { sendCriticalAlert } from "@/server/alerts/sendCriticalAlert";

type Params = { params: Promise<{ id: string }> };

/** Manual / resend critical alert email for a HELD (or scored) lead */
export async function POST(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        scoreRuns: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            results: {
              include: { checkDefinition: true },
            },
          },
        },
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const latest = lead.scoreRuns[0];
    const failingCodes =
      latest?.results
        .filter(
          (r) =>
            r.checkDefinition.critical &&
            (r.effectiveStatus === "FAIL" ||
              r.effectiveStatus === "LOW_CONFIDENCE"),
        )
        .map((r) => r.checkDefinition.code) ?? [];

    const result = await sendCriticalAlert({
      leadExternalId: lead.externalLeadId,
      leadId: lead.id,
      agentId: lead.agentId,
      retailerId: lead.retailerId,
      failingCodes,
      gateStatus: latest?.gateStatus ?? lead.status,
      manual: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || "Email send failed",
          channel: result.channel,
          to: result.to,
          hint:
            "Set SMTP_USER + SMTP_PASS (Gmail App Password) in .env, or RESEND_API_KEY, or confirm FormSubmit’s first activation email in the inbox.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      to: result.to,
      channel: result.channel,
      message:
        result.channel === "skipped"
          ? `Skipped — no issues (gate not HELD)`
          : `Alert sent to ${result.to} via ${result.channel}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Alert failed";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
