import { LEVELS_PER_DISTRICT as TOUR_LPD, isDistrictUnlocked, loadStars } from "./levels";
import React, { useEffect, useRef, useState } from "react";
import { Star, Map as MapIcon, Volume2, VolumeX, Pause, Play, ArrowLeft, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import roofSrc from "@/assets/roof-cap.webp";
import ambientSrc from "@/assets/ambient.webp";
import windSrc from "@/assets/wind-poses.webp";
import windDirectionSrc from "@/assets/wind-cue-soft.webp";
import { backdropPoint, spawnAmbient, stepAmbient } from "./ambient";
import { spawnRain, stepRain } from "./weather";
import { DISTRICT_ATMOS, cloudGlow, twinkle, DISTRICT_SKY, DISTRICT_CLOUD_TINT, districtSpirits, WANDER_KINDS, districtSkyMix, spiritMotion, spiritPresence, birdPath, cloudDensity, cloudField, cloudScreenY, cloudWorldY, highSkyGlow, skyBlend, skyProfile, skyVisitors, visitorMotion, mistBand, windCue, windCuePose } from "./sky";
import { districtSkyArt, skyArt } from "./skyArtwork";
import { spiritArtwork, drawSpirit, type PaintedSpirit } from "./spiritArtwork";
import { districtFloors, districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, districtGoal, LEVELS_PER_DISTRICT, levelSpec, starsFor } from "./levels";
import { SPACE_BEST_KEY, SPACE_ZONES, floorsToNextZone, spaceSkyMix, spaceSkyLayers, spaceSpec, spaceDrift, spaceSwingRate, zoneAt } from "./spaceClimb";
import { SPACE_ZONE_SKY } from "./spaceArtwork";
import { SPACE_BLOCK_IMAGE, SPACE_BASE_IMAGE, blockDimensions, spaceBaseDimensions } from "./spaceBlock";
import { drawSpaceEffects, drawSpacePose, spaceEffectArtwork } from "./spaceEffectArtwork";
import { advanceSpacePresentation, freshSpaceHazards, resetSpaceHazardLane, spaceHazardHits, spaceHazardPosition, spaceHazardPoseTime, spaceHazardName, stepSpaceHazards, type SpaceEffectKind } from "./spaceEffects";
import { loadSettings, saveSettings, vibrate } from "./settings";
import { DISTRICT_MUSIC, ambienceFor, setAmbience, setMusic, sfx, unlockAudio } from "./audio";
import { advanceSwing, swingRate, advanceToLanding, classifyLanding, collapseIndex, floorPosition, integrateFall, landingReward, targetTowerSway, floorDifficulty, towerBalance } from "./motion";
import confettiSrc from "@/assets/painted-confetti.webp";
import contactSrc from "@/assets/painted-ground-contact.webp";
import footingSrc from "@/assets/storybook-footing.webp";
import { getImage } from "./preload";
import { blockSource, craneSource, coin } from "./shopArtwork";
import { coins, loadLoadout, runReward } from "./wallet";
import { finishRun, startRun } from "./account";
import { recordRun } from "./missions";
import { CoinCollector, type CoinCollectorHandle } from "./CoinCollector";
import { AdPlaceholder } from "./AdPlaceholder";
import { extraLifeOffer, fiveLevelOffer, type AdPlacement } from "./adPlacements";
import { canBankRun } from "./runPolicy";
import { atmosphereArtwork, drawAtmosphere, jadeTinted } from "./paintedAtmosphere";
import { starPainting } from "./derivedArtwork";
import { AdResumeCountdown } from "./AdResumeCountdown";
import { canvasResolution } from "./canvasResolution";
import { freshWind, finishWindDrop, stepWind, windPresentation } from "./wind";

const VH = 700; // logical height (zoomed back ~9% so the tower sits smaller and the scene breathes)
const GROUND_SCREEN = 534; // screen y of plot at camera 0 (same relative height as before)
const PIVOT_SCREEN = 96;
const ROPE = 120;
const GRAVITY = 1500;
const SWING = 0.42; // max swing angle (rad)
const HOOK_GAP = 22;

type Floor = { x: number; skin: number; swayAtLanding: number; width: number };
type Faller = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; skin: number; width?: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; chip: number; rot: number };
type Hud = { score: number; floors: number; lives: number; combo: number; best: number; over: boolean; won: boolean; stars: number; coins: number; msg: string; msgKey: number };

const load = getImage;
const ok = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;

// Wash the shared painted cloud sea to a district's light: keep the painted luminance, shift only the hue.
function tintedCloudSea(img: HTMLImageElement, tint: readonly [number, number, number]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d");
  if (!x) return c;
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = "color";
  x.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = "source-over";
  return c;
}

// The painted stone plinth fades out at its ends so it melts into the street painting.
const featheredPlinth = new Map<string, HTMLCanvasElement>();
function featheredFoundation(img: HTMLImageElement, w: number, h: number): CanvasImageSource {
  const key = `${img.src}|${Math.round(w)}x${Math.round(h)}`;
  const cached = featheredPlinth.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * 2)); c.height = Math.max(1, Math.round(h * 2));
  const g = c.getContext("2d");
  if (!g) return img;
  g.drawImage(img, 0, 0, c.width, c.height);
  const fade = g.createLinearGradient(0, 0, c.width, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.1, "rgba(0,0,0,1)");
  fade.addColorStop(0.9, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-in"; g.fillStyle = fade; g.fillRect(0, 0, c.width, c.height);
  featheredPlinth.set(key, c);
  return c;
}

