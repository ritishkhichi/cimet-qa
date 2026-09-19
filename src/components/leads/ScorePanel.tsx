"use client";

import { Modal } from "@/components/Modal";
import {
  AudioTransport,
  EvidencePlayButton,
} from "@/components/leads/AudioTransport";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ResultRow = {
  id: string;
  status: string;
  effectiveStatus: string;
  confidence: number;
  evidenceText: string | null;
  startMs: number | null;
  reasoning: string;
  checkDefinition: {
    code: string;
    title: string;
    critical: boolean;
    type: string;
  };
  overrides: Array<{ id: string; reason: string; newStatus: string }>;
};

type Props = {
  leadId: string;
  leadStatus: string;
  checkVersionLabel?: string;
  gateStatus?: string;
  results: ResultRow[];
  canScore: boolean;
  audioSrc?: string | null;
};

function StatusIcon({ status }: { status: string }) {
  const base =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold";
  if (status === "PASS") {
    return <span className={`${base} bg-pass/20 text-pass`}>✓</span>;
  }
  if (status === "FAIL") {
    return <span className={`${base} bg-fail/20 text-fail`}>✕</span>;
  }
  if (status === "LOW_CONFIDENCE") {
    return <span className={`${base} bg-warn/20 text-warn`}>?</span>;
  }
  return <span className={`${base} bg-line text-muted`}>i</span>;
}

