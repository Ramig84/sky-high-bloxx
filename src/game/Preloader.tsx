import { useEffect, useState, type ReactNode } from "react";
import { phoneArtwork } from "./artwork";
import { preload, retainScreenImages, type ScreenAssets } from "./preload";

/** Shows a painted loading card until every asset for the screen is decoded, then reveals it in one piece. */
export function Preloader({ assets, children }: { assets: () => ScreenAssets; children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    setProgress(0);
    // Show nothing for very fast (cached) loads to avoid a loading flash.
    const manifest = assets();
    retainScreenImages(manifest.images);
    preload(manifest, p => live && setProgress(p)).then(() => live && setDone(true)).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  if (done) return <div className="screen-reveal">{children}</div>;
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-game-shell" role="status" aria-label="Loading">
      <img src={phoneArtwork.logoSrc} alt="Sky Bloxx" className="w-56 drop-shadow-md" />
      <div className="hud-pill h-4 w-56 overflow-hidden p-0">
        <div className="plaque h-full transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {failed && <div className="hud-pill mx-4 max-w-xs gap-3 text-center">
        <p>Some game artwork could not load. Check your connection and try again.</p>
        <button type="button" className="plaque min-h-11 px-6 font-semibold" onClick={() => setAttempt(n => n + 1)}>Retry loading</button>
      </div>}
    </div>
  );
}
