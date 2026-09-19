"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Slice = { label: string; count: number };

type Summary = {
  firstPassYield: number | null;
  criticalFailRate: number | null;
  heldOpen: number;
  submittedCount: number;
  cancelledCount: number;
  inProgressCount: number;
  scoredLast7Days: number;
  heldRunsLast7Days: number;
  passCount: number;
  failCount: number;
  noteCount: number;
  lowConfCount: number;
  failingChecks: Array<{ code: string; count: number }>;
  dailyYield: Array<{
    date: string;
    yield: number;
    total: number;
    submitted: number;
    held: number;
  }>;
  repeatOffences: Array<{
    agentId: string;
    checkCode: string;
    count: number;
    latestAt: string;
  }>;
  leadStatusPie: Slice[];
  gatePie: Slice[];
  resultStatusPie: Slice[];
  checkTypePie: Slice[];
  agentVolume: Slice[];
  retailerVolume: Slice[];
  activityLogs: Array<{
    id: string;
    type: string;
    leadId: string | null;
    message: string;
    meta: unknown;
    createdAt: string;
  }>;
  alertTo: string;
};

const PALETTE = [
  "#3d9cf0",
  "#3ecf8e",
  "#f07178",
  "#e6b35a",
  "#a78bfa",
  "#22d3ee",
  "#fb923c",
  "#94a3b8",
];

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: "#3ecf8e",
  HELD: "#e6b35a",
  PENDING: "#94a3b8",
  TRANSCRIBED: "#3d9cf0",
  TRANSCRIBING: "#22d3ee",
  SCORING: "#3d9cf0",
  CANCELLED: "#64748b",
  FAILED: "#f07178",
  PASS: "#3ecf8e",
  FAIL: "#f07178",
  NOTE: "#a78bfa",
  LOW_CONFIDENCE: "#e6b35a",
};