export function ScorePanel({
  leadId,
  leadStatus,
  checkVersionLabel,
  gateStatus,
  results,
  canScore,
  audioSrc,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<ResultRow | null>(null);
  const [reason, setReason] = useState("");
  const [newStatus, setNewStatus] = useState("PASS");

  async function score() {
    setBusy(true);
    setError(null);
    setAlertMsg(null);
    const res = await fetch(`/api/leads/${leadId}/score`, { method: "POST" });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "Score failed");
      return;
    }
    router.refresh();
  }

  async function submitSale() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/leads/${leadId}/submit`, { method: "POST" });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "Submit failed");
      return;
    }
    setError(null);
    router.refresh();
  }

  async function cancelSale() {
    setBusy(true);
    setError(null);
    await fetch(`/api/leads/${leadId}/cancel`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function sendAlert() {
    setBusy(true);
    setError(null);
    setAlertMsg(null);
    const res = await fetch(`/api/leads/${leadId}/alert`, { method: "POST" });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(
        [body.error, body.hint].filter(Boolean).join(" — ") ||
          "Failed to send alert email",
      );
      return;
    }
    setAlertMsg(body.message || `Alert sent to ${body.to}`);
    router.refresh();
  }

  function openOverride(row: ResultRow) {
    setOverrideTarget(row);
    setNewStatus(row.effectiveStatus === "PASS" ? "FAIL" : "PASS");
    setReason("");
    setError(null);
  }

  async function applyOverride() {
    if (!overrideTarget) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/scores/${overrideTarget.id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newStatus,
        reason: reason.trim().slice(0, 500),
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "Override failed");
      return;
    }
    setOverrideTarget(null);
    setReason("");
    router.refresh();
  }

  const canAct = leadStatus === "HELD" || results.length > 0;

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Scorecard
        </h2>
        {checkVersionLabel && (
          <span className="rounded bg-line px-2 py-0.5 text-xs text-muted">
            {checkVersionLabel}
          </span>
        )}
        {gateStatus && (
          <span className="rounded bg-line px-2 py-0.5 text-xs">
            Gate: {gateStatus}
          </span>
        )}
        <div className="ml-auto">
          <button
            type="button"
            disabled={busy || !canScore}
            onClick={() => void score()}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-[#041018] disabled:opacity-50"
          >
            {busy ? "Working…" : "Score"}
          </button>
        </div>
      </div>

      {error && !overrideTarget && (
        <p className="mb-3 text-sm text-fail">{error}</p>
      )}
      {alertMsg && <p className="mb-3 text-sm text-pass">{alertMsg}</p>}

      <AudioTransport audioSrc={audioSrc} />

      {results.length === 0 ? (
        <p className="text-sm text-muted">
          No score yet. Open a seeded demo lead or ingest a file, then Score (uses Groq).
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => {
            const showMismatch =
              r.effectiveStatus === "FAIL" ||
              r.effectiveStatus === "LOW_CONFIDENCE";
            return (
              <li
                key={r.id}
                className="rounded-lg border border-line/70 bg-[#12181f] px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusIcon status={r.effectiveStatus} />
                  <span className="font-medium">{r.checkDefinition.title}</span>
                  {r.checkDefinition.critical && (
                    <span className="badge-pill bg-fail/20 text-fail">critical</span>
                  )}
                  <span className="text-xs text-muted">
                    {r.checkDefinition.code} · conf{" "}
                    {(r.confidence * 100).toFixed(0)}%
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {r.startMs != null && audioSrc && (
                      <EvidencePlayButton
                        startMs={r.startMs}
                        audioSrc={audioSrc}
                      />
                    )}
                    <button
                      type="button"
                      className="text-xs text-accent hover:underline"
                      onClick={() => openOverride(r)}
                    >
                      Override
                    </button>
                  </div>
                </div>
                {showMismatch && (r.evidenceText || r.reasoning) && (
                  <p className="mt-2 inline-flex max-w-full items-start gap-1 rounded-md bg-fail/20 px-2 py-1 text-xs text-fail">
                    <span className="shrink-0 font-semibold">Mismatch</span>
                    <span className="text-fail/90">
                      {r.evidenceText
                        ? `“${r.evidenceText}”`
                        : r.reasoning}
                    </span>
                  </p>
                )}
                {!showMismatch && r.evidenceText && (
                  <p className="mt-1 text-xs text-muted">“{r.evidenceText}”</p>
                )}
                {r.overrides[0] && (
                  <p className="mt-1 text-xs text-warn">
                    Overridden → {r.overrides[0].newStatus}: {r.overrides[0].reason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            disabled={busy || results.length === 0}
            onClick={() => results[0] && openOverride(results[0])}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent disabled:opacity-50"
          >
            Override AI score
          </button>
          <button
            type="button"
            disabled={busy || leadStatus === "SUBMITTED"}
            onClick={() => void submitSale()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#041018] hover:brightness-110 disabled:opacity-50"
          >
            Approve submit
          </button>
          <button
            type="button"
            disabled={busy || leadStatus === "CANCELLED"}
            onClick={() => void cancelSale()}
            className="rounded-lg border border-fail/40 px-3 py-2 text-sm text-fail disabled:opacity-50"
          >
            Cancel sale
          </button>
          <button
            type="button"
            disabled={busy || results.length === 0 || gateStatus !== "HELD"}
            onClick={() => void sendAlert()}
            className="rounded-lg border border-warn/50 px-3 py-2 text-sm text-warn hover:border-warn disabled:opacity-50"
            title="Manual resend — auto email already fires on Score when gate is HELD"
          >
            Resend alert email
          </button>
        </div>
      )}

      <Modal
        open={!!overrideTarget}
        title="Override AI score"
        onClose={() => {
          if (!busy) setOverrideTarget(null);
        }}
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOverrideTarget(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyOverride()}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-[#041018] disabled:opacity-50"
            >
              Confirm override
            </button>
          </>
        }
      >
        {overrideTarget && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Check</p>
              <p className="mt-0.5 font-medium">{overrideTarget.checkDefinition.title}</p>
              <p className="text-xs text-muted">{overrideTarget.checkDefinition.code}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Original status
                </p>
                <span className="mt-1 inline-block">
                  <StatusIcon status={overrideTarget.effectiveStatus} />
                  <span className="ml-2 align-middle">
                    {overrideTarget.effectiveStatus}
                  </span>
                </span>
              </div>
              <div className="flex-1">
                <label className="text-xs uppercase tracking-wide text-muted">
                  New status
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-line bg-[#12181f] px-2.5 py-2 text-sm text-text"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="NOTE">NOTE</option>
                    <option value="LOW_CONFIDENCE">LOW_CONFIDENCE</option>
                  </select>
                </label>
              </div>
            </div>
            <label className="block text-xs uppercase tracking-wide text-muted">
              Reason (optional)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                placeholder="Optional note for the audit log"
                className="mt-1 w-full rounded-lg border border-line bg-[#12181f] px-3 py-2 text-sm font-sans text-text outline-none focus:border-accent"
                rows={3}
                maxLength={500}
              />
              <span className="mt-1 block normal-case tracking-normal text-muted">
                {reason.length}/500
              </span>
            </label>
            <p className="text-xs text-muted">
              Overriding as{" "}
              <span className="text-text">
                {session?.user?.name || session?.user?.email || "current user"}
              </span>
            </p>
            {error && <p className="text-sm text-fail">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
