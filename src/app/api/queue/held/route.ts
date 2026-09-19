import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireSession();
    const leads = await prisma.lead.findMany({
      where: { status: "HELD" },
      orderBy: { updatedAt: "desc" },
      include: {
        scoreRuns: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            results: {
              where: {
                OR: [
                  { effectiveStatus: "FAIL" },
                  { effectiveStatus: "LOW_CONFIDENCE" },
                ],
              },
              include: { checkDefinition: true },
            },
          },
        },
      },
    });
    return NextResponse.json({ leads });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
