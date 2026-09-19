import Link from "next/link";

const styles: Record<string, string> = {
  PENDING: "bg-line text-muted",
  TRANSCRIBING: "bg-accent/20 text-accent",
  TRANSCRIBED: "bg-pass/20 text-pass",
  FAILED: "bg-fail/20 text-fail",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${styles[status] ?? styles.PENDING}`}
    >
      {status}
    </span>
  );
}

export function AppLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-accent hover:underline">
      {children}
    </Link>
  );
}
