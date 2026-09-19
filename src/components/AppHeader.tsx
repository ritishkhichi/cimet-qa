"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`relative pb-1.5 text-[15px] transition-colors ${
        active ? "text-text" : "text-muted hover:text-text"
      }`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-0 -bottom-4 h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

export function AppHeader() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const name = session?.user?.name;
  const email = session?.user?.email;

  return (
    <header className="border-b border-line bg-panel/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-5">
        <Link href="/leads" className="shrink-0 text-xl font-semibold tracking-tight">
          <span className="text-text">CIMET</span>{" "}
          <span className="text-accent">QA</span>
        </Link>

        {session?.user && (
          <nav className="flex items-center gap-6">
            <NavLink href="/leads" label="Leads" />
            <NavLink href="/ingest" label="Ingest" />
            <NavLink href="/queue" label="Held Queue" />
            <NavLink href="/analytics" label="Analytics" />
            {role === "ADMIN" && <NavLink href="/admin/users" label="Users" />}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <div className="flex items-center gap-2.5 rounded-full border border-line bg-[#12181f] py-1.5 pl-1.5 pr-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                  {initials(name, email)}
                </span>
                <span className="text-muted">
                  <span className="text-text">{name}</span>
                  {role ? ` · ${role}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-text"
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="text-muted">CIMET QA</span>
          )}
        </div>
      </div>
    </header>
  );
}
