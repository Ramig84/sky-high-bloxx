import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TowerGame } from "@/game/TowerGame";
import { CityMap } from "@/game/CityMap";
import { loadProgress, recordFloors, saveProgress, type ZoneId } from "@/game/zones";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sky Bloxx — Stack the Tallest Tower" },
      { name: "description", content: "A one-tap mobile tower stacking game. Build painted districts across the city, chain perfect drops and reach the clouds." },
      { property: "og:title", content: "Sky Bloxx — Stack the Tallest Tower" },
      { property: "og:description", content: "Hand-painted tower stacking for your phone: clear Old Town, Harbour and Downtown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const best = Number(localStorage.getItem("bloxx-best") || 0);
  if (!zone) return <CityMap progress={progress} best={best} onPick={setZone} />;
  return (
    <TowerGame key={zone} zone={zone} onMap={() => setZone(null)}
      onFloors={n => setProgress(p => { const next = recordFloors(p, zone, n); if (next !== p) saveProgress(next); return next; })} />
  );
}
