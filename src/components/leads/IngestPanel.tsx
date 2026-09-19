"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  leadId: string;
  externalLeadId: string;
};

export function IngestPanel({ leadId, externalLeadId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"audio" | "transcript">("transcript");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onAudio(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("leadId", leadId);
      form.set("audio", file);
      const res = await fetch("/api/recordings", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload failed");
      setMessage("Audio transcribed via Deepgram and saved on lead.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onTranscriptFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as {
        utterances?: Array<{
          speaker: string;
          text: string;
          startMs?: number | null;
          endMs?: number | null;
        }>;
        externalLeadId?: string;
      };
      if (!json.utterances?.length) {
        throw new Error("JSON must include an utterances array");
      }
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          externalLeadId: json.externalLeadId ?? externalLeadId,
          utterances: json.utterances,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload failed");
      setMessage(`Transcript saved (${body.transcript?.utteranceCount ?? 0} turns).`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function ingestFixture() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const fixtureRes = await fetch("/fixtures/sample-transcript.json");
      if (!fixtureRes.ok) {
        // fall back: load via API seed path by posting known fixture from public
        throw new Error(
          "Put fixtures/sample-transcript.json under public/fixtures or use file upload",
        );
      }
      const json = await fixtureRes.json();
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          externalLeadId: json.externalLeadId ?? externalLeadId,
          utterances: json.utterances,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Ingest failed");
      setMessage(`Fixture ingested (${body.transcript?.utteranceCount ?? 0} turns).`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Ingest
      </h2>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("transcript")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "transcript" ? "bg-accent text-[#041018]" : "border border-line"}`}
        >
          Upload transcript
        </button>
        <button
          type="button"
          onClick={() => setMode("audio")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "audio" ? "bg-accent text-[#041018]" : "border border-line"}`}
        >
          Upload audio (STT)
        </button>
      </div>

      {mode === "transcript" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Option B — JSON with utterances (speaker, text, optional startMs/endMs). Uses no
            Deepgram credits.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => onTranscriptFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-text"
          />
          <button
            type="button"
            disabled={busy}
            onClick={ingestFixture}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
          >
            Ingest CIMET sample fixture
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Option A — calls Deepgram (uses credits). Prefer a short test file.
          </p>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a"
            disabled={busy}
            onChange={(e) => onAudio(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-text"
          />
        </div>
      )}

      {busy && <p className="mt-3 text-sm text-accent">Working…</p>}
      {message && <p className="mt-3 text-sm text-pass">{message}</p>}
      {error && <p className="mt-3 text-sm text-fail">{error}</p>}
    </div>
  );
}
