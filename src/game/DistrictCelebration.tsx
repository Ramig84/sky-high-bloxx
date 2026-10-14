// Painted district-complete celebration: the cleared district's tower rises, paper confetti falls, the next district unlocks.
import { useEffect, useMemo } from "react";
import { Lock, LockOpen, Star } from "lucide-react";
import { districtFloors, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, districtGoal, districtStars, LEVELS_PER_DISTRICT, type Stars } from "./levels";
import { confettiSrc, roofSrc } from "./preload";
import { sfx } from "./audio";

const isTablet = () => window.matchMedia("(min-width: 600px)").matches;

export function DistrictCelebration({ district, stars, onNext, onMap }: { district: number; stars: Stars; onNext?: (() => void) | undefined; onMap: () => void }) {
  const a = isTablet() ? tabletArtwork : phoneArtwork;
  const done = DISTRICTS[district]!, next = DISTRICTS[district + 1] ?? null;
  const tiles = districtFloors(done.id, isTablet());
  const nextTiles = next ? districtFloors(next.id, isTablet()) : null;
  const st = districtStars(stars, district);
  const chips = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.23) % 4, dur: 3.4 + ((i * 13) % 10) / 4, chip: i % 6, spin: i % 2 ? 1 : -1 })), []);

  useEffect(() => {
    void sfx("clear", 0.8);
    const t = [window.setTimeout(() => void sfx("perfect", 0.6, 1.2), 1700), window.setTimeout(() => void sfx("perfect", 0.6, 1.5), 2600)];
    return () => t.forEach(window.clearTimeout);
  }, []);

  return (
    <main className="celebrate fixed inset-0 overflow-hidden bg-game-shell">
      <img src={a.mapSrc} alt="" aria-hidden className="celebrate-map" style={{ transformOrigin: `${done.mapX}% ${done.mapY}%`, ["--to-y" as string]: `${(done.mapY - (next?.mapY ?? done.mapY)) * 1.4}%` }} />
      <div className="celebrate-glow" aria-hidden />
      {[0, 1].map(i => <img key={i} src={a.cloudSrc} alt="" aria-hidden className="map-cloud" style={{ top: `${12 + i * 46}%`, animationDelay: `${-i * 15}s`, animationDuration: `${34 + i * 8}s` }} />)}
      <div className="map-bird-path" style={{ top: "22%" }} aria-hidden><div className="map-bird" style={{ backgroundImage: `url(${a.birdSrc})` }} /></div>

      <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="plaque celebrate-banner px-8 py-3 text-center">
          <span className="block text-xs font-bold tracking-widest">{next ? `DISTRICT ${district + 1} CLEARED` : "CITY COMPLETE"}</span>
          <h1 className="text-3xl font-extrabold leading-tight">{done.name}</h1>
        </div>
        <div className="celebrate-stars mt-3 flex items-center gap-1 hud-pill flex-row px-4">
          <Star className="h-5 w-5 fill-current" /><span className="hud-value">{st}/{LEVELS_PER_DISTRICT * 3}</span>
        </div>

        <div className="celebrate-tower mt-auto" aria-label={`${done.name} tower`}>
          <img src={roofSrc} alt="" className="celebrate-floor celebrate-roof" style={{ animationDelay: `${0.25 + 7 * 0.18}s` }} />
          {Array.from({ length: 7 }, (_, k) => 6 - k).map(k => (
            <img key={k} src={k === 0 ? tiles[3] : tiles[(k - 1) % 3]} alt="" className="celebrate-floor" style={{ animationDelay: `${0.25 + k * 0.18}s` }} />
          ))}
        </div>

        <div className="hud-pill celebrate-card mt-6 w-full gap-2 p-4">
          {next && nextTiles ? (
            <>
              <div className="flex items-center gap-3">
                <span className="celebrate-lock relative h-10 w-10 shrink-0"><Lock className="celebrate-lock-closed absolute inset-0 h-10 w-10" /><LockOpen className="celebrate-lock-open absolute inset-0 h-10 w-10" /></span>
                <div><span className="hud-label">NEXT DISTRICT UNLOCKED</span><h2 className="text-2xl font-semibold leading-tight">{next.name}</h2></div>
              </div>
              <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-md">{nextTiles.map((s, i) => <img key={i} src={s} alt="" className="h-10 w-full object-cover" />)}</div>
              <p className="text-sm">{next.blurb}</p>
              <p className="hud-label">New challenge: {next.obstacle} · {districtGoal(district + 1, 0)}→{districtGoal(district + 1, LEVELS_PER_DISTRICT - 1)} floors</p>
            </>
          ) : (
            <p className="text-center text-base">You built all ten districts up to the clouds. Keep climbing in Endless mode and chase the leaderboard.</p>
          )}
        </div>

        <div className="mt-4 flex w-full flex-col gap-2">
          {next && onNext && <button type="button" className="plaque celebrate-cta py-4 text-xl font-extrabold" onClick={onNext}>Build in {next.name} ›</button>}
          <button type="button" className="plaque py-3 text-base font-bold" onClick={onMap}>City map</button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
        {chips.map((c, i) => <span key={i} className="celebrate-chip" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, backgroundImage: `url(${confettiSrc})`, backgroundPosition: `${c.chip * 20}% 0`, ["--spin" as string]: c.spin }} />)}
      </div>
    </main>
  );
}
