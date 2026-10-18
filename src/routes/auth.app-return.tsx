import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { appReturnLinks, collectReturnParams, hasSignInResult } from "@/game/nativeAuth";

// Read the sign-in result before anything else can touch the address bar.
// This page never signs the browser itself in; it only hands the result to the app.
const captured = typeof window === "undefined"
  ? new URLSearchParams()
  : collectReturnParams(window.location.search, window.location.hash);

export const Route = createFileRoute("/auth/app-return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Returning to Sky Bloxx" },
      { name: "description", content: "Finishing Google sign-in and returning you to the Sky Bloxx app." },
      { property: "og:title", content: "Returning to Sky Bloxx" },
      { property: "og:description", content: "Finishing Google sign-in and returning you to the Sky Bloxx app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppReturn,
});

function AppReturn() {
  const ok = hasSignInResult(captured);
  const [href, setHref] = useState("");
  useEffect(() => {
    if (!ok) return;
    const links = appReturnLinks(captured);
    const link = /Android/i.test(navigator.userAgent) ? links.intent : links.scheme;
    setHref(link);
    window.history.replaceState(null, "", window.location.pathname); // keep tokens out of browser history
    window.location.href = link;
  }, [ok]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="hud-pill w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-extrabold">{ok ? "Signed in!" : "Nothing to return"}</h1>
        <p className="text-sm leading-relaxed">
          {ok ? "Taking you back to Sky Bloxx. If the game does not open, tap the button below." : "Open Sky Bloxx and tap Sign in with Google to start again."}
        </p>
        {ok && href && (
          <a href={href} className="plaque flex h-14 w-full items-center justify-center font-extrabold">Return to Sky Bloxx</a>
        )}
      </div>
    </main>
  );
}
