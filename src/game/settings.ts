// Player settings kept on the device.
export type Settings = { name: string; sound: boolean; music: boolean; vibrate: boolean; playerId: string };
const KEY = "bloxx-settings";

export function loadSettings(): Settings {
  let v: Partial<Settings> = {};
  try { v = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* ignore */ }
  const s: Settings = {
    name: typeof v.name === "string" && v.name.trim() ? v.name.slice(0, 16) : "Builder",
    sound: v.sound ?? localStorage.getItem("bloxx-muted") !== "1",
    music: v.music ?? true,
    vibrate: v.vibrate ?? true,
    playerId: typeof v.playerId === "string" ? v.playerId : crypto.randomUUID(),
  };
  if (!v.playerId) saveSettings(s);
  return s;
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  localStorage.setItem("bloxx-muted", s.sound ? "0" : "1");
}

export const vibrate = (ms: number) => { if (loadSettings().vibrate) navigator.vibrate?.(ms); };

export function resetProgress() {
  for (const k of ["bloxx-stars", "bloxx-best", "bloxx-endless-best"]) localStorage.removeItem(k);
}
