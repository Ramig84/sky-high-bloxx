import { useEffect, useRef, useState } from "react";
import { Star, Map as MapIcon, Volume2, VolumeX, Pause, Play, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import roofSrc from "@/assets/roof-cap.webp";
import ambientSrc from "@/assets/ambient.webp";
import windSrc from "@/assets/wind-poses.png";
import { backdropPoint, spawnAmbient, stepAmbient } from "./ambient";
import { spawnRain, stepRain } from "./weather";
import { districtFloors, districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, levelSpec, starsFor } from "./levels";
import { ENDLESS_STAGES, endlessSpec, endlessStage } from "./endless";
import { loadSettings, saveSettings, vibrate } from "./settings";
import { DISTRICT_MUSIC, ambienceFor, setAmbience, setMusic, sfx, unlockAudio } from "./audio";
import { BLOCK_W as BW, BLOCK_H as BH, advanceSwing, swingRate, advanceToLanding, classifyLanding, collapseIndex, floorPosition, integrateFall, landingReward, targetTowerSway, floorDifficulty, towerBalance } from "./motion";
import confettiSrc from "@/assets/painted-confetti.webp";
import { getImage } from "./preload";
import { blockSource, craneSource, coin } from "./shopArtwork";
import { coins, loadLoadout, runReward } from "./wallet";
import { finishRun, startRun } from "./account";
import { CoinCollector, type CoinCollectorHandle } from "./CoinCollector";
import { AdPlaceholder } from "./AdPlaceholder";
import { extraLifeOffer, fiveLevelOffer, type AdPlacement } from "./adPlacements";
import { canBankRun } from "./runPolicy";

const VH = 700; // logical height (zoomed back ~9% so the tower sits smaller and the scene breathes)
const GROUND_SCREEN = 534; // screen y of plot at camera 0 (same relative height as before)
const PIVOT_SCREEN = 96;
const ROPE = 120;
const GRAVITY = 1500;
const SWING = 0.42; // max swing angle (rad)
const HOOK_GAP = 22;

type Floor = { x: number; skin: number; swayAtLanding: number };
type Faller = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; skin: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; chip: number; rot: number };
type Hud = { score: number; floors: number; lives: number; combo: number; best: number; over: boolean; won: boolean; stars: number; coins: number; msg: string; msgKey: number };

const load = getImage;
const ok = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;

