import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [
    heldOpen,
    submittedCount,
    cancelledCount,
    pendingish,
    allLeads,
    scoredRuns,
    allResults,
    recentCritical,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "HELD" } }),
    prisma.lead.count({ where: { status: "SUBMITTED" } }),
    prisma.lead.count({ where: { status: "CANCELLED" } }),
    prisma.lead.count({
      where: {
        status: { in: ["PENDING", "TRANSCRIBED", "TRANSCRIBING", "SCORING", "FAILED"] },
      },
    }),
    prisma.lead.findMany({
      select: { status: true, agentId: true, retailerId: true },
    }),
    prisma.scoreRun.findMany({
      where: { startedAt: { gte: since } },
      select: {
        gateStatus: true,
        startedAt: true,
        leadId: true,
        lead: { select: { agentId: true, retailerId: true } },
      },
    }),
    prisma.scoreResult.findMany({
      where: { scoreRun: { startedAt: { gte: since } } },
      include: {
        checkDefinition: {
          select: { code: true, critical: true, type: true, title: true },
        },
      },
    }),
    prisma.scoreResult.findMany({
      where: {
        effectiveStatus: "FAIL",
        checkDefinition: { critical: true },
        scoreRun: { startedAt: { gte: since } },
      },
      include: {
        checkDefinition: { select: { code: true } },
        scoreRun: {
          select: {
            startedAt: true,
            lead: { select: { agentId: true } },
          },
        },
      },
    }),
  ]);

  const totalScored = scoredRuns.length;
  const firstPass = scoredRuns.filter((r) => r.gateStatus === "SUBMITTED").length;
  const heldRuns = scoredRuns.filter((r) => r.gateStatus === "HELD").length;
  const firstPassYield =
    totalScored === 0 ? null : Math.round((firstPass / totalScored) * 1000) / 10;

  const failResults = allResults.filter((r) => r.effectiveStatus === "FAIL");
  const criticalFails = failResults.filter((r) => r.checkDefinition.critical).length;
  const criticalFailRate =
    failResults.length === 0
      ? null
      : Math.round((criticalFails / Math.max(failResults.length, 1)) * 1000) / 10;

  const failingChecks = countBy(failResults, (r) => r.checkDefinition.code)
    .map((x) => ({ code: x.label, count: x.count }))
    .slice(0, 12);

  const byDay = new Map<
    string,
    { submitted: number; held: number; total: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(dayKey(d), { submitted: 0, held: 0, total: 0 });
  }
  for (const run of scoredRuns) {
    const key = dayKey(run.startedAt);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (run.gateStatus === "SUBMITTED") bucket.submitted += 1;
    if (run.gateStatus === "HELD") bucket.held += 1;
  }
  const dailyYield = Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    yield: v.total === 0 ? 0 : Math.round((v.submitted / v.total) * 1000) / 10,
    total: v.total,
    submitted: v.submitted,
    held: v.held,
  }));

  const offenceMap = new Map<
    string,
    { agentId: string; checkCode: string; count: number; latestAt: Date }
  >();
  for (const r of recentCritical) {
    const agentId = r.scoreRun.lead.agentId;
    const checkCode = r.checkDefinition.code;
    const key = `${agentId}::${checkCode}`;
    const existing = offenceMap.get(key);
    if (existing) {
      existing.count += 1;
      if (r.scoreRun.startedAt > existing.latestAt) {
        existing.latestAt = r.scoreRun.startedAt;
      }
    } else {
      offenceMap.set(key, {
        agentId,
        checkCode,
        count: 1,
        latestAt: r.scoreRun.startedAt,
      });
    }
  }
  const repeatOffences = Array.from(offenceMap.values())
    .filter((o) => o.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((o) => ({
      agentId: o.agentId,
      checkCode: o.checkCode,
      count: o.count,
      latestAt: o.latestAt.toISOString(),
    }));

  const leadStatusPie = countBy(allLeads, (l) => l.status);
  const gatePie = [
    { label: "SUBMITTED", count: firstPass },
    { label: "HELD", count: heldRuns },
  ].filter((x) => x.count > 0);
  const resultStatusPie = countBy(allResults, (r) => r.effectiveStatus);
  const checkTypePie = countBy(failResults, (r) => r.checkDefinition.type).map(
    (x) => ({
      label:
        x.label === "A_VERBATIM"
          ? "Type A"
          : x.label === "B_FACTUAL"
            ? "Type B"
            : x.label === "C_BEHAVIOUR"
              ? "Type C"
              : x.label,
      count: x.count,
    }),
  );

  const agentVolume = countBy(scoredRuns, (r) => r.lead.agentId).slice(0, 8);
  const retailerVolume = countBy(scoredRuns, (r) => r.lead.retailerId).slice(0, 6);

  const passCount = allResults.filter((r) => r.effectiveStatus === "PASS").length;
  const noteCount = allResults.filter((r) => r.effectiveStatus === "NOTE").length;
  const lowConfCount = allResults.filter(
    (r) => r.effectiveStatus === "LOW_CONFIDENCE",
  ).length;

  const activityLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return NextResponse.json({
    firstPassYield,
    criticalFailRate,
    heldOpen,
    submittedCount,
    cancelledCount,
    inProgressCount: pendingish,
    scoredLast7Days: totalScored,
    heldRunsLast7Days: heldRuns,
    passCount,
    failCount: failResults.length,
    noteCount,
    lowConfCount,
    failingChecks,
    dailyYield,
    repeatOffences,
    leadStatusPie,
    gatePie,
    resultStatusPie,
    checkTypePie,
    agentVolume,
    retailerVolume,
    activityLogs: activityLogs.map((l) => ({
      id: l.id,
      type: l.type,
      leadId: l.leadId,
      message: l.message,
      meta: l.meta,
      createdAt: l.createdAt.toISOString(),
    })),
    alertTo: process.env.ALERT_TO_EMAIL?.trim() || "ritish143khichi@gmail.com",
  });
}
