import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setAmbience, setMusic, sfx, unlockAudio } from "@/game/audio";
import { TowerGame } from "@/game/TowerGame";
import { CityMap } from "@/game/CityMap";
import { HomeMenu } from "@/game/HomeMenu";
import { Shop } from "@/game/Shop";
import { submitScore } from "@/game/leaderboard";
import { DISTRICTS, LEVELS_PER_DISTRICT, TOTAL_LEVELS, levelSpec, loadStars, recordStars, saveStars } from "@/game/levels";
import { Preloader } from "@/game/Preloader";
import { DistrictCelebration } from "@/game/DistrictCelebration";
import { celebrateAssets, homeAssets, levelAssets, mapAssets, preload, shopAssets } from "@/game/preload";
import { blockSource, craneSource } from "@/game/shopArtwork";
import { SPACE_SKY_IMAGES } from "@/game/spaceArtwork";
import { SPACE_EFFECT_IMAGES } from "@/game/spaceEffectArtwork";
import { SPACE_BLOCK_IMAGES } from "@/game/spaceBlock";
import { dailyLevel, loadLoadout } from "@/game/wallet";
import { initNativeSignInReturn, pushProgress, syncAccount } from "@/game/account";
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

type Screen = { kind: "home" } | { kind: "map" } | { kind: "shop" } | { kind: "level"; level: number; daily?: boolean } | { kind: "endless"; run: number } | { kind: "celebrate"; district: number };

function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [lastDistrict, setLastDistrict] = useState(-1);
  const [stars, setStars] = useState(loadStars);
  const home = () => setScreen({ kind: "home" });
  const menu = screen.kind === "home" || screen.kind === "map" || screen.kind === "celebrate";
  useEffect(() => { if (menu) { setMusic(true, 0.35); setAmbience(["birds"]); } }, [menu]);
  useEffect(() => {
    let disposed = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const restore = () => { void syncAccount().then(() => { if (!disposed) setStars(loadStars()); }).catch(() => {}); };
    void initNativeSignInReturn().catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      // Leave the auth callback before any SDK/RPC calls (including initialization).
      clearTimeout(pending);
      pending = setTimeout(() => {
        void syncAccount(session).then(() => { if (!disposed) setStars(loadStars()); }).catch(() => {});
      }, 0);
    });
    const onVisible = () => { if (document.visibilityState === "visible") restore(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; clearTimeout(pending); data.subscription.unsubscribe(); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  // Warm only an idle menu on roomy devices. Never decode another district during play.
  useEffect(() => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (screen.kind !== "home" || (memory !== undefined && memory <= 4) || (navigator.hardwareConcurrency || 2) <= 4 || !window.requestIdleCallback) return;
    let idle = 0;
    const timer = window.setTimeout(() => {
      idle = window.requestIdleCallback(() => {
        if (!document.hidden) void preload(mapAssets()).catch(() => {});
      });
    }, 2500);
    return () => { window.clearTimeout(timer); if (idle) window.cancelIdleCallback(idle); };
  }, [screen.kind]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => { unlockAudio(); if ((e.target as HTMLElement).closest("button")) void sfx("tap", 0.6); if (menu) { setMusic(true, 0.35); setAmbience(["birds"]); } };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  if (screen.kind === "home") return <Preloader key="home" assets={homeAssets}><HomeMenu onCampaign={() => setScreen({ kind: "map" })} onDaily={() => setScreen({ kind: "level", level: dailyLevel(new Date(), stars), daily: true })} onEndless={() => setScreen({ kind: "endless", run: Date.now() })} onShop={() => setScreen({ kind: "shop" })} onReset={() => setStars([])} /></Preloader>;
  if (screen.kind === "map") return <Preloader key="map" assets={mapAssets}><CityMap stars={stars} focus={lastDistrict} onHome={home} onPlay={level => setScreen({ kind: "level", level })} /></Preloader>;
  if (screen.kind === "shop") return <Preloader key="shop" assets={shopAssets}><Shop onBack={home} /></Preloader>;
  const loadoutAssets = () => { const x = loadLoadout(); return [craneSource(x.crane), blockSource(x.block)].filter((v): v is string => Boolean(v)); };
  if (screen.kind === "endless") return (
    <Preloader key={`e${screen.run}`} assets={() => endlessAssets([...loadoutAssets(), ...SPACE_BLOCK_IMAGES, ...SPACE_SKY_IMAGES, ...SPACE_EFFECT_IMAGES])}>
      <TowerGame level={0} endless onMap={home} onComplete={() => {}}
        onEndlessOver={async (score, floors, landings) => { const sent = await submitScore(score, landings, floors); void pushProgress(); return sent; }} />
    </Preloader>
  );
  if (screen.kind === "celebrate") {
    const d = screen.district, nxt = DISTRICTS[d + 1];
    return (
      <Preloader key={`c${d}`} assets={() => celebrateAssets(DISTRICTS[d]!.id, nxt?.id ?? null)}>
        <DistrictCelebration district={d} stars={stars} onNext={nxt ? () => setScreen({ kind: "level", level: (d + 1) * LEVELS_PER_DISTRICT }) : undefined}
          onMap={() => { setLastDistrict(Math.min(d + 1, DISTRICTS.length - 1)); setScreen({ kind: "map" }); }} />
      </Preloader>
    );
  }
  const level = screen.level;
  const districtEnd = !screen.daily && level % LEVELS_PER_DISTRICT === LEVELS_PER_DISTRICT - 1;
  return (
    <Preloader key={`${level}-${screen.daily ? "daily" : "city"}`} assets={() => levelAssets(DISTRICTS[levelSpec(level).district]!.id, loadoutAssets())}>
      <TowerGame level={level} daily={screen.daily === true}
        onMap={() => { if (screen.daily) home(); else { setLastDistrict(Math.floor(level / LEVELS_PER_DISTRICT)); setScreen({ kind: "map" }); } }}
        onNext={districtEnd ? () => setScreen({ kind: "celebrate", district: Math.floor(level / LEVELS_PER_DISTRICT) }) : !screen.daily && level + 1 < TOTAL_LEVELS ? () => setScreen({ kind: "level", level: level + 1 }) : undefined}
        onComplete={n => { if (!screen.daily) setStars(p => { const next = recordStars(p, level, n); if (next !== p) { saveStars(next); void pushProgress(next); } return next; }); }} />
    </Preloader>
  );
}
