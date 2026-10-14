import { useEffect, useState, type ReactNode } from "react";
import { phoneArtwork } from "./artwork";
import { preload, type ScreenAssets } from "./preload";

/** Shows a painted loading card until every asset for the screen is decoded, then reveals it in one piece. */
export function Preloader({ assets, children }: { assets: () => ScreenAssets; children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    // Show nothing for very fast (cached) loads to avoid a loading flash.
    preload(assets(), p => live && setProgress(p)).then(() => live && setDone(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (done) return <div className="screen-reveal">{children}</div>;
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-game-shell" role="status" aria-label="Loading">
      <img src={phoneArtwork.logoSrc} alt="Sky Bloxx" className="w-56 drop-shadow-md" />
      <div className="hud-pill h-4 w-56 overflow-hidden p-0">
        <div className="h-full bg-hud-accent transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