export function TowerGame({ level: levelIndex, endless = false, daily = false, onMap, onNext, onComplete, onEndlessOver }: { level: number; endless?: boolean; daily?: boolean; onMap: () => void; onNext?: (() => void) | undefined; onComplete: (stars: number) => void; onEndlessOver?: (score: number, floors: number, landings: number) => Promise<boolean> }) {
  const baseSpec = endless ? spaceSpec(0) : levelSpec(levelIndex);
  const goal = baseSpec.goal;
  const endCb = useRef(onEndlessOver); endCb.current = onEndlessOver;
  const [tourIntro, setTourIntro] = useState(daily);
  const [tourPreview, setTourPreview] = useState(false);
  useEffect(() => { if (!daily) return; setTourPreview(!isDistrictUnlocked(loadStars(), Math.floor(levelIndex / TOUR_LPD))); const t = window.setTimeout(() => setTourIntro(false), 2800); return () => window.clearTimeout(t); }, [daily, levelIndex]);
  const bestKey = endless ? SPACE_BEST_KEY : "bloxx-best";
  const district = DISTRICTS[baseSpec.district] ?? DISTRICTS[0];
  if (!district) throw new Error("No game districts configured");
  const doneCb = useRef(onComplete); doneCb.current = onComplete;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const collector = useRef<CoinCollectorHandle>(null);
  const coinTarget = useRef<HTMLImageElement>(null);
  const coinCounter = useRef<HTMLElement>(null);
  const rewardSource = useRef<HTMLSpanElement>(null);
  const coinLabel = useRef<HTMLSpanElement>(null);
  const balanceMeter = useRef<HTMLMeterElement>(null);
  const balanceLabel = useRef<HTMLSpanElement>(null);
  const balancePanel = useRef<HTMLDivElement>(null);
  const [credited, setCredited] = useState(0);
  const [rewardFailed, setRewardFailed] = useState(false);
  const [zone, setZone] = useState(0);
  const [toNext, setToNext] = useState<number | null>(25);
  const [scoreStatus, setScoreStatus] = useState<"idle" | "pending" | "sent" | "ineligible" | "failed">("idle");
  const [adPlacement, setAdPlacement] = useState<AdPlacement | null>(null);
  const adPaused = useRef(false);
  const manualPaused = useRef(false);
  const [pauseView, setPauseView] = useState<"paused" | "leave" | null>(null);
  const pause = () => { manualPaused.current = true; setPauseView("paused"); };
  const resume = () => { manualPaused.current = false; setPauseView(null); };
  useEffect(() => {
    const hide = () => { if (document.hidden && !adPaused.current && !api.current.isOver?.()) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const openAd = (placement: AdPlacement) => { adPaused.current = true; setAdPlacement(placement); };
  const closeAd = () => { adPaused.current = false; setAdPlacement(null); };
  const [resumingFromAd, setResumingFromAd] = useState(false);
  const reviveAfterAd = () => {
    api.current.revive?.();
    setAdPlacement(null);
    setResumingFromAd(true);
  };
  const finishAdCountdown = () => { adPaused.current = false; setResumingFromAd(false); };
  const runGeneration = useRef(0);
  const [hud, setHud] = useState<Hud>({ score: 0, floors: 0, lives: 3, combo: 0, best: 0, over: false, won: false, stars: 0, coins: 0, msg: "", msgKey: 0 });
  useEffect(() => {
    if (fiveLevelOffer(levelIndex, hud.won, endless, daily)) {
      adPaused.current = true;
      setAdPlacement("five-levels");
    }
  }, [hud.won, levelIndex, endless, daily]);
  const started = true;
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!hud.msg) return;
    const timer = window.setTimeout(() => setHud(h => h.msgKey === hud.msgKey ? { ...h, msg: "" } : h), 1100);
    return () => window.clearTimeout(timer);
  }, [hud.msg, hud.msgKey]);
  const api = useRef<{ tap: () => void; restart: () => void; start: () => void; mute: (m: boolean) => void; revive?: () => void; isOver?: () => boolean; peak?: () => number }>({ tap: () => {}, restart: () => {}, start: () => {}, mute: () => {} });

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const makeCanvas = () => { const c = document.createElement("canvas"); c.className = "absolute inset-0 h-full w-full"; return c; };
    const canvas = makeCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    surface.appendChild(canvas);
    const tablet = window.matchMedia("(min-width: 600px)").matches;
    const [b1, b2, b3, bg0] = districtFloors(district.id, tablet);
    const { width: BW, height: BH } = blockDimensions(endless);
    let spec = baseSpec;
    let bw = BW * spec.width;
    const rain = load((tablet ? tabletArtwork : phoneArtwork).rainSrc);
    const loadout = loadLoadout();
    const premiumBlock = blockSource(loadout.block);
    let wind = freshWind();
    let windDir = wind.direction;
    const streetSrc = districtStreet(district.id, tablet);
    const { cloudsSrc, sunsetSrc, spaceSrc, hookSrc, cloudSrc, birdSrc } = tablet ? tabletArtwork : phoneArtwork;
    const gantry = endless ? load(SPACE_BLOCK_IMAGE) : null;
    const skins = gantry ? [gantry, gantry, gantry, gantry] : premiumBlock ? [load(premiumBlock), load(premiumBlock), load(premiumBlock), load(bg0)] : [load(b1), load(b2), load(b3), load(bg0)];
    const street = load(streetSrc), clouds = load(cloudsSrc), sunset = load(sunsetSrc), space = load(spaceSrc);
    const hook = load(hookSrc);
    const crane = load(craneSource(loadout.crane)), cloud = load(cloudSrc), bird = load(birdSrc);
    const confetti = load(confettiSrc);
    const contact = load(contactSrc), footing = load(footingSrc);
    const launchBase = endless ? load(SPACE_BASE_IMAGE) : null;
    const roof = load(roofSrc);
    const amb = load(ambientSrc), windArt = load(windSrc);
    const windArrow = load(windDirectionSrc);
    const cueTheme = getComputedStyle(surface);
    const cueInk = cueTheme.getPropertyValue("--plaque-ink").trim();
    const cuePaper = cueTheme.getPropertyValue("--hud-bg").trim();
    const climbTop = (districtGoal(baseSpec.district, LEVELS_PER_DISTRICT - 1) - 1.2) * BH;
    const life = spawnAmbient(district.id, 360);
    const ambientPoses = Object.fromEntries(Object.entries(spiritArtwork).map(([key, src]) => [key, load(src)])) as Record<PaintedSpirit, HTMLImageElement>;
    let flash = 0;
    const drawPose = (img: HTMLImageElement, count: number, pose: number, x: number, y: number, w: number, h: number, mirror = false) => {
      if (!ok(img)) return;
      const cell = img.naturalWidth / count;
      ctx.save(); ctx.translate(x, y); if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(img, Math.min(count - 1, Math.max(0, pose)) * cell, 0, cell, img.naturalHeight, -w / 2, -h, w, h);
      ctx.restore();
    };
    let isStarted = true, isMuted = localStorage.getItem("bloxx-muted") === "1";
    setMuted(isMuted);
    api.current.mute = (m) => { isMuted = m; saveSettings({ ...loadSettings(), sound: !m }); setAmbience(m ? [] : ambienceFor(district.id, spec)); setMusic(!m, 0.22, DISTRICT_MUSIC[district.id]); };
    setAmbience(ambienceFor(district.id, spec)); setMusic(true, 0.22, DISTRICT_MUSIC[district.id]);
    api.current.start = () => { unlockAudio(); isStarted = true; };
    // Layered sky: world-anchored clouds at several depths, district visitors and birds.
    const dsky = DISTRICT_SKY[district.id];
    const field = cloudField();
    const visitors = skyVisitors(dsky.lifeCount);
    const spirits = districtSpirits(district.id);
    const dSkyLow = load(districtSkyArt[district.id].low), dSkyHigh = load(districtSkyArt[district.id].high);
    // Space Climb paints its own sky per zone, dissolving from one into the next as the tower rises.
    const spaceSkies = SPACE_ZONE_SKY.map(load);
    const spacePoses = endless ? Object.fromEntries(Object.entries(spaceEffectArtwork).map(([key, src]) => [key, load(src)])) as Record<SpaceEffectKind, HTMLImageElement> : null;
    let hazards = freshSpaceHazards();
    let paintedFloors = 0;
    const atmos = DISTRICT_ATMOS[district.id];
    // District-coloured copy of the older shared creatures; approved signature paintings keep their own colours.
    const spiritLayers = spirits.map(sp => {
      const src = load(spiritArtwork[sp.kind]);
      const signature = (WANDER_KINDS as readonly string[]).includes(sp.kind);
      let tinted: HTMLCanvasElement | null = null;
      const art = (): (HTMLImageElement | HTMLCanvasElement) & { naturalWidth: number; naturalHeight: number } => {
        if (signature || atmos.tint[3] <= 0 || !ok(src)) return src;
        if (!tinted) {
          const c = document.createElement("canvas"); c.width = src.naturalWidth; c.height = src.naturalHeight;
          const x = c.getContext("2d");
          if (!x) return src;
          x.drawImage(src, 0, 0);
          x.globalCompositeOperation = "source-atop"; x.fillStyle = `rgba(${atmos.tint.join(",")})`; x.fillRect(0, 0, c.width, c.height);
          tinted = c;
        }
        return Object.assign(tinted, { naturalWidth: tinted.width, naturalHeight: tinted.height });
      };
      return { ...sp, src, art, signature };
    });
    const twinkleSprite = document.createElement("canvas"); twinkleSprite.width = twinkleSprite.height = 32;
    { const x = twinkleSprite.getContext("2d"); if (x) { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,250,235,1)"); g.addColorStop(1, "rgba(255,250,235,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 32); } }
    const wisp = load(skyArt.wispSrc), cloudSea = load(skyArt.cloudSeaSrc), cityHaze = load(skyArt.cityHazeSrc);
    // Downtown and Skyline Heights are modern high-rise cities, so their far skyline is painted towers.
    const towersHaze = load(skyArt.cityHazeTowersSrc);
    // Cloud Peak sits above the clouds among mountains, so its far horizon is a painted alpine range.
    const mountainsHaze = load(skyArt.cityHazeMountainsSrc);
    const cityHazeArt = district.id === "cloudpeak" ? mountainsHaze : district.id === "downtown" || district.id === "skyline" ? towersHaze : cityHaze;
    const cityHazeSpan = cityHazeArt === cityHaze ? 1.7 : 1.2;
    let cloudSeaLayer: HTMLCanvasElement | null = null;
    const cloudPoses = load(atmosphereArtwork.cloud), auroraPoses = load(atmosphereArtwork.aurora);
    const visitorArt = load(dsky.life === "kite" ? spiritArtwork.kite : spiritArtwork.balloon), aurora = load(skyArt.auroraSrc);
    // One depth field uses the original paintings and whole animated poses.
    const birds = Array.from({ length: dsky.birds.count }, (_, i) => ({ ph: i * 1.37 }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Extract only existing star pigment: no generated points, glow or new illustration.
    const starPigment = starPainting(space);
    // Street backdrop with a soft painted fade at its top so it blends into the sky when scrolling away.
    const streetFaded = document.createElement("canvas");
    let faded = false;
    const buildFade = () => {
      faded = true;
      streetFaded.width = street.naturalWidth; streetFaded.height = street.naturalHeight;
      const c = streetFaded.getContext("2d");
      if (!c) return;
      c.drawImage(street, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, street.naturalHeight * 0.3);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalCompositeOperation = "destination-out"; c.fillStyle = g;
      c.fillRect(0, 0, street.naturalWidth, street.naturalHeight * 0.3);
    };
    // Storm districts darken the same painted clouds (multiply grey kept inside the brushwork).
    const shaded = new Map<HTMLImageElement, HTMLImageElement | HTMLCanvasElement>();
    const cloudArt = (img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement => {
      if (dsky.cloudShade <= 0 && !baseSpec.night) return img;
      const hit = shaded.get(img); if (hit) return hit;
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d"); if (!g) return img;
      g.drawImage(baseSpec.night ? tintedCloudSea(img, DISTRICT_CLOUD_TINT[district.id]) : img, 0, 0); g.globalCompositeOperation = "multiply";
      const v = Math.round(255 * (1 - dsky.cloudShade * 0.55)); g.fillStyle = `rgb(${v},${v},${Math.min(255, v + 8)})`; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "destination-in"; g.drawImage(img, 0, 0);
      shaded.set(img, c); return c;
    };
    /** Back pass: far wisps and mid clouds behind the tower. Front pass: a few near clouds at the very edges. */
    const drawSkyClouds = (altC: number, front: boolean) => {
      for (const [i, c] of field.entries()) {
        const img = c.kind === "wisp" ? wisp : cloud;
        if (!ok(img)) continue;
        const isFront = c.kind === "puff" && i % 4 === 1;
        if (isFront !== front) continue;
        const dens = cloudDensity(c.kind, altC, climbTop);
        if (dens < 0.01) continue;
        const depth = front ? 1.3 : c.depth;
        const y = cloudScreenY(cloudWorldY(c.wy, altC), altC, depth);
        const w = (c.kind === "wisp" ? 190 : 110) * c.scale * (0.55 + depth * (front ? 0.9 : 0.8));
        const h = w * img.naturalHeight / img.naturalWidth;
        if (y < -h - 40 || y > VH + 40) continue;
        // Side lanes keep the crane, falling floor and landing area clear; near clouds hug the edges.
        const lane = front ? Math.sign(c.lane) * (0.56 + Math.abs(c.lane) * 0.25) : c.lane;
        const x = vw / 2 + lane * vw; // no sideways sliding: depth comes only from climbing
        const far = c.kind === "wisp" ? 0.5 : 0.28 + depth * 0.5; // far clouds paler
        ctx.globalAlpha = dens * (front ? 0.42 : far);
        if (c.kind === "puff" && ok(cloudPoses)) {
          drawAtmosphere(ctx, cloudArt(cloudPoses), reducedMotion ? 0 : s.t, i * 1.7, x - w / 2, y - w / 2, w, ctx.globalAlpha);
        } else ctx.drawImage(cloudArt(img), x - w / 2, y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
    };

    let scale = 1, vw = 360;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const resolution = canvasResolution(bounds.width, bounds.height, window.devicePixelRatio);
      canvas.width = resolution.width; canvas.height = resolution.height;
      scale = canvas.height / VH;
      vw = canvas.width / scale;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const rainStrokes = spawnRain(vw, VH);

    let best0 = Number(localStorage.getItem(bestKey) || 0);
    let previewCoins = 0;
    const collectCoins = (source: { x: number; y: number }, from: number, to: number) => {
      const target = coinTarget.current, counter = coinCounter.current;
      if (target && counter) collector.current?.collect({ source, target, counter, from, to });
    };
    let s = fresh();
    function fresh() {
      return { floors: [] as Floor[], fallers: [] as Faller[], parts: [] as Particle[],
        phase: 0, t: 0, camY: 0, held: true, drop: null as null | { x: number; y: number; vx: number; vy: number; rot: number },
        nextSkin: 3, score: 0, landings: 0, peakFloors: 0, lives: spec.lives, perfects: 0, won: false, combo: 0, best: best0, over: false, sway: 0, shake: 0 };
    }
    const publish = (msg = "") => setHud(h => ({ score: s.score, floors: s.floors.length, lives: s.lives, combo: s.combo, best: s.best, over: s.over, won: s.won, stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0, coins: h.coins, msg, msgKey: h.msgKey + 1 }));
    const awardRun = () => { const earned = runReward({ stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0, perfects: s.perfects, floors: s.floors.length, endless, daily }); const stats = { floors: s.floors.length, perfects: s.perfects, stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0 };
      recordRun(stats);
      const t = ticket; ticket = Promise.resolve(null);
      const generation = runGeneration.current;
      void finishRun(t, stats, earned).then(got => {
        if (generation !== runGeneration.current) return;
        setHud(h => ({ ...h, coins: got }));
        setCredited(got);
      }).catch(() => { if (generation === runGeneration.current) setRewardFailed(true); }); };
    let ticket = startRun(daily ? "daily" : endless ? "endless" : "city", levelIndex);

    const topY = () => s.floors.length * BH;
    const displayX = (i: number) => {
      const floor = s.floors[i];
      return floor ? floorPosition(floor.x, floor.swayAtLanding, s.sway, i, floor.width) : 0;
    };
    // The crane speeds up with every floor inside a level and with every level across the city.
    const level = () => endless ? spec.speed : floorDifficulty(s.floors.length, spec.speed);
    const syncSpace = () => {
      if (!endless) return;
      spec = spaceSpec(s.floors.length); bw = BW * spec.width;
      setZone(zoneAt(s.floors.length)); setToNext(floorsToNextZone(s.floors.length));
      setAmbience(ambienceFor(district.id, spec));
    };
    const widths = () => s.floors.map(f => f.width);
    api.current.isOver = () => s.over;
    api.current.peak = () => s.peakFloors;
    const pivot = () => ({ x: Math.sin(s.t * 0.35) * Math.min(s.floors.length * 3, 70) + (spec.slide ? Math.sin(s.t * 0.9) * spec.slide : 0), y: s.camY + GROUND_SCREEN - PIVOT_SCREEN + (spec.arc ? Math.abs(Math.sin(s.phase)) * spec.arc : 0) });
    const hung = () => {
      // Rope, hook and block swing as one rigid pendulum so the block never detaches from the hook.
      const th = SWING * Math.sin(s.phase), p = pivot(), dist = ROPE + HOOK_GAP + BH / 2;
      return { x: p.x + Math.sin(th) * dist, y: p.y - Math.cos(th) * dist, th, p };
    };

    api.current.tap = () => {
      unlockAudio();
      if (adPaused.current || manualPaused.current || s.over || !s.held || !isStarted) return;
      void sfx("release", 0.5);
      setHud(h => ({ ...h, msg: "" }));
      const h = hung();
      const dth = SWING * Math.cos(s.phase) * swingRate(level());
      s.drop = { x: h.x, y: h.y, vx: Math.cos(h.th) * ROPE * dth * 0.2, vy: 0, rot: -h.th };
      s.held = false;
    };
    api.current.restart = () => { manualPaused.current = false; setPauseView(null); setRewardFailed(false); runGeneration.current++; setScoreStatus("idle"); collector.current?.clear(); previewCoins = 0; setCredited(0); setHud(h => ({ ...h, coins: 0 })); if (coinCounter.current) coinCounter.current.textContent = "0"; if (coinLabel.current) coinLabel.current.textContent = "RUN COINS"; ticket = startRun(daily ? "daily" : endless ? "endless" : "city", levelIndex); setZone(0); setToNext(floorsToNextZone(0)); best0 = s.best; spec = baseSpec; bw = BW * spec.width; wind = freshWind(); windDir = wind.direction; hazards = freshSpaceHazards(); s = fresh(); publish(); };

    api.current.revive = () => { if (!s.over || s.won || endless) return; s.over = false; s.lives = 1; s.combo = 0; s.shake = 0; if (!s.drop) s.held = true; publish("EXTRA LIFE!"); };

    const loseLife = (msg: string) => {
      s.lives--; s.combo = 0; s.shake = 10; void sfx(msg === "COLLAPSE!" ? "collapse" : "miss", 0.75);
      vibrate(120);
      if (s.lives <= 0) {
        s.over = true;
        if (s.score > s.best) { s.best = s.score; best0 = s.best; localStorage.setItem(bestKey, String(s.best)); }
        if (canBankRun(s.won, endless, daily)) awardRun();
        if (endless && !daily) {
          const generation = runGeneration.current;
          const callback = endCb.current;
          setScoreStatus("pending");
          if (!callback) setScoreStatus("ineligible");
          else void callback(s.score, s.peakFloors, s.landings).then(sent => {
            if (generation === runGeneration.current) setScoreStatus(sent ? "sent" : "ineligible");
          }).catch(() => { if (generation === runGeneration.current) setScoreStatus("failed"); });
        }
      }
      publish(msg);
    };

    const checkCollapse = () => {
      const xs = s.floors.map((_, i) => displayX(i));
      const ci = collapseIndex(xs, BW, BW * 1.12, widths());
      if (ci === -1) return false;
      const first = ci === -2 ? 0 : ci + 1;
      const anchor = ci === -2 ? 0 : (xs[ci] ?? 0);
      const gone = s.floors.splice(first);
      const com = gone.reduce((sum, _, k) => sum + (xs[first + k] ?? 0), 0) / gone.length;
      const dir = Math.sign(com - anchor) || 1;
      gone.forEach((f, k) => {
        s.fallers.push({ x: xs[first + k] ?? f.x, y: (first + k) * BH + BH / 2, vx: dir * (60 + k * 20), vy: 0, rot: 0, vr: dir * (1.5 + k * 0.3), skin: f.skin, width: f.width });
      });
      syncSpace();
      loseLife("COLLAPSE!");
      // Discard a pending release rather than judging it against a vanished surface.
      s.drop = null; s.held = true;
      s.nextSkin = s.floors.length ? s.nextSkin % 3 : 3;
      if (endless) hazards = resetSpaceHazardLane(hazards, s.floors.length, s.t);
      return true;
    };

    const land = (d: { x: number; vx: number }) => {
      if (spec.wind) wind = finishWindDrop(wind);
      const n = s.floors.length;
      const support = n === 0 ? 0 : displayX(n - 1);
      const off = d.x - support;
      const kind = classifyLanding(off, bw, n === 0);
      const skin = s.nextSkin;
      if (kind === "miss") {
        s.fallers.push({ x: d.x, y: topY() + BH / 2, vx: d.vx + Math.sign(off) * 80, vy: 0, rot: 0, vr: Math.sign(off) * 4, skin });
        loseLife("MISS!");
      } else {
        // Capture the visible contact and the current bend; cosmetic sway cannot inject drift.
        let x = kind === "perfect" ? support : d.x;
        if (spec.slip && kind !== "perfect") x += Math.sign(off) * spec.slip; // rain-slick floors slide outward
        s.floors.push({ x, skin, swayAtLanding: s.sway, width: bw });
        if (checkCollapse()) return;
        s.landings++; s.peakFloors = Math.max(s.peakFloors, s.floors.length);
        if (kind === "perfect") s.perfects++;
        const nextCoins = runReward({ perfects: s.perfects, floors: s.floors.length, endless, daily });
        const bounds = canvas.getBoundingClientRect();
        collectCoins({ x: bounds.left + (0.5 + x / vw) * bounds.width, y: bounds.top + toScreenY(topY()) / VH * bounds.height }, previewCoins, nextCoins);
        previewCoins = nextCoins;
        let stageMsg = "";
        if (endless) {
          const before = zoneAt(s.floors.length - 1), after = zoneAt(s.floors.length);
          syncSpace();
          if (after > before) { setAmbience(ambienceFor(district.id, spec)); setZone(after); void sfx("clear", 0.45); }
          const nextZone = SPACE_ZONES[after];
          if (after > before && nextZone) stageMsg = `WELCOME TO ${nextZone.name.toUpperCase()}`;
          setToNext(floorsToNextZone(s.floors.length));
        }
        const zoneClear = s.floors.length >= goal;
        const reward = landingReward(kind, s.combo);
        s.combo = reward.combo; s.score += reward.points;
        if (s.score > s.best) { s.best = s.score; best0 = s.best; localStorage.setItem(bestKey, String(s.best)); }
        if (kind === "perfect") {
          void sfx("drop", 0.55); void sfx("perfect", 0.7, 1 + Math.min(s.combo, 8) * 0.04);
          vibrate(30);
          for (let i = 0; i < 40; i++) s.parts.push({ x, y: topY(), vx: (Math.random() - 0.5) * 420, vy: 200 + Math.random() * 350, life: 1.4, chip: i % 6, rot: Math.random() * Math.PI * 2 });
        } else { void sfx("drop", 0.8); }
        s.shake = 3;
        if (zoneClear) {
          s.won = true; s.over = true;
          doneCb.current(starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives));
          awardRun();
          void sfx("clear", 0.8);
        }
        publish(zoneClear ? "LEVEL CLEAR!" : stageMsg ? stageMsg : kind === "perfect" ? `PERFECT ×${Math.min(s.combo, 10)}` : "");
      }
      s.nextSkin = s.floors.length === 0 ? 3 : (s.nextSkin + 1 + Math.floor(Math.random() * 2)) % 3;
      s.held = true;
      if (endless) hazards = resetSpaceHazardLane(hazards, s.floors.length, s.t);
    };

    const toScreenY = (wy: number) => GROUND_SCREEN - (wy - s.camY);

    const drawCover = (img: HTMLImageElement | HTMLCanvasElement, alpha: number, yOff: number) => {
      const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
      const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
      if (!iw || alpha <= 0) return;
      const sc = Math.max(vw / iw, VH / ih);
      const w = iw * sc, h = ih * sc;
      ctx.globalAlpha = alpha; ctx.drawImage(img, (vw - w) / 2, (VH - h) / 2 + yOff, w, h); ctx.globalAlpha = 1;
    };
    const drawBlock = (skin: number, cx: number, cyScreen: number, rot = 0, shadow = false, blockWidth = bw) => {
      const img = skins[skin];
      if (!img) return;
      ctx.save(); ctx.translate(vw / 2 + cx, cyScreen); if (rot) ctx.rotate(rot);
      if (ok(img)) {
        // Painted pigment at the join grounds the facade without a picture-frame outline.
        if (shadow && !endless && ok(contact)) {
          ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.22;
          ctx.drawImage(contact, -blockWidth * 0.52, BH / 2 - 3, blockWidth * 1.04, 6);
          ctx.restore();
        }
        // Trim the gantry's uneven pigment fringe to level contact beams, not perspective faces.
        if (endless) {
          const inset = Math.round(img.naturalHeight * 0.024);
          ctx.drawImage(img, 0, inset, img.naturalWidth, img.naturalHeight - inset * 2, -blockWidth / 2, -BH / 2 - 0.5, blockWidth, BH + 1);
        } else ctx.drawImage(img, -blockWidth / 2, -BH / 2, blockWidth, BH);
      }
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now: number) => {
      const paused = adPaused.current || manualPaused.current;
      const dt = paused ? 0 : Math.min((now - last) / 1000, 1 / 20); last = now;
      s.t += dt;
      wind = stepWind(wind, dt, s.held && !s.over);
      windDir = wind.direction;
      if (!s.over) s.phase = advanceSwing(s.phase, level(), dt);

      // lean & sway
      const n = s.floors.length;
      const com = n ? s.floors.reduce((a, _, i) => a + displayX(i), 0) / n : 0;
      const lean = Math.max(-1.6, Math.min(1.6, com / (bw * 0.5)));
      const targetSway = targetTowerSway(lean, n, s.t);
      const balance = towerBalance(s.floors.map((_, i) => displayX(i)), BW, BW * 1.12, widths());
      if (balanceMeter.current && Math.abs(balanceMeter.current.value - balance.risk) > 0.005) balanceMeter.current.value = balance.risk;
      const balanceText = balance.state === "stable" ? "Stable" : `${balance.direction < 0 ? "←" : "→"} ${balance.state === "danger" ? "Collapse risk" : "Leaning"}`;
      if (balanceLabel.current && balanceLabel.current.textContent !== balanceText) balanceLabel.current.textContent = balanceText;
      if (balancePanel.current && balancePanel.current.dataset['state'] !== balance.state) balancePanel.current.dataset['state'] = balance.state;
      if (!paused && !s.over && isStarted) {
        s.sway += (targetSway - s.sway) * (1 - Math.exp(-dt * 3));
        checkCollapse();
      }

      // drop
      if (endless && !paused && !s.over) hazards = stepSpaceHazards(hazards, s.floors.length, s.t, (topY() + BH / 2 + hung().y) / 2);
      if (s.drop && !paused && !s.over) {
        const previous = { x: s.drop.x, y: s.drop.y };
        s.drop.vx += spaceDrift(spec, windDir).acceleration * dt;
        const landed = advanceToLanding(s.drop, dt, GRAVITY * (spec.gravity ?? 1), topY(), BH / 2);
        s.drop.rot *= Math.exp(-dt * 14); // settle level while falling
        const hazard = endless ? hazards.hazard : null;
        const active = hazard ? spaceHazardPosition(hazard, s.t, vw) : null;
        const before = hazard ? spaceHazardPosition(hazard, s.t - dt, vw) : null;
        const hit = hazard && active && before && (active.active || before.active) && spaceHazardHits(before, active, previous, s.drop, bw / 2, BH / 2, hazard.size * 0.27);
        if (hit) {
          const d = s.drop;
          s.fallers.push({ ...d, vr: (hazard?.direction ?? 1) * 3, skin: s.nextSkin, width: bw });
          s.drop = null; s.held = true;
          if (spec.wind) wind = finishWindDrop(wind);
          hazards = resetSpaceHazardLane(hazards, s.floors.length, s.t);
          loseLife("DEBRIS HIT!");
        } else if (landed) { const d = s.drop; s.drop = null; land(d); }
      }
      for (const f of s.fallers) { integrateFall(f, dt, GRAVITY); f.rot += f.vr * dt; }
      s.fallers = s.fallers.filter(f => f.y > s.camY - 800);
      for (const p of s.parts) { integrateFall(p, dt, 700); p.life -= dt; }
      s.parts = s.parts.filter(p => p.life > 0);

      const target = Math.max(0, topY() - BH * 1.2);
      s.camY += (target - s.camY) * (1 - Math.exp(-dt * 3));
      s.shake *= Math.exp(-dt * 7.67);

      // render
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const dbgAlt = import.meta.env.DEV && typeof window !== "undefined" ? (window as unknown as { __skyAlt?: number }).__skyAlt : undefined;
      const alt = typeof dbgAlt === "number" ? dbgAlt : s.camY; // dev-only sky review hook
      const sky = skyProfile(alt);
      const altC = alt + dsky.cloudOffset; // cloud bands (Cloud Peak starts nearer the clouds)
      const skyC = skyProfile(altC);
      drawCover(clouds, 1, 0);
      drawCover(sunset, sky.sunset, 0);
      drawCover(space, sky.space, 0);
      // Space Climb: the zone's own painting, fading into the next zone's as the climb nears it.
      // Render-only development review: no fake floors, rewards, scores or progression.
      const review = import.meta.env.DEV && endless ? (window as unknown as { __spaceReview?: { floors: number; time: number } }).__spaceReview : undefined;
      paintedFloors = advanceSpacePresentation(paintedFloors, s.floors.length, dt);
      const sceneFloors = review?.floors ?? paintedFloors;
      const sceneTime = review?.time ?? s.t;
      const zoneSky = endless ? spaceSkyMix(sceneFloors) : null;
      const fromArt = zoneSky ? spaceSkies[zoneSky.from] : undefined, toArt = zoneSky ? spaceSkies[zoneSky.to] : undefined;
      const zoneArt = fromArt && toArt && ok(fromArt) && ok(toArt);
      // District's own painted sky: one continuous street-to-top journey, fully opaque (no grey veil).
      const districtArt = !zoneArt && ok(dSkyLow) && ok(dSkyHigh);
      if (zoneArt && zoneSky && fromArt && toArt) {
        for (const layer of spaceSkyLayers(sceneFloors)) { const art = spaceSkies[layer.zone]; if (art && layer.alpha > 0.005) drawCover(art, layer.alpha, 0); } }
      else if (districtArt) { const mix = districtSkyMix(alt);
        drawCover(dSkyLow, 1, 0);
        if (mix.high > 0.005) drawCover(dSkyHigh, mix.high, 0); }
      else { // fallback while district art decodes
        ctx.save(); ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = `rgba(${dsky.wash.join(",")},${dsky.washAlpha * 2.2})`; ctx.fillRect(0, 0, vw, VH);
        ctx.restore(); }
      // Campaign night districts darken only the sky, never the crane or blocks.
      if (spec.night && !endless) { ctx.fillStyle = "rgba(20,26,58,0.28)"; ctx.fillRect(0, 0, vw, VH); }
      const glow = highSkyGlow(alt, 1, Boolean(spec.night));
      const starAlpha = Math.max(sky.space, glow * dsky.stars);
      if (!endless && !reducedMotion && starAlpha > 0 && starPigment.width) {
        ctx.save(); ctx.globalCompositeOperation = "screen";
        drawCover(starPigment, starAlpha * (0.035 + 0.025 * Math.sin(s.t * 0.65)) + glow * dsky.stars * 0.05, 0);
        ctx.restore();
      }
      // Layer 2 — cloud light: glow pools breathe in place over the painted clouds in the district's light colour.
      if (!reducedMotion && districtArt) {
        ctx.save(); ctx.globalCompositeOperation = "soft-light";
        for (let i = 0; i < 4; i++) { const g0 = cloudGlow(i, s.t, vw, VH);
          const g = ctx.createRadialGradient(g0.x, g0.y, 0, g0.x, g0.y, g0.r);
          g.addColorStop(0, `rgba(${atmos.glow.join(",")},${0.5 * g0.a})`); g.addColorStop(1, `rgba(${atmos.glow.join(",")},0)`);
          ctx.fillStyle = g; ctx.fillRect(g0.x - g0.r, g0.y - g0.r, g0.r * 2, g0.r * 2); }
        ctx.restore();
      }
      // Layer 3 — district weather.
      if (!reducedMotion && districtArt) for (const w of atmos.weather) {
        ctx.save();
        if (w === "rays") { // light shafts fanning from above, each swelling and fading on its own beat
          ctx.globalCompositeOperation = "screen";
          for (let i = 0; i < 4; i++) {
            const a = 0.07 * (0.5 + 0.5 * Math.sin(s.t * (0.23 + i * 0.05) + i * 1.9)), ang = -0.35 + i * 0.22 + 0.03 * Math.sin(s.t * 0.11 + i);
            ctx.save(); ctx.translate(vw * 0.72, -20); ctx.rotate(ang);
            const g = ctx.createLinearGradient(0, 0, 0, VH * 0.75);
            g.addColorStop(0, `rgba(${atmos.glow.join(",")},${a})`); g.addColorStop(1, `rgba(${atmos.glow.join(",")},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(28 + i * 6, VH * 0.75); ctx.lineTo(-28 - i * 6, VH * 0.75); ctx.fill();
            ctx.restore();
          }
        } else if (w === "twinkle") {
          const vis = Math.max(spec.night ? 1 : 0, skyBlend(alt, 300, 1500));
          ctx.globalCompositeOperation = "screen";
          for (let i = 1; i < 34 && vis > 0.02; i++) { const st = twinkle(i, s.t, vw, VH);
            if (Math.abs(st.x - vw / 2) < 60) continue;
            // One pre-painted glow reused for every star: same look, no per-frame gradient building.
            ctx.globalAlpha = 0.9 * st.a * vis;
            ctx.drawImage(twinkleSprite, st.x - st.r * 4, st.y - st.r * 4, st.r * 8, st.r * 8); }
          ctx.globalAlpha = 1;
        } else if (w === "aurora" && ok(auroraPoses)) {
          ctx.globalCompositeOperation = "screen";
          const strength = Math.max(0.5, highSkyGlow(altC, 1, true));
          // Same painting and movement, washed to a softer jade and blended gently into the night.
          drawAtmosphere(ctx, jadeTinted(auroraPoses), s.t * 0.6, 0, -vw * 0.15, -vw * 0.2, vw * 1.3, strength * 0.2);
        }
        ctx.restore();
      }
      if (!endless && dsky.aurora > 0 && ok(aurora) && !districtArt) {
        const a = highSkyGlow(altC, dsky.aurora, Boolean(spec.night));
        if (a > 0.01) {
          const aw = vw * 1.5, ah = aw * aurora.naturalHeight / aurora.naturalWidth;
          ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = a * (0.42 + 0.08 * Math.sin(s.t * 0.5));
          ctx.drawImage(aurora, vw / 2 - aw / 2, 30, aw, ah);
          ctx.restore();
        }
      }
      // Far city sinking into blue haze below the rising tower (slowest layer).
      if (!endless && sky.cityHaze > 0.01 && ok(cityHazeArt)) {
        const hw = vw * cityHazeSpan, hh = hw * cityHazeArt.naturalHeight / cityHazeArt.naturalWidth;
        ctx.globalAlpha = sky.cityHaze * 0.85;
        ctx.drawImage(cityHazeArt, vw / 2 - hw / 2, VH - hh * 1.05 + Math.max(0, alt - 500) * 0.12, hw, hh);
        ctx.globalAlpha = 1;
      }
      if (!faded && ok(street)) buildFade();
      // Space Climb keeps its own painted zone sky all the way down: no campaign street over it.
      if (!endless) drawCover(faded ? streetFaded : street, sky.street, alt);

      // Sea of cloud tops below the tower once it climbs above the clouds.
      if (!endless && skyC.cloudSea > 0.01 && ok(cloudSea)) {
        if (!cloudSeaLayer) cloudSeaLayer = tintedCloudSea(cloudSea, DISTRICT_CLOUD_TINT[district.id]);
        const cw = vw * 1.6, ch = cw * cloudSea.naturalHeight / cloudSea.naturalWidth;
        const sink = Math.max(0, altC - 2400) * 0.06;
        ctx.globalAlpha = skyC.cloudSea * skyC.clouds * 0.92;
        ctx.drawImage(cloudSeaLayer ?? cloudSea, vw / 2 - cw / 2, VH - ch * 0.82 + sink, cw, ch);
        ctx.globalAlpha = 1;
      }
      // A single district-shaded field behind gameplay; authored paintings remain intact.
      if (!endless) { drawSkyClouds(altC, false); drawSkyClouds(altC, true); }
      if (endless && spacePoses) drawSpaceEffects(ctx, spacePoses, sceneFloors, sceneTime, vw, VH, reducedMotion, (z, i, time, size) => {
        const kind = z === 1 ? "eagle" : "gull";
        drawSpirit(ctx, ambientPoses[kind], kind, i, time, size, !reducedMotion && Math.sin(time * 0.55 + i) < -0.5);
      });
      // Painted thin mist, camera-anchored below the rooftops, never a full cloud puff.
      if (!endless && ok(wisp) && (atmos.weather.includes("mist") || district.id === "skyline" || district.id === "cloudpeak")) {
        for (let i = 0; i < 3; i++) {
          const m = mistBand(i, alt, vw, VH);
          const width = vw * 0.62, height = width * wisp.naturalHeight / wisp.naturalWidth;
          if (m.alpha < 0.01 || m.y > VH + height) continue;
          ctx.save(); ctx.globalAlpha = m.alpha * (0.045 + 0.018 * Math.sin(s.t * 0.3 + i));
          ctx.drawImage(cloudArt(wisp), m.x - width / 2, m.y - height / 2, width, height); ctx.restore();
        }
      }

      // District sky visitors (balloons, kites) drifting at the side lanes — campaign only.
      if (!endless && dsky.life !== "none" && visitors.length && ok(visitorArt)) for (const v of visitors) {
        const fade = skyBlend(alt, v.wy - 650, v.wy - 350) * (1 - skyBlend(alt, v.wy + 500, v.wy + 900));
        if (fade < 0.01) continue;
        const t = s.t;
        const m = visitorMotion(dsky.life, v, s.t, alt, vw, VH, reducedMotion);
        const w = v.size * 1.6;
        ctx.save(); ctx.globalAlpha = fade * m.alpha * 0.9; ctx.translate(m.x, m.y); ctx.rotate(m.rot);
        drawSpirit(ctx, visitorArt, dsky.life, Math.floor(v.phase * 10), reducedMotion ? 0 : t, w);
        ctx.restore();
      }
      // Authored painted poses: no wing hinges, axis stretching or single-image deformation.
      if (!endless) for (const spirit of spiritLayers) {
      const spPres = spiritPresence(spirit.kind, alt, climbTop);
      const spiritArt = spirit.art();
      if (spPres > 0.01 && ok(spirit.src) && !reducedMotion) for (let i = 0; i < spirit.count; i++) {
        const m = spiritMotion(spirit.kind, i, s.t, vw, VH);
        if (spirit.kind === "steam") {
          const source = backdropPoint(street.naturalWidth, street.naturalHeight, vw, VH, 0.07, 0.43, alt);
          m.x = source.x + (m.x - vw / 2) * 0.08;
          m.y = source.y + m.y - VH * 0.43;
          m.alpha *= sky.street;
        }
        const base = ({ gull: 34, butterfly: 18, leaf: 14, steam: 46, lantern: 20, dragonfly: 24, pigeon: 30, swallow: 26, firefly: 28, eagle: 54, owl: 38 } as const)[spirit.kind] * m.scale;
        const w = base * 1.25;
        const turns = spirit.kind === "gull" || spirit.signature;
        ctx.save(); ctx.globalAlpha = Math.max(0, m.alpha) * spPres; ctx.translate(m.x, m.y); ctx.rotate(m.rot);
        if (turns && m.flip < 0) ctx.scale(-1, 1);
        drawSpirit(ctx, spiritArt, spirit.kind, i, s.t, w, turns && spirit.kind !== "dragonfly" && spirit.kind !== "firefly" && m.flap === 0);
        ctx.restore();
      }
      }
      // Shared birds keep their approved paths and district counts.
      if (!endless && ok(bird)) for (const [i, b] of birds.entries()) {
        const m = birdPath(i, reducedMotion ? b.ph : s.t * dsky.birds.speed, vw, VH);
        const depth = 0.75 + (i % 3) * 0.08;
        // Birds sit slightly lower as the tower climbs, so they belong to the sky rather than the screen.
        const y = m.y + Math.min(alt, 900) * 0.12 * depth;
        ctx.globalAlpha = sky.birds * depth;
        ctx.save(); ctx.translate(m.x, y); ctx.rotate(m.mirror ? -m.rot : m.rot);
        drawPose(bird, 6, reducedMotion || m.pose === 5 ? 2 : m.pose, 0, 0, 26 * depth * m.scale * dsky.birds.size, 33.28 * depth * m.scale * dsky.birds.size, m.mirror);
        ctx.restore(); ctx.globalAlpha = 1;
      }
      // district life: painted leaves, petals, butterflies, steam, boats and mist
      if (!endless && ok(amb)) {
        const fadeHi = sky.districtLife;
        for (const p of life) {
          // Low mist is handled once above; Rail Yard steam already has one roof source.
          if (p.layer.kind === "mist" || (district.id === "railyard" && p.layer.kind === "steam")) continue;
          stepAmbient(p, dt, vw, spec.wind ? windDir * spec.wind : 0);
          const L = p.layer; let x = vw / 2 + p.x, y: number, sz = L.size, al = L.alpha, cell = p.cell, rot = 0, flipX = 1;
          if (L.kind === "fall") { y = p.y; rot = Math.sin(p.age * 1.8 + p.ph) * 0.25; al *= fadeHi * (1 - skyBlend(y, VH * 0.6, VH * 0.76)); }
          else if (L.kind === "flutter") {
            const m = spiritMotion("butterfly", Math.floor(p.ph * 10), reducedMotion ? 0 : p.age, vw, VH);
            x = m.x; y = m.y; cell = 2; rot = m.rot; al *= fadeHi * m.alpha;
          }
          else if (L.kind === "boat") {
            // Only the harbour has an unobstructed water lane. Reuse the backdrop cover transform.
            const point = backdropPoint(street.naturalWidth, street.naturalHeight, vw, VH, 0.5 + Math.sin(p.age * 0.12 + p.ph) * 0.1, 0.704, alt);
            x = point.x; y = point.y + p.y; sz = 16;
            rot = Math.sin(p.age * 1.6 + p.ph) * 0.05; al *= sky.street;
          }
          else {
            const k = p.age / 4;
            const source = backdropPoint(street.naturalWidth, street.naturalHeight, vw, VH,
              district.id === "railyard" ? 0.07 : 0.17, district.id === "railyard" ? 0.43 : 0.47, alt);
            x = source.x + Math.sin(p.ph) * 5 + k * 10; y = source.y - k * 65;
            sz *= 0.4 + k * 0.6; al *= Math.sin(k * Math.PI) ** 2 * sky.street;
          }
          if (al <= 0.01 || y < -150 || y > VH + 60) continue;
          ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot);
          const kind: PaintedSpirit = L.kind === "boat" ? "boat" : L.kind === "flutter" ? "butterfly" : L.kind === "steam" ? "steam" : cell === 1 ? "petal" : "leaf";
          const img = ambientPoses[kind];
          if (flipX < 0) ctx.scale(-1, 1);
          if (ok(img)) drawSpirit(ctx, img, kind, Math.floor(p.ph * 10), reducedMotion ? 0 : p.age, sz * 1.4);
          ctx.restore();
        }
      }
      if (spec.fog) {
        const g = ctx.createLinearGradient(0, 0, 0, VH * 0.55);
        g.addColorStop(0, `rgba(226,224,214,${spec.fog})`); g.addColorStop(1, "rgba(226,224,214,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, vw, VH * 0.55);
      }
      if (district.id === "cloudpeak") {
        // distant lightning: rare soft sky flash
        if (flash <= 0 && Math.random() < dt * 0.08) flash = 0.5;
        if (flash > 0) { ctx.fillStyle = `rgba(240,236,220,${flash * 0.35})`; ctx.fillRect(0, 0, vw, VH); flash -= dt * 1.6; }
      }
      if (s.shake > 0.3) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

      // Painted stone plinth (same width as the physics foundation) set into the pavement,
      // with its own soft painted shadow underneath so the masonry sits in the street.
      const gy = toScreenY(0);
      if (endless && launchBase && ok(launchBase) && gy < VH + 200) {
        const base = spaceBaseDimensions(BW);
        const left = vw / 2 - base.width / 2;
        // Continue the attached rooftop beneath the HUD rather than floating a plinth in sky.
        ctx.drawImage(launchBase, 0, launchBase.naturalHeight - 32, launchBase.naturalWidth, 32,
          left, gy + base.height - 2, base.width, 74);
        ctx.drawImage(launchBase, left, gy - 0.5, base.width, base.height + 0.5);
      } else if (!endless && gy < VH + 200 && ok(footing)) {
        const fw = bw * 1.12, fh = 13;
        if (ok(contact)) {
          ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 0.35;
          ctx.drawImage(contact, vw / 2 - fw * 0.7, gy + fh - 7, fw * 1.4, 12);
          ctx.restore();
        }
        ctx.drawImage(featheredFoundation(footing, fw, fh), vw / 2 - fw / 2, gy, fw, fh);
      }

      for (let i = 0; i < s.floors.length; i++) {
        const floor = s.floors[i], y = toScreenY(i * BH + BH / 2);
        if (floor && y > -BH && y < VH + BH) drawBlock(floor.skin, displayX(i), y, 0, true, floor.width);
      }
      if (s.won && ok(roof) && s.floors.length) {
        // Painted roof caps the finished tower.
        const rw = bw * 1.12, rh = rw * roof.naturalHeight / roof.naturalWidth;
        ctx.drawImage(roof, vw / 2 + displayX(s.floors.length - 1) - rw / 2, toScreenY(topY()) - rh + 2, rw, rh);
      }
      for (const f of s.fallers) drawBlock(f.skin, f.x, toScreenY(f.y), f.rot, false, f.width ?? bw);

      // crane: jib with trolley at the pivot, cable, hook, and slings gripping the floor
      const h = hung();
      const py = toScreenY(h.p.y), px = vw / 2 + h.p.x;
      if (ok(crane)) { const cw = 420, ch = 58; ctx.drawImage(crane, px - cw * 0.5, py - 23, cw, ch); }
      ctx.save();
      ctx.translate(px, py); ctx.rotate(-h.th);
      ctx.strokeStyle = "rgba(55,40,30,0.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, ROPE - 24); ctx.stroke();
      if (ok(hook)) {
        const hookWidth = 29 * hook.naturalWidth / hook.naturalHeight;
        ctx.drawImage(hook, -hookWidth / 2, ROPE - 28, hookWidth, 29);
      }
      if (s.held && !s.over) {
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, ROPE - 2); ctx.lineTo(-bw * 0.38, ROPE + HOOK_GAP);
        ctx.moveTo(0, ROPE - 2); ctx.lineTo(bw * 0.38, ROPE + HOOK_GAP);
        ctx.stroke();
      }
      ctx.restore();
      // the final floor of a level carries its painted roof
      const lastFloor = !s.won && s.floors.length === spec.goal - 1;
      const roofOn = (x: number, y: number, rot: number) => {
        if (!lastFloor || !ok(roof)) return;
        const rw = bw * 1.12, rh = rw * roof.naturalHeight / roof.naturalWidth;
        ctx.save(); ctx.translate(vw / 2 + x, y); ctx.rotate(rot); ctx.drawImage(roof, -rw / 2, -BH / 2 - rh + 2, rw, rh); ctx.restore();
      };
      if (s.held && !s.over) { drawBlock(s.nextSkin, h.x, toScreenY(h.y), -h.th); roofOn(h.x, toScreenY(h.y), -h.th); }
      if (s.drop) { drawBlock(s.nextSkin, s.drop.x, toScreenY(s.drop.y), s.drop.rot); roofOn(s.drop.x, toScreenY(s.drop.y), s.drop.rot); }

      if (ok(confetti)) for (const p of s.parts) {
        ctx.save(); ctx.translate(vw / 2 + p.x, toScreenY(p.y)); ctx.rotate(p.rot + (1.4 - p.life) * p.vx * 0.025);
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.drawImage(confetti, p.chip * 32, 0, 32, 48, -3, -4.5, 6, 9);
        ctx.restore();
      }

      // weather: night tint, fog over the upper sky, painted rain streaks
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (spec.night && endless && !zoneArt) { ctx.fillStyle = "rgba(20,26,58,0.5)"; ctx.fillRect(0, 0, vw, VH); }
      if (spec.slip && ok(rain) && (!endless || zoneAt(sceneFloors) === 2)) {
        for (const p of rainStrokes) {
          stepRain(p, dt, vw, VH, spec.wind * windDir);
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(rain, p.cell * 32, 0, 32, 96, p.x, p.y - 40, p.length / 3, p.length);
        }
        ctx.globalAlpha = 1;
      }
      const drift = spaceDrift(spec, windDir);
      const cue = windCue(Math.abs(drift.acceleration), drift.direction, s.held, Boolean(s.drop), s.over);
      const windView = windPresentation(wind);
      if (cue.visible && (!endless || zoneAt(sceneFloors) < 3)) {
        // The brush strokes curl and dissipate through six separately painted poses, not a sliding tile.
        if (ok(windArt)) for (let i = 0; i < 3; i++) {
          const cycle = (s.t * 0.7 + i / 3) % 1;
          const cell = Math.min(5, Math.floor(cycle * 6));
          const size = 86;
          const height = size * windArt.naturalHeight / (windArt.naturalWidth / 6);
          ctx.save(); ctx.globalAlpha = Math.sin(cycle * Math.PI) * 0.5 * windView.opacity;
          ctx.translate(vw * (0.18 + i * 0.32) + windDir * cycle * 18, 200 + i * 72);
          ctx.scale(windDir, 1);
          ctx.drawImage(windArt, cell * windArt.naturalWidth / 6, 0, windArt.naturalWidth / 6, windArt.naturalHeight, -size / 2, -height / 2, size, height);
          ctx.restore();
        }
      }

      if (cue.visible && ok(windArrow)) {
        // Dissolve between whole aligned paintings; never slide or deform a static arrow.
        const width = Math.min(58, vw * 0.18), height = width / 2;
        const x = vw - Math.max(52, vw * 0.16), y = VH * 0.53;
        const cell = windArrow.naturalWidth / 6;
        const pose = windCuePose(s.t, reducedMotion);
        const blend = reducedMotion ? 0 : ((s.t % 1.8 + 1.8) % 1.8) / 1.8 * 6 - pose;
        ctx.save(); ctx.translate(x, y); ctx.scale(cue.direction, 1);
        ctx.globalAlpha = (1 - blend) * windView.opacity;
        ctx.drawImage(windArrow, pose * cell, 0, cell, windArrow.naturalHeight, -width / 2, -height / 2, width, height);
        ctx.globalAlpha = blend * windView.opacity;
        ctx.drawImage(windArrow, ((pose + 1) % 6) * cell, 0, cell, windArrow.naturalHeight, -width / 2, -height / 2, width, height); ctx.restore();
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = '500 12px Fredoka, sans-serif';
        ctx.fillStyle = cueInk; ctx.shadowColor = cuePaper; ctx.shadowBlur = 3;
        const force = endless && zoneAt(sceneFloors) >= 3 ? "Drift" : "Wind";
        const nextDirection = spaceDrift(spec, windView.nextDirection).direction;
        const label = windView.changing ? (nextDirection < 0 ? `Next ${force.toLowerCase()} ←` : `Next ${force.toLowerCase()} →`) : (cue.direction < 0 ? `← ${force}` : `${force} →`);
        ctx.fillText(label, x, y + 23, Math.min(88, vw * 0.27));
        ctx.restore();
      }

      if (endless && hazards.hazard && spacePoses) {
        const hazard = hazards.hazard, m = spaceHazardPosition(hazard, s.t, vw);
        const y = toScreenY(m.y);
        if (m.active) {
          ctx.save(); ctx.translate(vw / 2 + m.x, y); if (hazard.direction < 0) ctx.scale(-1, 1);
          drawSpacePose(ctx, spacePoses[hazard.kind], hazard.kind, spaceHazardPoseTime(hazard, s.t, reducedMotion), 0, hazard.size);
          ctx.restore();
        } else if (m.warning) {
          const x = hazard.direction > 0 ? 32 : vw - 32;
          ctx.save(); ctx.translate(x, y);
          if (hazard.direction < 0) ctx.scale(-1, 1);
          ctx.globalAlpha = 0.75 + Math.sin(s.t * 5) * 0.1;
          drawSpacePose(ctx, spacePoses[hazard.kind], hazard.kind, spaceHazardPoseTime(hazard, s.t, reducedMotion), 0, hazard.size);
          ctx.restore();
          ctx.save(); ctx.fillStyle = cueInk; ctx.shadowColor = cuePaper; ctx.shadowBlur = 3;
          ctx.font = '500 12px Fredoka, sans-serif'; ctx.textBaseline = "middle";
          ctx.textAlign = hazard.direction > 0 ? "left" : "right";
          ctx.fillText(hazard.direction > 0 ? `${spaceHazardName(hazard.kind)} →` : `← ${spaceHazardName(hazard.kind)}`, hazard.direction > 0 ? 10 : vw - 10, y + 30, Math.min(90, vw * 0.27));
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __bloxx?: () => unknown }).__bloxx = () => s;
    publish();
    return () => { runGeneration.current++; cancelAnimationFrame(raf); observer.disconnect(); canvas.remove(); setAmbience([]); };
  }, [levelIndex]);

  useEffect(() => {
    if (credited <= 0) return;
    const target = coinTarget.current, counter = coinCounter.current, source = rewardSource.current;
    if (!target || !counter || !source) return;
    if (coinLabel.current) coinLabel.current.textContent = "WALLET";
    const bounds = source.getBoundingClientRect();
    collector.current?.collect({ source: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, target, counter, from: Math.max(0, coins() - credited), to: coins() });
  }, [credited]);

  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none touch-none">
    <div className="game-viewport relative h-full overflow-hidden" onPointerDown={() => api.current.tap()}>
      <div ref={surfaceRef} className="absolute inset-0" />
      <div className="game-wallet hud-pill"><span ref={coinLabel} className="hud-label">RUN COINS</span><div><img ref={coinTarget} src={coin} alt="" /><strong ref={coinCounter}>0</strong></div></div>
      <CoinCollector ref={collector} />
      {adPlacement && <AdPlaceholder placement={adPlacement} onClose={closeAd} onReward={adPlacement === "extra-life" || adPlacement === "continue" ? reviveAfterAd : undefined} />}
      {resumingFromAd && <AdResumeCountdown onComplete={finishAdCountdown} />}
      <div ref={balancePanel} className={`tower-balance hud-pill${hud.over ? " invisible" : ""}`} data-state="stable">
        <span className="hud-label">BALANCE</span>
        <meter ref={balanceMeter} aria-label="Tower instability" min={0} max={1} low={0.6} high={0.85} optimum={0} defaultValue={0} />
        <span ref={balanceLabel}>Stable</span>
      </div>
      {started && (
        <div className="game-hud pointer-events-none">
          <div className="game-status-bar">
          <div className="game-stat game-score"><span className="hud-label">SCORE{hud.combo > 1 ? ` · ×${Math.min(hud.combo, 10)}` : ""}</span><span className="hud-value">{hud.score}</span></div>
          <div className="game-stat game-progress"><span className="hud-label">{daily ? `TOUR · ${district.name.toUpperCase()}` : endless ? SPACE_ZONES[zone]!.name.toUpperCase() : `${district.name.toUpperCase()} · ${baseSpec.level + 1}`}</span><span className="hud-value">{hud.floors}{!endless && <span className="hud-label"> / {goal}</span>}</span></div>
          {endless && toNext !== null && <div className="hud-label space-next" aria-label="Next zone">{SPACE_ZONES[zone + 1]?.name} in {toNext}</div>}
          <div className="game-stat game-lives"><span className="hud-label">LIVES</span><span className="hud-value whitespace-nowrap" aria-label={`${hud.lives} lives`}>{[0, 1, 2].map(i => <span key={i} className={i < hud.lives ? "" : "opacity-20"}>♥</span>)}</span></div>
          <Button variant="ghost" aria-label="Pause game" title="Pause game" disabled={hud.over} className="game-sound pointer-events-auto h-11 w-11 text-foreground !p-0"
            onPointerDown={e => e.stopPropagation()} onClick={pause}>
            <Pause className="h-5 w-5" />
          </Button>
          </div>
        </div>
      )}
      {pauseView && <div className="absolute inset-0 z-40 flex items-center justify-center bg-game-shell/50 p-6" role="dialog" aria-modal="true" aria-label={pauseView === "leave" ? "Leave game?" : "Game paused"} onPointerDown={e => e.stopPropagation()}>
        <div className="hud-pill w-full max-w-xs items-center gap-4 p-6 text-center">
          <h2 className="text-2xl font-extrabold">{pauseView === "leave" ? "Leave game?" : "Paused"}</h2>
          {pauseView === "leave" ? <>
            <p className="text-sm">Your unfinished tower and its pending coins will be lost. Your wallet and completed rewards stay safe.</p>
            <Button variant="ghost" className="plaque h-12 w-full rounded-none font-semibold" onClick={() => setPauseView("paused")}>Keep playing</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={onMap}>Leave game</Button>
          </> : <>
            <Button variant="ghost" className="plaque h-12 w-full rounded-none font-semibold" onClick={resume}><Play className="h-5 w-5" /> Resume</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={() => { const m = !muted; setMuted(m); api.current.mute(m); }}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />} {muted ? "Sound off" : "Sound on"}</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={() => setPauseView("leave")}><ArrowLeft className="h-5 w-5" /> {endless || daily ? "Home" : "City map"}</Button>
          </>}
        </div>
      </div>}
      {daily && tourIntro && <div className="tour-intro pointer-events-none absolute inset-x-4 top-[44%] z-20 text-center animate-in fade-in zoom-in duration-500"><span className="hud-label">DISTRICT TOUR{tourPreview ? " · PREVIEW" : ""}</span><strong className="block text-2xl">{district.name}</strong><span className="hud-label">{tourPreview ? "A taste of what's ahead — unlock it in the city" : "Triple coins today"}</span></div>}
      {hud.msg.trim() && !hud.over && <div key={hud.msgKey} className="msg-pop pointer-events-none absolute inset-x-0 px-2 text-center animate-in fade-in zoom-in duration-300">{hud.msg}</div>}
      {rewardFailed && <span role="status" className="absolute inset-x-4 bottom-4 z-50 text-center hud-label">Coins could not be confirmed · connection error</span>}
      {hud.over && (
        <div className="absolute inset-0 flex items-center justify-center bg-game-shell/60" onPointerDown={e => e.stopPropagation()}>
          <div className="hud-pill max-h-[90dvh] w-[min(20rem,calc(100%-1.5rem))] items-center gap-3 overflow-y-auto px-6 py-5">
            <picture>
              <source media="(min-width: 600px)" srcSet={tabletArtwork.logoSrc} />
              <img src={phoneArtwork.logoSrc} alt="" width={1280} height={640} className="w-24" />
            </picture>
            <span className="text-3xl font-extrabold">{hud.won ? "Level clear!" : endless ? "Tower down!" : "Game Over"}</span>
            {hud.won && <span className="flex gap-1" aria-label={`${hud.stars} stars`}>{[0, 1, 2].map(k => <Star key={k} className={`h-8 w-8 ${k < hud.stars ? "fill-current" : "opacity-30"}`} />)}</span>}
            {!endless && !hud.won && <span className="hud-label text-center">★ goal · ★ {baseSpec.perfectGoal} perfects · ★ no lives lost</span>}
            <div className="over-stats">
              <div><span className="hud-label">SCORE</span><span className="hud-value">{hud.score}</span></div>
              <div><span className="hud-label">COINS</span><span ref={rewardSource} className="coin-reward" aria-label={`+${hud.coins} coins`}><img src={coin} alt="" className="coin-reward-icon" /><span>+{hud.coins.toLocaleString()}</span></span></div>
            </div>
            <span className="hud-label text-center">{[
              `BEST ${hud.best} · ${hud.floors} FLOORS`,
              
              daily ? (tourPreview ? `UNLOCK ${district.name.toUpperCase()} IN THE CITY` : "DISTRICT TOUR · 3× COINS") : "",
              !hud.won && !endless ? "COINS NOT BANKED" : "",
            ].filter(Boolean).join(" · ")}</span>
            {endless && !daily && <span className="hud-label text-center">REACHED {SPACE_ZONES[zoneAt((api.current.peak?.() ?? hud.floors))]?.name.toUpperCase()} · FLOOR {api.current.peak?.() ?? hud.floors}</span>}
            {endless && !daily && <span role="status" className="hud-label text-center">{scoreStatus === "sent" ? "SCORE SENT TO LEADERBOARD" : scoreStatus === "pending" ? "CHECKING SCORE…" : scoreStatus === "failed" ? "SCORE NOT SENT · CONNECTION ERROR" : "SCORE SAVED ON THIS PHONE"}</span>}
            <div className="mt-1 flex w-full flex-col gap-2">
              {!endless && extraLifeOffer(hud.lives, hud.over, hud.won) && <Button variant="ghost" className="plaque h-12 w-full rounded-none text-base font-extrabold" onClick={() => openAd("extra-life")}><Heart className="h-5 w-5" /> Watch ad · +1 life</Button>}
              <Button variant="ghost" className="plaque menu-plaque h-14 w-full rounded-none text-xl font-extrabold" onClick={() => (hud.won && onNext ? onNext() : api.current.restart())}>{hud.won && onNext ? "Next level" : "Play again"}</Button>
              <div className="grid grid-cols-2 gap-2">
                {hud.won && <Button variant="ghost" className="plaque h-12 rounded-none font-extrabold" onClick={() => api.current.restart()}><RotateCcw className="h-4 w-4" /> Replay</Button>}
                <Button variant="ghost" className={`plaque h-12 rounded-none font-extrabold ${hud.won ? "" : "col-span-2"}`} onClick={onMap}><MapIcon className="h-4 w-4" /> {endless || daily ? "Home" : "City map"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

