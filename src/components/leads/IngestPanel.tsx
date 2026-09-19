"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  leadId: string;
  externalLeadId: string;
};

function isPdfFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    file.type === "application/pdf" ||
    file.type === "application/x-pdf"
  );
}

function isJsonFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".json") ||
    file.type === "application/json" ||
    file.type === "text/json"
  );
}

export function IngestPanel({ leadId, externalLeadId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"audio" | "transcript">("transcript");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onAudio(upload: File) {
    const form = new FormData();
    form.set("leadId", leadId);
    form.set("audio", upload);
    const res = await fetch("/api/recordings", { method: "POST", body: form });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Upload failed");
    setMessage("Audio transcribed via Deepgram and saved on lead.");
  }

  async function onTranscriptJson(upload: File) {
    const text = await upload.text();
    let json: {
      utterances?: Array<{
        speaker: string;
        text: string;
        startMs?: number | null;
        endMs?: number | null;
      }>;
      externalLeadId?: string;
    };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        'Invalid JSON. Expect { "utterances": [{ "speaker", "text", "startMs?" }] }.',
      );
    }
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
    setMessage(`JSON transcript saved (${body.transcript?.utteranceCount ?? 0} turns).`);
  }

  async function onTranscriptPdf(upload: File) {
    const form = new FormData();
    form.set("leadId", leadId);
    form.set("externalLeadId", externalLeadId);
    form.set("pdf", upload);
    const res = await fetch("/api/transcripts/from-pdf", {
      method: "POST",
      body: form,
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "PDF ingest failed");
    setMessage(
      `PDF converted to transcript (${body.transcript?.utteranceCount ?? 0} turns) via Groq.`,
    );
  }

  async function onTranscriptFile(upload: File) {
    if (isPdfFile(upload)) {
      await onTranscriptPdf(upload);
      return;
    }
    if (isJsonFile(upload) || upload.type.startsWith("text/")) {
      await onTranscriptJson(upload);
      return;
    }
    const head = (await upload.slice(0, 8).text()).trimStart();
    if (head.startsWith("%PDF")) {
      await onTranscriptPdf(upload);
      return;
    }
    if (head.startsWith("{") || head.startsWith("[")) {
      await onTranscriptJson(upload);
      return;
    }
    throw new Error(
      "Unsupported file. Transcript mode accepts .json or .pdf only.",
    );
  }

  async function start() {
    if (!file) {
      setError("Choose a file first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "audio") await onAudio(file);
      else await onTranscriptFile(file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Ingest
      </h2>

      <fieldset className="mb-4 space-y-2">
        <legend className="sr-only">Ingest mode</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="ingest-mode"
            checked={mode === "audio"}
            onChange={() => {
              setMode("audio");
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="mt-1 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Upload audio (STT)</span>
            <span className="mt-0.5 block text-xs text-muted">
              Accepts: .mp3, .wav, .m4a, audio/* → Deepgram
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="ingest-mode"
            checked={mode === "transcript"}
            onChange={() => {
              setMode("transcript");
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="mt-1 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Upload transcript (direct)</span>
            <span className="mt-0.5 block text-xs text-muted">
              Accepts: .json (utterances) or .pdf (Groq converts to turns)
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mb-3 rounded-lg border border-line/70 bg-[#12181f] px-3 py-2 text-xs text-muted">
        <p className="font-semibold uppercase tracking-wide text-muted">
          Accepted inputs
        </p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5">
          {mode === "audio" ? (
            <li>.mp3 / .wav / .m4a / audio/* → Deepgram transcript</li>
          ) : (
            <>
              <li>
                .json — {"{ utterances: [{ speaker, text, startMs? }] }"}
              </li>
              <li>.pdf — call transcript PDF → structured turns (Groq)</li>
            </>
          )}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={
            mode === "audio"
              ? "audio/*,.mp3,.wav,.m4a"
              : "application/json,.json,application/pdf,.pdf"
          }
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block max-w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-text"
        />
        <button
          type="button"
          disabled={busy || !file}
          onClick={() => void start()}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#041018] disabled:opacity-50"
        >
          {busy
            ? mode === "transcript" && file && isPdfFile(file)
              ? "Converting PDF…"
              : "Working…"
            : "Start"}
        </button>
      </div>

      {file && (
        <p className="mt-2 text-xs text-muted">
          Selected: {file.name}
          {mode === "transcript" && isPdfFile(file)
            ? " · PDF → utterances via Groq"
            : mode === "transcript" && isJsonFile(file)
              ? " · JSON upload"
              : ""}
        </p>
      )}
      {message && <p className="mt-3 text-sm text-pass">{message}</p>}
      {error && <p className="mt-3 text-sm text-fail">{error}</p>}
    </div>
  );
}
