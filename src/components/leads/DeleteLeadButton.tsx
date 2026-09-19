"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  leadId: string;
  externalLeadId: string;
  /** When true, navigate to /leads after delete */
  redirectToList?: boolean;
  className?: string;
};

export function DeleteLeadButton({
  leadId,
  externalLeadId,
  redirectToList = false,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (
      !window.confirm(
        `Delete lead ${externalLeadId}? This removes transcript, scores, and recordings.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error || "Delete failed");
        return;
      }
      if (redirectToList) {
        router.push("/leads");
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onDelete()}
      className={
        className ??
        "rounded-lg border border-fail/40 px-3 py-1.5 text-sm text-fail hover:border-fail disabled:opacity-50"
      }
      title="Delete this lead"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
