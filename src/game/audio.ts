// Recorded sound effects, district ambience and music, mixed through one Web Audio context.
import drop from "@/assets/audio/sfx-drop.mp3.asset.json";
import perfect from "@/assets/audio/sfx-perfect.mp3.asset.json";
import miss from "@/assets/audio/sfx-miss.mp3.asset.json";
import release from "@/assets/audio/sfx-release.mp3.asset.json";
import collapse from "@/assets/audio/sfx-collapse.mp3.asset.json";
import clear from "@/assets/audio/sfx-clear.mp3.asset.json";
import tap from "@/assets/audio/sfx-tap.mp3.asset.json";
import wind from "@/assets/audio/amb-wind.mp3.asset.json";
import waves from "@/assets/audio/amb-waves.mp3.asset.json";
import birds from "@/assets/audio/amb-birds.mp3.asset.json";
import train from "@/assets/audio/amb-train.mp3.asset.json";
import city from "@/assets/audio/amb-city.mp3.asset.json";
import night from "@/assets/audio/amb-night.mp3.asset.json";
import rain from "@/assets/audio/amb-rain.mp3.asset.json";
import music from "@/assets/audio/music-theme.mp3.asset.json";
import mOldtown from "@/assets/audio/music-oldtown.mp3.asset.json";
import mHarbour from "@/assets/audio/music-harbour.mp3.asset.json";
import mMarket from "@/assets/audio/music-market.mp3.asset.json";
import mRiverside from "@/assets/audio/music-riverside.mp3.asset.json";
import mGardens from "@/assets/audio/music-gardens.mp3.asset.json";
import mUniversity from "@/assets/audio/music-university.mp3.asset.json";
import mRailyard from "@/assets/audio/music-railyard.mp3.asset.json";
import mDowntown from "@/assets/audio/music-downtown.mp3.asset.json";
import mSkyline from "@/assets/audio/music-skyline.mp3.asset.json";
import mCloudpeak from "@/assets/audio/music-cloudpeak.mp3.asset.json";
import { loadSettings } from "./settings";
import type { DistrictId, LevelSpec } from "./levels";

const SRC = { drop, perfect, miss, release, collapse, clear, tap, wind, waves, birds, train, city, night, rain, music,
  mOldtown, mHarbour, mMarket, mRiverside, mGardens, mUniversity, mRailyard, mDowntown, mSkyline, mCloudpeak } as const;
export type Track = "music" | "mOldtown" | "mHarbour" | "mMarket" | "mRiverside" | "mGardens" | "mUniversity" | "mRailyard" | "mDowntown" | "mSkyline" | "mCloudpeak";

/** Every district has its own music; menus use the main theme. */
export const DISTRICT_MUSIC: Record<DistrictId, Track> = {
  oldtown: "mOldtown", harbour: "mHarbour", market: "mMarket", riverside: "mRiverside", gardens: "mGardens",
  university: "mUniversity", railyard: "mRailyard", downtown: "mDowntown", skyline: "mSkyline", cloudpeak: "mCloudpeak",
};
export type Sound = keyof typeof SRC;
export type Ambient = "wind" | "waves" | "birds" | "train" | "city" | "night" | "rain";

const DISTRICT_AMBIENT: Record<DistrictId, Ambient[]> = {
  oldtown: ["birds"], harbour: ["waves"], market: ["birds", "city"], riverside: ["birds"], gardens: ["birds"],
  university: ["birds"], railyard: ["train"], downtown: ["city"], skyline: ["city"], cloudpeak: ["wind"],
};

/** Which ambience loops play for a level: the district's own sound plus its weather. */
export function ambienceFor(district: DistrictId, spec: Pick<LevelSpec, "wind" | "slip" | "night">): Ambient[] {
  const set = new Set<Ambient>(DISTRICT_AMBIENT[district]);
  if (spec.night) { set.delete("birds"); set.add("night"); }
  if (spec.wind) set.add("wind");
  if (spec.slip) { set.delete("birds"); set.add("rain"); }
  return [...set];
}

let ctx: AudioContext | null = null;
const buffers = new Map<Sound, Promise<AudioBuffer | null>>();
const loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function buffer(name: Sound) {
  let p = buffers.get(name);
  if (!p) {
    const c = context();
    p = c ? fetch(SRC[name].url).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).catch(() => null) : Promise.resolve(null);
    buffers.set(name, p);
  }
  return p;
}

export function unlockAudio() { context(); }

// Browsers (especially iOS Safari) only allow sound after a real tap; resume on every kind of first gesture.
if (typeof window !== "undefined") {
  const unlock = () => { const c = context(); if (c && c.state === "running") for (const ev of ["touchend", "click", "keydown", "pointerup"]) window.removeEventListener(ev, unlock, true); };
  for (const ev of ["touchend", "click", "keydown", "pointerup"]) window.addEventListener(ev, unlock, true);
}

export async function sfx(name: Sound, volume = 0.8, rate = 1) {
  if (!loadSettings().sound) return;
  const c = context(), b = await buffer(name);
  if (!c || !b) return;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = b; src.playbackRate.value = rate; g.gain.value = volume;
  src.connect(g).connect(c.destination); src.start();
}

/** Fetch + decode sounds ahead of time (decoding works before the first tap). */
export function preloadSounds(names: Sound[]) { return names.map(n => buffer(n).then(() => {})); }

// Each loop key has a generation; a pending start that was superseded (e.g. menu theme still
// loading when a district starts) is discarded instead of grabbing the slot with the wrong track.
const gen = new Map<string, number>();
async function startLoop(key: string, name: Sound, volume: number) {
  if (loops.has(key)) return;
  const my = (gen.get(key) ?? 0) + 1; gen.set(key, my);
  const c = context(), b = await buffer(name);
  if (!c || !b || loops.has(key) || gen.get(key) !== my) return;
  const src = c.createBufferSource(), gain = c.createGain();
  src.buffer = b; src.loop = true;
  gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(volume, c.currentTime + 1.5);
  src.connect(gain).connect(c.destination); src.start();
  loops.set(key, { src, gain });
}
function stopLoop(key: string) {
  gen.set(key, (gen.get(key) ?? 0) + 1);
  const l = loops.get(key); if (!l || !ctx) return;
  loops.delete(key);
  l.gain.gain.cancelScheduledValues(ctx.currentTime);
  l.gain.gain.setValueAtTime(l.gain.gain.value, ctx.currentTime);
  l.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  l.src.stop(ctx.currentTime + 0.9);
}

/** Replace the playing ambience loops with this set. */
export function setAmbience(list: Ambient[]) {
  const s = loadSettings();
  for (const k of [...loops.keys()]) if (k.startsWith("amb:") && (!s.sound || !list.includes(k.slice(4) as Ambient))) stopLoop(k);
  if (s.sound) for (const a of list) void startLoop(`amb:${a}`, a, a === "wind" || a === "rain" ? 0.35 : 0.45);
}

let currentTrack: Track = "music";
export function currentMusic() { return currentTrack; }
export function setMusic(on: boolean, volume = 0.3, track: Track = "music") {
  if (track !== currentTrack) { stopLoop("music"); currentTrack = track; }
  if (on && loadSettings().music) {
    const l = loops.get("music");
    if (l && ctx) l.gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6);
    else void startLoop("music", track, volume);
  } else stopLoop("music");
}
