// Player settings kept on the device.
export type Settings = { name: string; sound: boolean; music: boolean; soundVolume: number; musicVolume: number; vibrate: boolean; playerId: string };
export const SETTINGS_EVENT = "bloxx-settings-change";
export const volumeValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
const KEY = "bloxx-settings";

export function loadSettings(): Settings {
  let v: Partial<Settings> = {};
  try { v = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
  const s: Settings = {
    name: typeof v.name === "string" && v.name.trim() ? v.name.slice(0, 16) : "Builder",
    sound: v.sound ?? localStorage.getItem("bloxx-muted") !== "1",
    music: v.music ?? true,
    soundVolume: volumeValue(v.soundVolume),
    musicVolume: volumeValue(v.musicVolume),
    vibrate: v.vibrate ?? true,
    playerId: typeof v.playerId === "string" ? v.playerId : crypto.randomUUID(),
  };
  if (!v.playerId) saveSettings(s);
  return s;
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  localStorage.setItem("bloxx-muted", s.sound ? "0" : "1");
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export const vibrate = (ms: number) => { if (loadSettings().vibrate) navigator.vibrate?.(ms); };

export function resetProgress() {
  for (const k of ["bloxx-stars", "bloxx-best", "bloxx-endless-best"]) localStorage.removeItem(k);
}
