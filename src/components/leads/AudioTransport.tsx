"use client";

import { formatTimestamp } from "@/lib/timestamps";
import { useEffect, useState } from "react";

function getLeadAudio() {
  return document.getElementById("lead-audio") as HTMLAudioElement | null;
}

/** Play from ms, or pause if already playing near that mark */
export function toggleLeadAudio(ms: number | null) {
  if (ms == null) return;
  const el = getLeadAudio();
  if (!el) return;
  const targetSec = ms / 1000;
  const nearSame = Math.abs(el.currentTime - targetSec) < 0.75;
  if (!el.paused && nearSame) {
    el.pause();
    return;
  }
  el.currentTime = targetSec;
  void el.play();
}

export function pauseLeadAudio() {
  getLeadAudio()?.pause();
}

export function playLeadAudio() {
  const el = getLeadAudio();
  if (!el) return;
  void el.play();
}

/** Transport + single audio element for the lead page */
export function AudioTransport({ audioSrc }: { audioSrc?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    if (!audioSrc) return;
    // bind after audio mounts
    const bind = () => {
      const el = getLeadAudio();
      if (!el) return null;
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      const onTime = () => setCurrentMs(Math.round(el.currentTime * 1000));
      const onMeta = () =>
        setDurationMs(Math.round((el.duration || 0) * 1000));
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("loadedmetadata", onMeta);
      setPlaying(!el.paused);
      return () => {
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("timeupdate", onTime);
        el.removeEventListener("loadedmetadata", onMeta);
      };
    };
    const t = window.setTimeout(bind, 0);
    let cleanup: (() => void) | null | undefined;
    window.setTimeout(() => {
      cleanup = bind();
    }, 50);
    return () => {
      window.clearTimeout(t);
      cleanup?.();
    };
  }, [audioSrc]);

  if (!audioSrc) return null;

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-line bg-[#12181f] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (playing ? pauseLeadAudio() : playLeadAudio())}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-[#041018]"
          aria-label={playing ? "Pause" : "Start"}
          title={playing ? "Pause" : "Start"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => pauseLeadAudio()}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-text"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => playLeadAudio()}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-text"
        >
          Start
        </button>
        <span className="font-mono text-xs text-accent">
          {formatTimestamp(currentMs)}
          {durationMs > 0 ? ` / ${formatTimestamp(durationMs)}` : ""}
        </span>
        <span className="text-xs text-muted">
          Row ▶ buttons seek · click again or Pause to stop
        </span>
      </div>
      <audio id="lead-audio" controls src={audioSrc} className="w-full" />
    </div>
  );
}

export function EvidencePlayButton({
  startMs,
  audioSrc,
}: {
  startMs: number | null;
  audioSrc?: string | null;
}) {
  const [playingHere, setPlayingHere] = useState(false);

  useEffect(() => {
    if (!audioSrc || startMs == null) return;
    const el = getLeadAudio();
    if (!el) return;
    const sync = () => {
      const near =
        !el.paused && Math.abs(el.currentTime * 1000 - startMs) < 1200;
      setPlayingHere(near);
    };
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    el.addEventListener("timeupdate", sync);
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
      el.removeEventListener("timeupdate", sync);
    };
  }, [audioSrc, startMs]);

  if (startMs == null || !audioSrc) return null;

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${
        playingHere
          ? "border-accent bg-accent text-[#041018]"
          : "border-line text-accent hover:border-accent"
      }`}
      onClick={() => toggleLeadAudio(startMs)}
      title={playingHere ? "Pause" : `Play from ${formatTimestamp(startMs)}`}
    >
      {playingHere ? "❚❚ Pause" : "▶"} {formatTimestamp(startMs)}
    </button>
  );
}
