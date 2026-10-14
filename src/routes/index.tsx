import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setAmbience, setMusic, sfx, unlockAudio } from "@/game/audio";
import { TowerGame } from "@/game/TowerGame";
import { CityMap } from "@/game/CityMap";
import { HomeMenu } from "@/game/HomeMenu";
import { Shop } from "@/game/Shop";
import { submitScore } from "@/game/leaderboard";
import { loadSettings } from "@/game/settings";
import { DISTRICTS, LEVELS_PER_DISTRICT, TOTAL_LEVELS, levelSpec, loadStars, recordStars, saveStars } from "@/game/levels";
import { Preloader } from "@/game/Preloader";
import { homeAssets, levelAssets, mapAssets, preload, shopAssets } from "@/game/preload";
import { blockSource, craneSource } from "@/game/shopArtwork";
import { dailyLevel, loadLoadout } from "@/game/wallet";
import { pushProgress, syncAccount } from "@/game/account";
import { supabase } from "@/integrations/supabase/client";

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

type Screen = { kind: "home" } | { kind: "map" } | { kind: "shop" } | { kind: "level"; level: number; daily?: boolean } | { kind: "endless"; run: number };

function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [lastDistrict, setLastDistrict] = useState(-1);
  const [stars, setStars] = useState(loadStars);
  const home = () => setScreen({ kind: "home" });
  const menu = screen.kind === "home" || screen.kind === "map";
  useEffect(() => { if (menu) { setMusic(true, 0.35); setAmbience(["birds"]); } }, [menu]);
  useEffect(() => {
    void syncAccount().then(() => setStars(loadStars()));
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void syncAccount().then(() => setStars(loadStars()));
    });
    return () => data.subscription.unsubscribe();
  }, []);
  // Quietly warm the map in the background so opening it is instant.
  useEffect(() => { const t = window.setTimeout(() => void preload(mapAssets()), 2500); return () => window.clearTimeout(t); }, []);
  useEffect(() => {
    const onDown = (e: PointerEvent) => { unlockAudio(); if ((e.target as HTMLElement).closest("button")) void sfx("tap", 0.6); if (menu) { setMusic(true, 0.35); setAmbience(["birds"]); } };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  if (screen.kind === "home") return <Preloader key="home" assets={homeAssets}><HomeMenu onCampaign={() => setScreen({ kind: "map" })} onDaily={() => setScreen({ kind: "level", level: dailyLevel(), daily: true })} onEndless={() => setScreen({ kind: "endless", run: Date.now() })} onShop={() => setScreen({ kind: "shop" })} onReset={() => setStars([])} /></Preloader>;
  if (screen.kind === "map") return <Preloader key="map" assets={mapAssets}><CityMap stars={stars} focus={lastDistrict} onHome={home} onPlay={level => setScreen({ kind: "level", level })} /></Preloader>;
  if (screen.kind === "shop") return <Preloader key="shop" assets={shopAssets}><Shop onBack={home} /></Preloader>;
  const loadoutAssets = () => { const x = loadLoadout(); return [craneSource(x.crane), blockSource(x.block)].filter((v): v is string => Boolean(v)); };
  if (screen.kind === "endless") return (
    <Preloader key={`e${screen.run}`} assets={() => levelAssets(DISTRICTS[0]!.id, loadoutAssets())}>
      <TowerGame level={0} endless onMap={home} onComplete={() => {}}
        onEndlessOver={(score, floors) => { const s = loadSettings(); submitScore(s.playerId, s.name, score, floors).catch(() => {}); void pushProgress(); }} />
    </Preloader>
  );
  const level = screen.level;
  return (
    <Preloader key={`${level}-${screen.daily ? "daily" : "city"}`} assets={() => levelAssets(DISTRICTS[levelSpec(level).district]!.id, loadoutAssets())}>
      <TowerGame level={level} daily={screen.daily === true}
        onMap={() => { if (screen.daily) home(); else { setLastDistrict(Math.floor(level / LEVELS_PER_DISTRICT)); setScreen({ kind: "map" }); } }}
        onNext={!screen.daily && level + 1 < TOTAL_LEVELS ? () => setScreen({ kind: "level", level: level + 1 }) : undefined}
        onComplete={n => { if (!screen.daily) setStars(p => { const next = recordStars(p, level, n); if (next !== p) { saveStars(next); void pushProgress(next); } return next; }); }} />
    </Preloader>
  );
}
