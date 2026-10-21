import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AD_PLACEMENTS, type AdPlacement } from "./adPlacements";
import { nativeAds, showNativeAd } from "./ads";

/** Native provider completion is required before granting a life; web keeps its test dialog. */
export function AdPlaceholder({ placement, onClose, onReward }: { placement: AdPlacement; onClose: () => void; onReward?: (() => void) | undefined }) {
  const automatic = placement === "five-levels";
  const [stage, setStage] = useState<"offer" | "playing" | "complete">(automatic ? "playing" : "offer");
  const [remaining, setRemaining] = useState(3);
  useEffect(() => {
    if (stage !== "playing" || !nativeAds()) return;
    let live = true;
    showNativeAd(placement).then(ok => {
      if (!live) return;
      if (!ok) onClose();
      else (onReward ?? onClose)();
    }).catch(() => { if (live) onClose(); });
    return () => { live = false; };
  }, [stage, placement]);
  useEffect(() => {
    if (stage !== "playing" || nativeAds()) return;
    const timer = window.setInterval(() => setRemaining(n => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);
  useEffect(() => { if (stage === "playing" && remaining === 0) setStage("complete"); }, [stage, remaining]);
  const item = AD_PLACEMENTS[placement];
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-game-shell/80 p-5" role="dialog" aria-modal="true" aria-label={`${item.title} ad test`} onPointerDown={e => e.stopPropagation()}>
    <div className="hud-pill relative w-full max-w-sm items-center gap-4 p-6 text-center">
      {(!automatic || stage === "complete") && <Button variant="ghost" size="icon" aria-label="Close ad test" className="absolute right-1 top-1" onClick={onClose}><X /></Button>}
      <span className="hud-label">TEST AD · {placement.toUpperCase()}</span>
      <h2 className="text-xl font-extrabold">{item.title}</h2>
      {stage === "offer" ? <><p>{item.offer}</p><Button variant="ghost" className="plaque h-14 w-full rounded-none font-extrabold" onClick={() => setStage("playing")}><Play className="mr-2 h-5 w-5" /> Watch test ad</Button></>
        : stage === "playing" ? nativeAds()
          ? <><Play className="h-12 w-12" /><strong className="text-xl">Loading ad…</strong><span>The real ad opens in a moment</span></>
          : <><Play className="h-12 w-12" /><strong className="text-3xl" aria-live="polite">{remaining}</strong><span>{automatic ? "Level-break ad placeholder" : "Rewarded video placeholder"}</span></>
        : <><strong>Test ad complete</strong><Button variant="ghost" className="plaque h-14 w-full rounded-none font-extrabold" onClick={onReward ?? onClose}><Play className="mr-2 h-5 w-5" /> {onReward ? "Resume level" : "Return to game"}</Button></>}
      <p className="text-xs opacity-75">Preview only. No real ads, coins, lives or leaderboard changes.</p>
      {!automatic && stage !== "complete" && <Button variant="ghost" className="paper-btn w-full" onClick={onClose}>No thanks</Button>}
    </div>
  </div>;
}

export function AdPlacementTests() {
  const [placement, setPlacement] = useState<AdPlacement | null>(null);
  return <details className="border-t border-current/20 pt-2">
    <summary className="cursor-pointer py-2 font-semibold">Ad placement tests</summary>
    <div className="flex flex-col gap-2">
      {(Object.keys(AD_PLACEMENTS) as AdPlacement[]).map(id => <Button key={id} variant="ghost" className="paper-btn" onClick={() => setPlacement(id)}>{AD_PLACEMENTS[id].title}</Button>)}
    </div>
    {placement && <AdPlaceholder key={placement} placement={placement} onClose={() => setPlacement(null)} />}
  </details>;
}