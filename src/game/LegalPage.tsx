import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Shared painted-paper frame for Privacy, Terms and account deletion pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-4 pb-12 pt-6 text-foreground">
      <div className="hud-pill mx-auto max-w-2xl items-stretch gap-0 p-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold"><ChevronLeft className="h-4 w-4" />Back to game</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-xs uppercase tracking-widest opacity-70">Last updated {updated}</p>
        <div className="mt-5 space-y-3 text-sm leading-relaxed [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal">
          {children}
        </div>
      </div>
    </main>
  );
}
