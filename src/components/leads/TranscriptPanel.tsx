"use client";

import { formatTimestamp } from "@/lib/timestamps";
import type { Utterance } from "@/types/transcript";
import { useRef } from "react";

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
  const audioRef = useRef<HTMLAudioElement>(null);

  function seekTo(ms: number | null) {
    if (ms == null || !audioRef.current) return;
    audioRef.current.currentTime = ms / 1000;
    void audioRef.current.play();
  }

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
      </div>

      {audioSrc && (
        <audio ref={audioRef} controls src={audioSrc} className="mb-4 w-full" />
      )}

      <div className="max-h-[480px] space-y-2 overflow-y-auto font-mono text-sm">
        {utterances.length === 0 && (
          <p className="text-muted">No transcript yet. Use Ingest to upload.</p>
        )}
        {utterances.map((u, i) => (
          <div
            key={`${i}-${u.startMs}`}
            className="rounded-lg border border-line/60 bg-[#12181f] px-3 py-2"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span className="uppercase text-accent">{u.speaker}</span>
              <span>{formatTimestamp(u.startMs)}</span>
              {u.startMs != null && audioSrc && (
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => seekTo(u.startMs)}
                >
                  ▶
                </button>
              )}
            </div>
            <p className="text-text">{u.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