function colorFor(label: string, i: number) {
  return STATUS_COLOR[label] || PALETTE[i % PALETTE.length];
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className="mt-3 text-4xl font-semibold tracking-tight"
        style={{ color: accent || "var(--text)" }}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Donut({
  slices,
  title,
  subtitle,
}: {
  slices: Slice[];
  title: string;
  subtitle?: string;
}) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  const size = 180;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs =
    total === 0
      ? []
      : slices.map((slice, i) => {
          const len = (slice.count / total) * c;
          const dash = `${len} ${c - len}`;
          const o = offset;
          offset += len;
          return { ...slice, dash, offset: o, color: colorFor(slice.label, i) };
        });

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="relative mx-auto">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#12181f"
              strokeWidth={stroke}
            />
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.dash}
                strokeDashoffset={-a.offset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="text-[10px] uppercase text-muted">total</span>
          </div>
        </div>
        <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
          {total === 0 && (
            <li className="text-muted">No data yet — score more leads.</li>
          )}
          {slices.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorFor(s.label, i) }}
                />
                {s.label}
              </span>
              <span className="font-mono text-xs text-muted">
                {s.count}
                {total ? ` · ${Math.round((s.count / total) * 100)}%` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HorizontalBars({
  items,
  title,
  subtitle,
  color = "#f07178",
}: {
  items: Array<{ label: string; count: number }>;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Nothing to show yet.</p>
        )}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-mono text-muted">{item.label}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#12181f]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldChart({
  points,
}: {
  points: Summary["dailyYield"];
}) {
  const w = 420;
  const h = 160;
  const pad = 24;
  const maxY = 100;
  const coords = points.map((p, i) => {
    const x =
      pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (p.yield / maxY) * (h - pad * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Daily first-pass yield
      </h2>
      <p className="mt-1 text-xs text-muted">% of scored runs gated SUBMITTED</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full text-accent">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = h - pad - (tick / maxY) * (h - pad * 2);
          return (
            <g key={tick}>
              <line
                x1={pad}
                x2={w - pad}
                y1={y}
                y2={y}
                stroke="#2c3848"
                strokeWidth="1"
              />
              <text
                x={8}
                y={y + 3}
                fill="#8b9aab"
                fontSize="9"
              >
                {tick}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="currentColor" opacity="0.12" />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          points={line}
        />
        {coords.map((c) => (
          <g key={c.date}>
            <circle cx={c.x} cy={c.y} r="4" fill="currentColor" />
            <text
              x={c.x}
              y={h - 6}
              textAnchor="middle"
              fill="#8b9aab"
              fontSize="9"
            >
              {c.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        {points.map((d) => (
          <span
            key={d.date}
            className="rounded-md bg-[#12181f] px-2 py-1 text-[11px] text-muted"
          >
            {d.date.slice(5)} · {d.yield}% · {d.total} run{d.total === 1 ? "" : "s"}
          </span>
        ))}
      </div>
    </div>
  );
}

function StackedDaily({ points }: { points: Summary["dailyYield"] }) {
  const max = Math.max(1, ...points.map((p) => p.total));
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Daily volume (held vs submitted)
      </h2>
      <p className="mt-1 text-xs text-muted">Score-run outcomes per day</p>
      <div className="mt-6 flex h-40 items-end gap-2">
        {points.map((d) => {
          const hTotal = (d.total / max) * 100;
          const hSub = d.total ? (d.submitted / d.total) * hTotal : 0;
          const hHeld = d.total ? (d.held / d.total) * hTotal : 0;
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${d.date}: ${d.submitted} submitted, ${d.held} held`}
            >
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t bg-[#12181f]"
                style={{ height: "100%" }}
              >
                <div className="mt-auto w-full" style={{ height: `${hTotal}%` }}>
                  <div
                    className="w-full bg-warn/80"
                    style={{ height: `${d.total ? (hHeld / hTotal) * 100 : 0}%` }}
                  />
                  <div
                    className="w-full bg-pass/80"
                    style={{ height: `${d.total ? (hSub / hTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-pass/80" /> Submitted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-warn/80" /> Held
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/analytics/summary");
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to load analytics");
        return;
      }
      setData(body as Summary);
    })();
  }, []);

  const failBars = useMemo(
    () =>
      (data?.failingChecks ?? []).map((f) => ({
        label: f.code,
        count: f.count,
      })),
    [data],
  );

  if (error) return <p className="text-fail">{error}</p>;
  if (!data) return <p className="text-muted">Loading analytics…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Last 7 days · live from Postgres ·{" "}
            <Link href="/queue" className="text-accent hover:underline">
              Held Queue
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-text"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="First-pass yield"
          value={data.firstPassYield == null ? "—" : `${data.firstPassYield}%`}
          hint={`${data.scoredLast7Days} scored runs`}
          accent="#3ecf8e"
        />
        <Kpi
          label="Critical fail rate"
          value={
            data.criticalFailRate == null ? "0%" : `${data.criticalFailRate}%`
          }
          hint={`${data.failCount} fail results`}
          accent="#f07178"
        />
        <Kpi
          label="Held open"
          value={String(data.heldOpen)}
          hint={`${data.heldRunsLast7Days} held gates (7d)`}
          accent="#e6b35a"
        />
        <Kpi
          label="Submitted"
          value={String(data.submittedCount)}
          hint={`${data.inProgressCount} in progress · ${data.cancelledCount} cancelled`}
          accent="#3d9cf0"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Donut
          slices={data.leadStatusPie}
          title="Lead status mix"
          subtitle="All leads in database"
        />
        <Donut
          slices={data.gatePie}
          title="Gate outcomes"
          subtitle="Score runs last 7 days"
        />
        <Donut
          slices={data.resultStatusPie}
          title="Check results"
          subtitle="PASS / FAIL / NOTE / LOW_CONF"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <YieldChart points={data.dailyYield} />
        <StackedDaily points={data.dailyYield} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBars
          items={failBars}
          title="Failing checks"
          subtitle="Most common FAIL codes (7 days)"
          color="#f07178"
        />
        <Donut
          slices={data.checkTypePie}
          title="Fail by check type"
          subtitle="Type A / B / C distribution of fails"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBars
          items={data.agentVolume}
          title="Agent volume"
          subtitle="Score runs by agent (7 days)"
          color="#3d9cf0"
        />
        <HorizontalBars
          items={data.retailerVolume}
          title="Retailer volume"
          subtitle="Score runs by retailer (7 days)"
          color="#a78bfa"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="PASS results" value={String(data.passCount)} accent="#3ecf8e" />
        <Kpi label="FAIL results" value={String(data.failCount)} accent="#f07178" />
        <Kpi label="NOTE results" value={String(data.noteCount)} accent="#a78bfa" />
        <Kpi
          label="Low confidence"
          value={String(data.lowConfCount)}
          accent="#e6b35a"
        />
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Processing &amp; email logs
            </h2>
            <p className="mt-1 text-xs text-muted">
              Auto critical alerts go to{" "}
              <span className="text-accent">{data.alertTo}</span> on HELD · also
              use <span className="text-text">Send alert email</span> on a lead
            </p>
          </div>
        </div>
        {data.activityLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No activity yet. Score a lead (especially a fail scenario) to populate
            this log.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-line bg-panel text-xs uppercase text-muted">
                <tr>
                  <th className="px-2 py-2">Timestamp</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.activityLogs.map((log) => (
                  <tr key={log.id} className="border-b border-line/50 align-top">
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`badge-pill text-[10px] ${
                          log.type.includes("EMAIL_ALERT_SENT")
                            ? "bg-pass/20 text-pass"
                            : log.type.includes("EMAIL_ALERT_SKIPPED")
                              ? "bg-accent/20 text-accent"
                              : log.type.includes("FAILED") ||
                                  log.type.includes("CANCEL")
                                ? "bg-fail/20 text-fail"
                                : log.type.includes("HELD") ||
                                    log.type.includes("EMAIL")
                                  ? "bg-warn/20 text-warn"
                                  : "bg-accent/20 text-accent"
                        }`}
                      >
                        {log.type}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-text">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.repeatOffences.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
            Repeat offences
          </h2>
          <p className="mb-4 text-xs text-muted">
            Same agent + critical check failed ≥2 times in 7 days
          </p>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Check</th>
                <th className="px-2 py-2">Count</th>
                <th className="px-2 py-2">Latest</th>
              </tr>
            </thead>
            <tbody>
              {data.repeatOffences.map((row) => (
                <tr
                  key={`${row.agentId}-${row.checkCode}`}
                  className="border-b border-line/60"
                >
                  <td className="px-2 py-2">{row.agentId}</td>
                  <td className="px-2 py-2 font-mono text-xs text-fail">
                    {row.checkCode}
                  </td>
                  <td className="px-2 py-2">{row.count}</td>
                  <td className="px-2 py-2 text-muted">
                    {new Date(row.latestAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
