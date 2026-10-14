import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TowerGame } from "@/game/TowerGame";
import { CityMap } from "@/game/CityMap";
import { HomeMenu } from "@/game/HomeMenu";
import { submitScore } from "@/game/leaderboard";
import { loadSettings } from "@/game/settings";
import { LEVELS_PER_DISTRICT, TOTAL_LEVELS, loadStars, recordStars, saveStars } from "@/game/levels";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sky Bloxx — Stack the Tallest Tower" },
      { name: "description", content: "A one-tap mobile tower stacking game. Build ten painted districts, 100 levels, chain perfect drops and reach the clouds." },
      { property: "og:title", content: "Sky Bloxx — Stack the Tallest Tower" },
      { property: "og:description", content: "Hand-painted tower stacking for your phone: 10 districts, 100 levels, endless mode and a global leaderboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Screen = { kind: "home" } | { kind: "map" } | { kind: "level"; level: number } | { kind: "endless"; run: number };

function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [lastDistrict, setLastDistrict] = useState(-1);
  const [stars, setStars] = useState(loadStars);
  const home = () => setScreen({ kind: "home" });

  if (screen.kind === "home") return <HomeMenu onCampaign={() => setScreen({ kind: "map" })} onEndless={() => setScreen({ kind: "endless", run: Date.now() })} onReset={() => setStars([])} />;
  if (screen.kind === "map") return <CityMap stars={stars} focus={lastDistrict} onHome={home} onPlay={level => setScreen({ kind: "level", level })} />;
  if (screen.kind === "endless") return (
    <TowerGame key={`e${screen.run}`} level={0} endless onMap={home} onComplete={() => {}}
      onEndlessOver={(score, floors) => { const s = loadSettings(); submitScore(s.playerId, s.name, score, floors).catch(() => {}); }} />
  );
  const level = screen.level;
  return (
    <TowerGame key={level} level={level}
      onMap={() => { setLastDistrict(Math.floor(level / LEVELS_PER_DISTRICT)); setScreen({ kind: "map" }); }}
      onNext={level + 1 < TOTAL_LEVELS ? () => setScreen({ kind: "level", level: level + 1 }) : undefined}
      onComplete={n => setStars(p => { const next = recordStars(p, level, n); if (next !== p) saveStars(next); return next; })} />
  );
}
