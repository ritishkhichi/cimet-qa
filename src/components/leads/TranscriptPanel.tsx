"use client";

import { formatTimestamp } from "@/lib/timestamps";
import type { Utterance } from "@/types/transcript";
import { useEffect, useState } from "react";
import { toggleLeadAudio } from "@/components/leads/AudioTransport";

type Props = {
  utterances: Utterance[];
  audioSrc?: string | null;
  cardDataDetected?: boolean;
  source?: string;
};

export function TranscriptPanel({
  utterances,
  audioSrc,
  cardDataDetected,
  source,
}: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = document.getElementById("lead-audio") as HTMLAudioElement | null;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    setPlaying(!el.paused);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [audioSrc]);

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Transcript
        </h2>
        {source && (
          <span className="rounded bg-line px-2 py-0.5 text-xs text-muted">
            source: {source}
          </span>
        )}
        {cardDataDetected && (
          <span className="rounded bg-fail/20 px-2 py-0.5 text-xs text-fail">
            card data redacted
          </span>
        )}
        {audioSrc && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(
                  "lead-audio",
                ) as HTMLAudioElement | null;
                if (!el) return;
                if (el.paused) void el.play();
                else el.pause();
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#041018]"
            >
              {playing ? "Pause" : "Start"}
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[480px] space-y-1 overflow-y-auto font-mono text-sm">
        {utterances.length === 0 && (
          <p className="font-sans text-muted">
            No transcript yet. Use the{" "}
            <a href="/ingest" className="text-accent hover:underline">
              Ingest
            </a>{" "}
            page to upload audio / JSON / PDF.
          </p>
        )}
        {utterances.map((u, i) => (
          <div
            key={`${i}-${u.startMs}`}
            className="group flex gap-2 rounded-md px-2 py-1.5 hover:bg-[#12181f]"
          >
            <button
              type="button"
              disabled={u.startMs == null || !audioSrc}
              onClick={() => toggleLeadAudio(u.startMs)}
              className="shrink-0 text-left text-xs text-muted disabled:cursor-default"
              title={audioSrc ? "Play / pause from here" : undefined}
            >
              <span className="text-accent">[{u.speaker}</span>{" "}
              <span>{formatTimestamp(u.startMs)}]</span>
            </button>
            <p className="min-w-0 flex-1 text-text">{u.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
