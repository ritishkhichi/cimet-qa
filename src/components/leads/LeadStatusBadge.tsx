const styles: Record<string, string> = {
  PENDING: "border-muted/50 text-muted",
  TRANSCRIBING: "border-accent text-accent",
  TRANSCRIBED: "border-accent text-accent",
  SCORING: "border-accent text-accent",
  SUBMITTED: "border-pass text-pass",
  HELD: "border-warn text-warn",
  CANCELLED: "border-muted/50 text-muted",
  FAILED: "border-fail text-fail",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? styles.PENDING}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
