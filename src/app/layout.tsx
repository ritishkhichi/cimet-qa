import type { Metadata } from "next";
import { Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CIMET QA",
  description: "Score the sale before it ships — Phase 1 ingestion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} min-h-screen antialiased`}>
        <header className="border-b border-line bg-panel/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/leads" className="text-lg font-semibold tracking-tight text-accent">
              CIMET QA
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/leads" className="hover:text-text">
                Leads
              </Link>
            </nav>
            <span className="ml-auto text-xs text-muted">Phase 1 · Ingestion</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