// A contact shadow painted from the scene's own palette. The old contact sprite
// measured as a pale tan smudge (mean rgb ~137,131,113), so drawing it thin left
// a bright halo under the building instead of a shadow.
function paintSoftShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, halfW: number, halfH: number, strength: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, halfH / halfW);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW);
  g.addColorStop(0, `rgba(41,29,21,${strength})`);
  g.addColorStop(0.55, `rgba(41,29,21,${strength * 0.55})`);
  g.addColorStop(1, "rgba(41,29,21,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, halfW, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function TowerGame({ level: levelIndex, endless = false, daily = false, onMap, onNext, onComplete, onEndlessOver }: { level: number; endless?: boolean; daily?: boolean; onMap: () => void; onNext?: (() => void) | undefined; onComplete: (stars: number) => void; onEndlessOver?: (score: number, floors: number) => void }) {
  const baseSpec = endless ? endlessSpec(0) : levelSpec(levelIndex);
  const goal = baseSpec.goal;
  const endCb = useRef(onEndlessOver); endCb.current = onEndlessOver;
  const bestKey = endless ? "bloxx-endless-best" : "bloxx-best";
  const district = DISTRICTS[baseSpec.district] ?? DISTRICTS[0];
  if (!district) throw new Error("No game districts configured");
  const doneCb = useRef(onComplete); doneCb.current = onComplete;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const collector = useRef<CoinCollectorHandle>(null);
  const coinTarget = useRef<HTMLImageElement>(null);
  const coinCounter = useRef<HTMLElement>(null);
  const rewardSource = useRef<HTMLSpanElement>(null);
  const coinLabel = useRef<HTMLSpanElement>(null);
  const balanceMeter = useRef<HTMLMeterElement>(null);
  const balanceLabel = useRef<HTMLSpanElement>(null);
  const balancePanel = useRef<HTMLDivElement>(null);
  const [credited, setCredited] = useState(0);
  const [adPlacement, setAdPlacement] = useState<AdPlacement | null>(null);
  const adPaused = useRef(false);
  const manualPaused = useRef(false);
  const [pauseView, setPauseView] = useState<"paused" | "leave" | null>(null);
  const pause = () => { manualPaused.current = true; setPauseView("paused"); };
  const resume = () => { manualPaused.current = false; setPauseView(null); };
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const openAd = (placement: AdPlacement) => { adPaused.current = true; setAdPlacement(placement); };
  const closeAd = () => { adPaused.current = false; setAdPlacement(null); };
  const reviveAfterAd = () => { api.current.revive?.(); closeAd(); };
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
  const api = useRef<{ tap: () => void; restart: () => void; start: () => void; mute: (m: boolean) => void; revive?: () => void }>({ tap: () => {}, restart: () => {}, start: () => {}, mute: () => {} });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tablet = window.matchMedia("(min-width: 600px)").matches;
    const [b1, b2, b3, bg0] = districtFloors(district.id, tablet);
    let spec = baseSpec;
    let bw = BW * spec.width;
    const rain = load((tablet ? tabletArtwork : phoneArtwork).rainSrc);
    const loadout = loadLoadout();
    const premiumBlock = blockSource(loadout.block);
    let windDir = 1;
    const streetSrc = districtStreet(district.id, tablet);
    const { cloudsSrc, sunsetSrc, spaceSrc, hookSrc, cloudSrc, birdSrc } = tablet ? tabletArtwork : phoneArtwork;
    const skins = premiumBlock ? [load(premiumBlock), load(premiumBlock), load(premiumBlock), load(bg0)] : [load(b1), load(b2), load(b3), load(bg0)];
    const street = load(streetSrc), clouds = load(cloudsSrc), sunset = load(sunsetSrc), space = load(spaceSrc);
    const hook = load(hookSrc);
    const crane = load(craneSource(loadout.crane)), cloud = load(cloudSrc), bird = load(birdSrc);
    const confetti = load(confettiSrc);
    const roof = load(roofSrc);
    const amb = load(ambientSrc), windArt = load(windSrc);
    const life = spawnAmbient(district.id, 360);
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
    // Ambient life: drifting clouds (world-anchored parallax) and birds crossing the sky.
    const puffs = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * 400 - 200, y: 260 + i * 330 + Math.random() * 120, sp: 6 + Math.random() * 10, sc: 0.6 + Math.random() * 0.6 }));
    const birds = Array.from({ length: 3 }, (_, i) => ({ x: -250 - i * 260, y: 150 + i * 60, sp: 30 + Math.random() * 20, ph: Math.random() * 6 }));
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

    let scale = 1, vw = 360;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr);
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
        nextSkin: 3, score: 0, lives: spec.lives, perfects: 0, won: false, combo: 0, best: best0, over: false, sway: 0, shake: 0 };
    }
    const publish = (msg = "") => setHud(h => ({ score: s.score, floors: s.floors.length, lives: s.lives, combo: s.combo, best: s.best, over: s.over, won: s.won, stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0, coins: h.coins, msg, msgKey: h.msgKey + 1 }));
    const awardRun = () => { const earned = runReward({ stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0, perfects: s.perfects, floors: s.floors.length, endless, daily }); const stats = { floors: s.floors.length, perfects: s.perfects, stars: s.won ? starsFor(spec, s.floors.length, s.perfects, spec.lives - s.lives) : 0 };
      const t = ticket; ticket = Promise.resolve(null);
      const generation = runGeneration.current;
      void finishRun(t, stats, earned).then(got => {
        if (generation !== runGeneration.current) return;
        setHud(h => ({ ...h, coins: got }));
        setCredited(got);
      }); };
    let ticket = startRun(daily ? "daily" : endless ? "endless" : "city", levelIndex);

    const topY = () => s.floors.length * BH;
    const displayX = (i: number) => {
      const floor = s.floors[i];
      return floor ? floorPosition(floor.x, floor.swayAtLanding, s.sway, i, bw) : 0;
    };
    // The crane speeds up with every floor inside a level and with every level across the city.
    const level = () => floorDifficulty(s.floors.length, spec.speed);
    const pivot = () => ({ x: Math.sin(s.t * 0.35) * Math.min(s.floors.length * 3, 70) + (spec.slide ? Math.sin(s.t * 0.9) * spec.slide : 0), y: s.camY + GROUND_SCREEN - PIVOT_SCREEN });
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
    api.current.restart = () => { runGeneration.current++; collector.current?.clear(); previewCoins = 0; setCredited(0); setHud(h => ({ ...h, coins: 0 })); if (coinCounter.current) coinCounter.current.textContent = "0"; if (coinLabel.current) coinLabel.current.textContent = "RUN COINS"; ticket = startRun(daily ? "daily" : endless ? "endless" : "city", levelIndex); best0 = s.best; spec = baseSpec; bw = BW * spec.width; s = fresh(); publish(); };

    api.current.revive = () => { if (!s.over || s.won || endless) return; s.over = false; s.lives = 1; s.combo = 0; s.shake = 0; if (!s.drop) s.held = true; publish("EXTRA LIFE!"); };

    const loseLife = (msg: string) => {
      s.lives--; s.combo = 0; s.shake = 10; void sfx(msg === "COLLAPSE!" ? "collapse" : "miss", 0.75);
      vibrate(120);
      if (s.lives <= 0) {
        s.over = true;
        if (s.score > s.best) { s.best = s.score; best0 = s.best; localStorage.setItem(bestKey, String(s.best)); }
        if (canBankRun(s.won, endless, daily)) awardRun();
        if (endless && !daily) endCb.current?.(s.score, s.floors.length);
      }
      publish(msg);
    };

    const checkCollapse = () => {
      const xs = s.floors.map((_, i) => displayX(i));
      const ci = collapseIndex(xs, bw);
      if (ci === -1) return false;
      const first = ci === -2 ? 0 : ci + 1;
      const anchor = ci === -2 ? 0 : (xs[ci] ?? 0);
      const gone = s.floors.splice(first);
      const com = gone.reduce((sum, _, k) => sum + (xs[first + k] ?? 0), 0) / gone.length;
      const dir = Math.sign(com - anchor) || 1;
      gone.forEach((f, k) => {
        s.fallers.push({ x: xs[first + k] ?? f.x, y: (first + k) * BH + BH / 2, vx: dir * (60 + k * 20), vy: 0, rot: 0, vr: dir * (1.5 + k * 0.3), skin: f.skin });
      });
      loseLife("COLLAPSE!");
      // Discard a pending release rather than judging it against a vanished surface.
      s.drop = null; s.held = true;
      s.nextSkin = s.floors.length ? s.nextSkin % 3 : 3;
      return true;
    };

    const land = (d: { x: number; vx: number }) => {
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
        s.floors.push({ x, skin, swayAtLanding: s.sway });
        if (checkCollapse()) return;
        if (kind === "perfect") s.perfects++;
        const nextCoins = runReward({ perfects: s.perfects, floors: s.floors.length, endless, daily });
        const bounds = canvas.getBoundingClientRect();
        collectCoins({ x: bounds.left + (0.5 + x / vw) * bounds.width, y: bounds.top + toScreenY(topY()) / VH * bounds.height }, previewCoins, nextCoins);
        previewCoins = nextCoins;
        let stageMsg = "";
        if (endless) {
          const before = endlessStage(s.floors.length - 1), after = endlessStage(s.floors.length);
          spec = endlessSpec(s.floors.length); bw = BW * spec.width;
          if (after > before) setAmbience(ambienceFor(district.id, spec));
          if (after > before) stageMsg = `${ENDLESS_STAGES[after]?.toUpperCase()} INCOMING!`;
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
      windDir = Math.random() < 0.5 ? -1 : 1;
      s.held = true;
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
    const drawBlock = (skin: number, cx: number, cyScreen: number, rot = 0, shadow = false) => {
      const img = skins[skin];
      if (!img) return;
      ctx.save(); ctx.translate(vw / 2 + cx, cyScreen); if (rot) ctx.rotate(rot);
      if (ok(img)) {
        // Painted pigment at the join grounds the facade without a picture-frame outline.
        if (shadow) paintSoftShadow(ctx, 0, BH / 2 - 1, bw * 0.52, 3.5, 0.16);
        // The sprite is authored for this exact rectangle, including its painted side return.
        ctx.drawImage(img, -bw / 2, -BH / 2, bw, BH);
      }
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
      if (adPaused.current || manualPaused.current) { raf = requestAnimationFrame(frame); return; }
      s.t += dt;
      if (!s.over) s.phase = advanceSwing(s.phase, level(), dt);

      // lean & sway
      const n = s.floors.length;
      const com = n ? s.floors.reduce((a, _, i) => a + displayX(i), 0) / n : 0;
      const lean = Math.max(-1.6, Math.min(1.6, com / (bw * 0.5)));
      const targetSway = targetTowerSway(lean, n, s.t);
      const balance = towerBalance(s.floors.map((_, i) => displayX(i)), bw);
      if (balanceMeter.current) balanceMeter.current.value = balance.risk;
      if (balanceLabel.current) balanceLabel.current.textContent = balance.state === "stable" ? "Stable" : `${balance.direction < 0 ? "←" : "→"} ${balance.state === "danger" ? "Collapse risk" : "Leaning"}`;
      if (balancePanel.current) balancePanel.current.dataset['state'] = balance.state;
      if (!s.over && isStarted) {
        s.sway += (targetSway - s.sway) * (1 - Math.exp(-dt * 3));
        checkCollapse();
      }

      // drop
      if (s.drop) {
        if (spec.wind) s.drop.vx += spec.wind * windDir * dt;
        const landed = advanceToLanding(s.drop, dt, GRAVITY, topY(), BH / 2);
        s.drop.rot *= Math.exp(-dt * 14); // settle level while falling
        if (landed) { const d = s.drop; s.drop = null; land(d); }
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
      const alt = s.camY;
      const a = (lo: number, hi: number) => Math.max(0, Math.min(1, (alt - lo) / (hi - lo)));
      drawCover(clouds, 1, 0);
      drawCover(sunset, a(1200, 2000), 0);
      drawCover(space, a(3000, 3800), 0);
      if (!faded && ok(street)) buildFade();
      drawCover(faded ? streetFaded : street, 1 - a(400, 900), alt);

      // drifting clouds (slower parallax than the tower) and birds
      if (ok(cloud)) for (const c of puffs) {
        c.x += c.sp * dt; if (c.x > vw / 2 + 140) c.x = -vw / 2 - 140;
        const sy = GROUND_SCREEN - (c.y - alt * 0.6);
        if (sy < -120 || sy > VH + 60) continue;
        const w = 100 * c.sc;
        ctx.globalAlpha = 0.45 * (1 - a(3200, 3800)); ctx.drawImage(cloud, vw / 2 + c.x - w / 2, sy, w, w * cloud.naturalHeight / cloud.naturalWidth); ctx.globalAlpha = 1;
      }
      if (ok(bird)) for (const b of birds) {
        b.x += b.sp * dt; if (b.x > vw / 2 + 80) { b.x = -vw / 2 - 80 - Math.random() * 300; b.y = 120 + Math.random() * 160; }
        const wingCycle = [0, 1, 2, 3, 2, 1];
        const pose = wingCycle[Math.floor((s.t + b.ph) * 10) % wingCycle.length] ?? 0;
        ctx.globalAlpha = 1 - a(1500, 2200);
        drawPose(bird, 6, pose, vw / 2 + b.x, b.y + Math.sin(s.t * 2 + b.ph) * 2, 20, 25.6); ctx.globalAlpha = 1;
      }
      // district life: painted leaves, petals, butterflies, steam, boats and mist
      if (ok(amb)) {
        const gs = toScreenY(0), fadeHi = 1 - a(500, 1100);
        for (const p of life) {
          stepAmbient(p, dt, vw, spec.wind ? windDir * spec.wind : 0);
          const L = p.layer; let x = vw / 2 + p.x, y: number, sz = L.size, al = L.alpha, cell = p.cell, rot = 0, flipX = 1;
          if (L.kind === "fall") { y = p.y; rot = p.age * 1.8 * p.sp + p.ph; flipX = Math.cos(p.age * 3.1 + p.ph); }
          else if (L.kind === "mist") { y = p.y; al *= 0.7 + 0.3 * Math.sin(p.age * 0.5 + p.ph); }
          else if (L.kind === "flutter") { y = gs - p.y - 40; cell = Math.floor(p.age * 9) % 2 ? 3 : 2; flipX = Math.cos(p.age * 0.7 + p.ph) >= 0 ? 1 : -1; al *= fadeHi; }
          else if (L.kind === "boat") {
            // Only the harbour has an unobstructed water lane. Reuse the backdrop cover transform.
            const point = backdropPoint(street.naturalWidth, street.naturalHeight, vw, VH, 0.5 + Math.sin(p.age * 0.12 + p.ph) * 0.1, 0.704, alt);
            x = point.x; y = point.y + p.y; sz = 16;
            rot = Math.sin(p.age * 1.6 + p.ph) * 0.05; al *= 1 - a(400, 900);
          }
          else { const k = p.age / 4; x += Math.sin(p.age + p.ph) * 6 + k * 14; y = gs - 150 - k * 70; sz *= 0.5 + k; al *= (1 - k) * fadeHi; }
          if (al <= 0.01 || y < -150 || y > VH + 60) continue;
          ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.abs(flipX) < 0.15 ? 0.15 * Math.sign(flipX || 1) : flipX, 1);
          if (L.kind === "mist" && ok(cloud)) ctx.drawImage(cloud, -sz / 2, -sz / 4, sz, sz * 0.5);
          else ctx.drawImage(amb, cell * 160, 0, 160, 160, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
        }
      }
      if (s.shake > 0.3) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

      // The ground floor sits straight on the painted pavement, held down by a soft
      // shadow painted from the scene's own palette. Both the separate masonry
      // plinth and the old contact sprite (a pale smudge, not a shadow) were tried
      // and both read as pasted-on marks, so they are gone.
      const gy = toScreenY(0);
      if (gy < VH + 200) paintSoftShadow(ctx, vw / 2, gy + 3, bw * 0.86, 9, 0.42);

      for (let i = 0; i < s.floors.length; i++) {
        const floor = s.floors[i], y = toScreenY(i * BH + BH / 2);
        if (floor && y > -BH && y < VH + BH) drawBlock(floor.skin, displayX(i), y, 0, true);
      }
      if (s.won && ok(roof) && s.floors.length) {
        // Painted roof caps the finished tower.
        const rw = bw * 1.12, rh = rw * roof.naturalHeight / roof.naturalWidth;
        ctx.drawImage(roof, vw / 2 + displayX(s.floors.length - 1) - rw / 2, toScreenY(topY()) - rh + 2, rw, rh);
      }
      for (const f of s.fallers) drawBlock(f.skin, f.x, toScreenY(f.y), f.rot);

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
      if (spec.night) { ctx.fillStyle = "rgba(20,26,58,0.5)"; ctx.fillRect(0, 0, vw, VH); }
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
      if (spec.slip && ok(rain)) {
        for (const p of rainStrokes) {
          stepRain(p, dt, vw, VH, spec.wind * windDir);
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(rain, p.cell * 32, 0, 32, 96, p.x, p.y - 40, p.length / 3, p.length);
        }
        ctx.globalAlpha = 1;
      }
      if (spec.wind && s.held && !s.over) {
        // The brush strokes curl and dissipate through six separately painted poses, not a sliding tile.
        if (ok(windArt)) for (let i = 0; i < 3; i++) {
          const cycle = (s.t * 0.7 + i / 3) % 1;
          const cell = Math.min(5, Math.floor(cycle * 6));
          const size = 86;
          const height = size * windArt.naturalHeight / (windArt.naturalWidth / 6);
          ctx.save(); ctx.globalAlpha = Math.sin(cycle * Math.PI) * 0.75;
          ctx.translate(vw * (0.18 + i * 0.32) + windDir * cycle * 18, 200 + i * 72);
          ctx.scale(windDir, 1);
          ctx.drawImage(windArt, cell * windArt.naturalWidth / 6, 0, windArt.naturalWidth / 6, windArt.naturalHeight, -size / 2, -height / 2, size, height);
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __bloxx?: () => unknown }).__bloxx = () => s;
    publish();
    return () => { runGeneration.current++; cancelAnimationFrame(raf); observer.disconnect(); setAmbience([]); };
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
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="game-wallet hud-pill"><span ref={coinLabel} className="hud-label">RUN COINS</span><div><img ref={coinTarget} src={coin} alt="" /><strong ref={coinCounter}>0</strong></div></div>
      <CoinCollector ref={collector} />
      {adPlacement && <AdPlaceholder placement={adPlacement} onClose={closeAd} onReward={adPlacement === "extra-life" || adPlacement === "continue" ? reviveAfterAd : undefined} />}
      <div ref={balancePanel} className={`tower-balance hud-pill${hud.over ? " invisible" : ""}`} data-state="stable">
        <span className="hud-label">BALANCE</span>
        <meter ref={balanceMeter} aria-label="Tower instability" min={0} max={1} low={0.6} high={0.85} optimum={0} defaultValue={0} />
        <span ref={balanceLabel}>Stable</span>
      </div>
      {started && (
        <div className="game-hud pointer-events-none">
          <div className="game-status-bar">
          <div className="game-stat game-score"><span className="hud-label">SCORE{hud.combo > 1 ? ` · ×${Math.min(hud.combo, 10)}` : ""}</span><span className="hud-value">{hud.score}</span></div>
          <div className="game-stat game-progress"><span className="hud-label">{daily ? "DAILY · 3×" : endless ? "ENDLESS" : `${district.name.toUpperCase()} · ${baseSpec.level + 1}`}</span><span className="hud-value">{hud.floors}{!endless && <span className="hud-label"> / {goal}</span>}</span></div>
          <div className="game-stat game-lives"><span className="hud-label">LIVES</span><span className="hud-value whitespace-nowrap" aria-label={`${hud.lives} lives`}>{[0, 1, 2].map(i => <span key={i} className={i < hud.lives ? "" : "opacity-20"}>♥</span>)}</span></div>
          <Button variant="ghost" aria-label="Pause game" title="Pause game" disabled={hud.over} className="game-sound pointer-events-auto h-11 w-11 text-foreground !p-0"
            onPointerDown={e => e.stopPropagation()} onClick={pause}>
            <Pause className="h-5 w-5" />
          </Button>
          </div>
        </div>
      )}
      {pauseView && <div className="absolute inset-0 z-40 flex items-center justify-center bg-game-shell/70 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={pauseView === "leave" ? "Leave game?" : "Game paused"} onPointerDown={e => e.stopPropagation()}>
        <div className="hud-pill w-full max-w-xs items-center gap-4 p-6 text-center">
          <h2 className="text-2xl font-extrabold">{pauseView === "leave" ? "Leave game?" : "Paused"}</h2>
          {pauseView === "leave" ? <>
            <p className="text-sm">Your unfinished tower and its pending coins will be lost. Your wallet and completed rewards stay safe.</p>
            <Button variant="ghost" className="plaque h-12 w-full rounded-none font-semibold" onClick={() => setPauseView("paused")}>Keep playing</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={onMap}>Leave game</Button>
          </> : <>
            <Button variant="ghost" className="plaque h-12 w-full rounded-none font-semibold" onClick={resume}><Play className="h-5 w-5" /> Resume</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={() => { const m = !muted; setMuted(m); api.current.mute(m); }}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />} {muted ? "Sound off" : "Sound on"}</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={() => setPauseView("leave")}><ArrowLeft className="h-5 w-5" /> {endless ? "Home" : "City map"}</Button>
          </>}
        </div>
      </div>}
      {hud.msg.trim() && !hud.over && <div key={hud.msgKey} className="msg-pop pointer-events-none absolute inset-x-0 px-2 text-center animate-in fade-in zoom-in duration-300">{hud.msg}</div>}
      {hud.over && (
        <div className="absolute inset-0 flex items-center justify-center bg-game-shell/50 backdrop-blur-sm" onPointerDown={e => e.stopPropagation()}>
          <div className="hud-pill max-h-[90dvh] max-w-[calc(100%-1.5rem)] items-center gap-3 overflow-y-auto px-6 py-5">
            <picture>
              <source media="(min-width: 600px)" srcSet={tabletArtwork.logoSrc} />
              <img src={phoneArtwork.logoSrc} alt="" width={1280} height={640} className="w-48" />
            </picture>
            <span className="text-3xl font-extrabold">{hud.won ? "Level clear!" : endless ? "Tower down!" : "Game Over"}</span>
            {hud.won && <span className="flex gap-1" aria-label={`${hud.stars} stars`}>{[0, 1, 2].map(k => <Star key={k} className={`h-8 w-8 ${k < hud.stars ? "fill-current" : "opacity-30"}`} />)}</span>}
            {!endless && <span className="hud-label">★ goal · ★ {baseSpec.perfectGoal} perfects · ★ no lives lost</span>}
            {endless && !daily && <span className="hud-label">SCORE SENT TO LEADERBOARD</span>}
            {daily && <span className="hud-label">TODAY'S SHARED TOWER · TRIPLE REWARD</span>}
            <span className="hud-label">SCORE</span><span className="hud-value">{hud.score}</span>
            <span ref={rewardSource} className="coin-reward" aria-label={`+${hud.coins} coins`}><img src={coin} alt="" className="coin-reward-icon" /><span>+{hud.coins.toLocaleString()} coins</span></span>
            <span className="hud-label">BEST {hud.best} · {hud.floors} FLOORS</span>
            {!hud.won && !endless && <span className="text-xs text-center">Level unfinished · coins not banked</span>}
            {!endless && extraLifeOffer(hud.lives, hud.over, hud.won) && <Button variant="ghost" className="plaque h-12 w-full rounded-none font-semibold" onClick={() => openAd("extra-life")}>+1 life · Test ad</Button>}
            <Button variant="ghost" className="paper-btn mt-2 h-auto rounded-full px-8 py-3 text-xl font-extrabold" onClick={() => (hud.won && onNext ? onNext() : api.current.restart())}>{hud.won && onNext ? "Next level" : "Play again"}</Button>
            {hud.won && <Button variant="ghost" className="paper-btn h-auto rounded-full px-6 py-2 text-base" onClick={() => api.current.restart()}>Replay</Button>}
            <Button variant="ghost" className="paper-btn h-auto rounded-full px-6 py-2 text-base" onClick={onMap}><MapIcon className="h-4 w-4" /> {endless ? "Home" : "City map"}</Button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
