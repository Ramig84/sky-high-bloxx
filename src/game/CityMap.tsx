import { Lock, Check } from "lucide-react";
import { phoneArtwork, tabletArtwork } from "./artwork";
import { ZONES, isComplete, isUnlocked, type ZoneId, type ZoneProgress } from "./zones";

export function CityMap({ progress, best, onPick }: { progress: ZoneProgress; best: number; onPick: (id: ZoneId) => void }) {
  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none">
      <div className="game-viewport relative h-full overflow-hidden">
        <picture>
          <source media="(min-width: 600px)" srcSet={tabletArtwork.mapSrc} />
          <img src={phoneArtwork.mapSrc} alt="Painted city map" width={864} height={1536} className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <picture className="w-full max-w-[15rem]">
            <source media="(min-width: 600px)" srcSet={tabletArtwork.logoSrc} />
            <img src={phoneArtwork.logoSrc} alt="Sky Bloxx" width={1280} height={640} className="w-full drop-shadow-md" />
          </picture>
          {best > 0 && <div className="hud-pill items-center"><span className="hud-label">BEST</span><span className="hud-value">{best}</span></div>}
        </div>
        {ZONES.map((z, i) => {
          const open = isUnlocked(progress, i);
          const done = isComplete(progress, z.id);
          const floors = progress[z.id] ?? 0;
          return (
            <button key={z.id} type="button" disabled={!open} onClick={() => onPick(z.id)}
              aria-label={open ? `Build in ${z.name}` : `${z.name} locked`}
              className="map-pin absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${z.mapX}%`, top: `${z.mapY + (i === 2 ? 6 : 0)}%` }}>
              <span className="map-pin-name">{z.name}{done ? <Check className="h-4 w-4" /> : !open ? <Lock className="h-4 w-4" /> : null}</span>
              <span className="hud-label">{open ? `${Math.min(floors, z.goal)} / ${z.goal} FLOORS` : `BUILD ${ZONES[i - 1]?.goal} IN ${ZONES[i - 1]?.name.toUpperCase()}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
