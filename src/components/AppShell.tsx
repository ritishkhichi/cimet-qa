"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <>
      {!isLogin && <AppHeader />}
      <main className={isLogin ? "" : "mx-auto max-w-6xl px-4 py-6"}>{children}</main>
    </>
  );
}
