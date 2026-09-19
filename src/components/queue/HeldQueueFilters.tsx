"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useTransition } from "react";

function FiltersInner({ agents }: { agents: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    const agent = String(fd.get("agent") || "");
    const reason = String(fd.get("reason") || "");
    if (agent) next.set("agent", agent);
    if (reason) next.set("reason", reason);
    startTransition(() => {
      router.push(`/queue?${next.toString()}`);
    });
  }

  return (
    <form
      onSubmit={apply}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-3"
    >
      <label className="text-xs text-muted">
        Agent
        <select
          name="agent"
          defaultValue={params.get("agent") ?? ""}
          className="mt-1 block min-w-[140px] rounded-lg border border-line bg-[#12181f] px-2.5 py-2 text-sm text-text"
        >
          <option value="">All</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Reason
        <select
          name="reason"
          defaultValue={params.get("reason") ?? ""}
          className="mt-1 block min-w-[140px] rounded-lg border border-line bg-[#12181f] px-2.5 py-2 text-sm text-text"
        >
          <option value="">All</option>
          <option value="critical">Critical fails</option>
          <option value="low-conf">Low confidence</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent disabled:opacity-60"
      >
        Filter
      </button>
    </form>
  );
}

export function HeldQueueFilters({ agents }: { agents: string[] }) {
  return (
    <Suspense fallback={null}>
      <FiltersInner agents={agents} />
    </Suspense>
  );
}
