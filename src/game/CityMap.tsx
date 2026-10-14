import { useEffect, useRef, useState } from "react";
import { Lock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { districtFloors, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, LEVELS_PER_DISTRICT, districtCleared, districtStars, isDistrictUnlocked, isLevelUnlocked, levelSpec, type DistrictId, type Stars } from "./levels";

const isTablet = () => typeof window !== "undefined" && window.matchMedia("(min-width: 600px)").matches;

// A tiny painted tower built from the district's own floor paintings; grows with earned stars.
function MiniTower({ id, stars }: { id: DistrictId; stars: number }) {
  const tiles = districtFloors(id, isTablet());
  const count = Math.min(6, Math.max(1, Math.ceil((stars / (LEVELS_PER_DISTRICT * 3)) * 6)));
  return (
    <div className="map-tower" aria-hidden>
      {Array.from({ length: count }, (_, k) => count - 1 - k).map(k => (
        <img key={k} src={k === 0 ? tiles[3] : tiles[(k - 1) % 3]} alt="" className="map-tower-floor" style={{ animationDelay: `${k * 90}ms` }} />
      ))}
    </div>
  );
}

export function CityMap({ stars, focus, onPlay }: { stars: Stars; focus: number; onPlay: (level: number) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const a = isTablet() ? tabletArtwork : phoneArtwork;
  const scroller = useRef<HTMLDivElement>(null);
  const d = sel === null ? null : DISTRICTS[sel];
  const current = DISTRICTS.findIndex((_, i) => isDistrictUnlocked(stars, i) && !districtCleared(stars, i));

  useEffect(() => {
    // Scroll so the district being played (or the newest open one) sits in view.
    const el = scroller.current, target = DISTRICTS[focus >= 0 ? focus : Math.max(0, current)];
    if (!el || !target) return;
    el.scrollTop = el.scrollHeight * (target.mapY / 100) - el.clientHeight * 0.6;
  }, [focus, current]);

  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none">
      <div className="game-viewport relative h-full overflow-hidden">
        <div ref={scroller} className="map-scroll absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="map-canvas">
            <img src={a.mapSrc} alt="Painted city map with ten districts" className="absolute inset-0 h-full w-full" />
            {DISTRICTS.map((z, i) => {
              const open = isDistrictUnlocked(stars, i);
              const st = districtStars(stars, i);
              return (
                <button key={z.id} type="button" onClick={() => setSel(i)} aria-label={`${z.name} details`}
                  className={`map-pin absolute -translate-x-1/2 -translate-y-full ${i === current ? "map-pin-live" : ""} ${!open ? "map-pin-locked" : ""}`}
                  style={{ left: `${z.mapX}%`, top: `${z.mapY}%` }}>
                  {open && st > 0 && <MiniTower id={z.id} stars={st} />}
                  <span className="map-pin-name">{i + 1}. {z.name}{!open && <Lock className="h-3 w-3" />}</span>
                  {open && <span className="map-pin-stars"><Star className="h-3 w-3 fill-current" />{st}/30</span>}
                </button>
              );
            })}
          </div>
        </div>
        {/* Living map: drifting clouds and flapping birds above the paper */}
        {[0, 1, 2].map(i => <img key={`c${i}`} src={a.cloudSrc} alt="" aria-hidden className="map-cloud" style={{ top: `${18 + i * 26}%`, animationDelay: `${-i * 13}s`, animationDuration: `${38 + i * 9}s` }} />)}
        {[0, 1].map(i => (
          <div key={`b${i}`} className="map-bird-path" style={{ top: `${30 + i * 24}%`, animationDelay: `${-i * 7}s` }} aria-hidden>
            <div className="map-bird" style={{ backgroundImage: `url(${a.birdSrc})` }} />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <img src={a.logoSrc} alt="Sky Bloxx" className="w-28 drop-shadow-md" />
          <div className="hud-pill items-center"><span className="hud-label">STARS</span><span className="hud-value flex items-center gap-1"><Star className="h-4 w-4 fill-current" />{stars.reduce((x, y) => x + (y ?? 0), 0)}</span></div>
        </div>
        {d && sel !== null && (
          <div className="absolute inset-0 flex items-end justify-center bg-game-shell/40 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in fade-in" onClick={() => setSel(null)}>
            <div className="map-card hud-pill w-full max-w-sm gap-3 p-4 animate-in slide-in-from-bottom-6 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div><span className="hud-label">DISTRICT {sel + 1} · {d.obstacle}</span><h2 className="text-2xl font-semibold leading-tight">{d.name}</h2></div>
                <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setSel(null)}><X className="h-5 w-5" /></Button>
              </div>
              <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-md">
                {[3, 0, 1, 2].map(k => <img key={k} src={districtFloors(d.id, isTablet())[k]} alt="" className="aspect-[420/250] w-full object-cover" />)}
              </div>
              <p className="text-sm opacity-90">{d.blurb}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: LEVELS_PER_DISTRICT }, (_, l) => {
                  const idx = sel * LEVELS_PER_DISTRICT + l, open = isLevelUnlocked(stars, idx), st = stars[idx] ?? 0;
                  return (
                    <button key={l} type="button" disabled={!open} onClick={() => onPlay(idx)} aria-label={`Level ${l + 1}, ${levelSpec(idx).goal} floors`}
                      className="level-tile">
                      {open ? <span className="text-base font-semibold leading-none">{l + 1}</span> : <Lock className="h-4 w-4" />}
                      <span className="text-[10px] leading-none opacity-80">{levelSpec(idx).goal}F</span>
                      <span className="flex">{[0, 1, 2].map(k => <Star key={k} className={`h-2.5 w-2.5 ${k < st ? "fill-current" : "opacity-40"}`} />)}</span>
                    </button>
                  );
                })}
              </div>
              {!isDistrictUnlocked(stars, sel) && <p className="hud-label text-center">Clear level 10 of {DISTRICTS[sel - 1]?.name} to unlock.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
