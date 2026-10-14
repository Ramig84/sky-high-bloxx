import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TowerGame } from "@/game/TowerGame";
import { CityMap } from "@/game/CityMap";
import { LEVELS_PER_DISTRICT, TOTAL_LEVELS, loadStars, recordStars, saveStars } from "@/game/levels";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sky Bloxx — Stack the Tallest Tower" },
      { name: "description", content: "A one-tap mobile tower stacking game. Build ten painted districts, 100 levels, chain perfect drops and reach the clouds." },
      { property: "og:title", content: "Sky Bloxx — Stack the Tallest Tower" },
      { property: "og:description", content: "Hand-painted tower stacking for your phone: 10 districts, 100 levels, wind, rain, fog and night." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [level, setLevel] = useState<number | null>(null);
  const [lastDistrict, setLastDistrict] = useState(-1);
  const [stars, setStars] = useState(loadStars);
  if (level === null) return <CityMap stars={stars} focus={lastDistrict} onPlay={setLevel} />;
  return (
    <TowerGame key={level} level={level}
      onMap={() => { setLastDistrict(Math.floor(level / LEVELS_PER_DISTRICT)); setLevel(null); }}
      onNext={level + 1 < TOTAL_LEVELS ? () => setLevel(level + 1) : undefined}
      onComplete={n => setStars(p => { const next = recordStars(p, level, n); if (next !== p) saveStars(next); return next; })} />
  );
}
