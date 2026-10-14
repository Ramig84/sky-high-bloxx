import { useState } from "react";
import { Lock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { phoneArtwork, tabletArtwork, zoneFloors } from "./artwork";
import { ZONES, isComplete, isUnlocked, type ZoneId, type ZoneProgress } from "./zones";

const BLURB: Record<ZoneId, string> = {
  oldtown: "Coral plaster homes with teal shutters around the old square.",
  harbour: "Chalk-white and sky-blue houses beside the calm painted bay.",
  downtown: "Tall honey-sandstone blocks where the city reaches the clouds.",
};

const art = () => (typeof window !== "undefined" && window.matchMedia("(min-width: 600px)").matches ? "tablet" : "phone");

// A tiny painted tower built from the zone's own floor paintings; grows with progress.
function MiniTower({ id, floors, goal }: { id: ZoneId; floors: number; goal: number }) {
  const tiles = zoneFloors[id][art()];
  const count = Math.min(6, Math.max(1, Math.ceil((Math.min(floors, goal) / goal) * 6)));
  return (
    <div className="map-tower" aria-hidden>
      {Array.from({ length: count }, (_, k) => count - 1 - k).map(k => (
        <img key={k} src={k === 0 ? tiles[3] : tiles[(k - 1) % 3]} alt="" className="map-tower-floor" style={{ animationDelay: `${k * 90}ms` }} />
      ))}
    </div>
  );
}

export function CityMap({ progress, best, onPick }: { progress: ZoneProgress; best: number; onPick: (id: ZoneId) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const a = art() === "tablet" ? tabletArtwork : phoneArtwork;
  const zone = sel === null ? null : ZONES[sel];
  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none">
      <div className="game-viewport relative h-full overflow-hidden">
        <img src={a.mapSrc} alt="Painted city map" className="map-pan absolute inset-0 h-full w-full object-cover" />
        {/* Living map: drifting clouds and flapping birds */}
        {[0, 1, 2].map(i => <img key={`c${i}`} src={a.cloudSrc} alt="" aria-hidden className="map-cloud" style={{ top: `${22 + i * 24}%`, animationDelay: `${-i * 13}s`, animationDuration: `${38 + i * 9}s` }} />)}
        {[0, 1].map(i => (
          <div key={`b${i}`} className="map-bird-path" style={{ top: `${34 + i * 22}%`, animationDelay: `${-i * 7}s` }} aria-hidden>
            <div className="map-bird" style={{ backgroundImage: `url(${a.birdSrc})` }} />
          </div>
        ))}
        <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <img src={a.logoSrc} alt="Sky Bloxx" className="w-full max-w-[8.5rem] drop-shadow-md" />
          {best > 0 && <div className="hud-pill items-center"><span className="hud-label">BEST</span><span className="hud-value">{best}</span></div>}
        </div>
        {ZONES.map((z, i) => {
          const open = isUnlocked(progress, i);
          const done = isComplete(progress, z.id);
          const floors = progress[z.id] ?? 0;
          return (
            <button key={z.id} type="button" onClick={() => setSel(i)} aria-label={`${z.name} details`}
              className={`map-pin absolute -translate-x-1/2 -translate-y-full ${open && !done ? "map-pin-live" : ""} ${!open ? "map-pin-locked" : ""}`}
              style={{ left: `${z.mapX}%`, top: `${z.mapY + (i === 2 ? 12 : 0)}%` }}>
              {open && floors > 0 && <MiniTower id={z.id} floors={floors} goal={z.goal} />}
              <span className="map-pin-name">{z.name}{done ? <Check className="h-3.5 w-3.5" /> : !open ? <Lock className="h-3.5 w-3.5" /> : null}</span>
              <span className="hud-label">{open ? `${Math.min(floors, z.goal)} / ${z.goal}` : "LOCKED"}</span>
            </button>
          );
        })}
        {zone && sel !== null && (
          <div className="absolute inset-0 flex items-end justify-center bg-game-shell/40 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in fade-in" onClick={() => setSel(null)}>
            <div className="map-card hud-pill w-full max-w-sm gap-3 p-4 animate-in slide-in-from-bottom-6 duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div><span className="hud-label">DISTRICT {sel + 1}</span><h2 className="text-2xl font-semibold leading-tight">{zone.name}</h2></div>
                <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setSel(null)}><X className="h-5 w-5" /></Button>
              </div>
              <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-md">
                {[3, 0, 1, 2].map(k => <img key={k} src={zoneFloors[zone.id][art()][k]} alt="" className="aspect-[420/250] w-full object-cover" />)}
              </div>
              <p className="text-sm opacity-90">{BLURB[zone.id]}</p>
              <div className="flex gap-2">
                <div className="hud-pill flex-1 items-center"><span className="hud-label">GOAL</span><span className="hud-value">{zone.goal} floors</span></div>
                <div className="hud-pill flex-1 items-center"><span className="hud-label">YOUR BEST</span><span className="hud-value">{progress[zone.id] ?? 0}</span></div>
              </div>
              {isUnlocked(progress, sel)
                ? <Button variant="ghost" className="paper-btn h-auto rounded-md py-3 text-lg font-medium" onClick={() => onPick(zone.id)}>{isComplete(progress, zone.id) ? "Build again" : "Build here"}</Button>
                : <p className="hud-label text-center">Build {ZONES[sel - 1]?.goal} floors in {ZONES[sel - 1]?.name} in one run to unlock.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
