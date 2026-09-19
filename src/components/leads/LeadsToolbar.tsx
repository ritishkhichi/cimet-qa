"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useTransition } from "react";

const STATUSES = [
  "",
  "PENDING",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "SCORING",
  "HELD",
  "SUBMITTED",
  "CANCELLED",
  "FAILED",
] as const;

type Props = {
  retailers: string[];
};

export function LeadsToolbar({ retailers }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    const status = String(fd.get("status") || "");
    const retailer = String(fd.get("retailer") || "");
    const q = String(fd.get("q") || "").trim();
    if (status) next.set("status", status);
    if (retailer) next.set("retailer", retailer);
    if (q) next.set("q", q);
    next.set("page", "1");
    startTransition(() => {
      router.push(`/leads?${next.toString()}`);
    });
  }

  function clear() {
    startTransition(() => router.push("/leads"));
  }

  return (
    <form
      onSubmit={apply}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-3"
    >
      <label className="text-xs text-muted">
        Status
        <select
          name="status"
          defaultValue={params.get("status") ?? ""}
          className="mt-1 block min-w-[140px] rounded-lg border border-line bg-[#12181f] px-2.5 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-muted">
        Retailer
        <select
          name="retailer"
          defaultValue={params.get("retailer") ?? ""}
          className="mt-1 block min-w-[140px] rounded-lg border border-line bg-[#12181f] px-2.5 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">All</option>
          {retailers.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[200px] flex-1 text-xs text-muted">
        Search
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search leads…"
          className="mt-1 block w-full rounded-lg border border-line bg-[#12181f] px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-[#041018] disabled:opacity-60"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={clear}
        className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-text"
      >
        Clear
      </button>
    </form>
  );
}
