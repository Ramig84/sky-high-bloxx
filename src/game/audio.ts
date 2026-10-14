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
import { loadSettings } from "./settings";
import type { DistrictId, LevelSpec } from "./levels";

const SRC = { drop, perfect, miss, release, collapse, clear, tap, wind, waves, birds, train, city, night, rain, music } as const;
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

export async function sfx(name: Sound, volume = 0.8, rate = 1) {
  if (!loadSettings().sound) return;
  const c = context(), b = await buffer(name);
  if (!c || !b) return;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = b; src.playbackRate.value = rate; g.gain.value = volume;
  src.connect(g).connect(c.destination); src.start();
}

async function startLoop(key: string, name: Sound, volume: number) {
  if (loops.has(key)) return;
  const c = context(), b = await buffer(name);
  if (!c || !b || loops.has(key)) return;
  const src = c.createBufferSource(), gain = c.createGain();
  src.buffer = b; src.loop = true;
  gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(volume, c.currentTime + 1.5);
  src.connect(gain).connect(c.destination); src.start();
  loops.set(key, { src, gain });
}
function stopLoop(key: string) {
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

export function setMusic(on: boolean, volume = 0.3) {
  if (on && loadSettings().music) {
    const l = loops.get("music");
    if (l && ctx) l.gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6);
    else void startLoop("music", "music", volume);
  } else stopLoop("music");
}
