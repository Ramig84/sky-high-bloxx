// Browser-safe city map rules: zones, tower goals and unlock progression.
export type ZoneId = "oldtown" | "harbour" | "downtown";
export type Zone = { id: ZoneId; name: string; goal: number; mapX: number; mapY: number };

export const ZONES: Zone[] = [
  { id: "oldtown", name: "Old Town", goal: 10, mapX: 53, mapY: 75 },
  { id: "harbour", name: "Harbour", goal: 15, mapX: 50, mapY: 39 },
  { id: "downtown", name: "Downtown", goal: 20, mapX: 53, mapY: 17 },
];

export type ZoneProgress = Partial<Record<ZoneId, number>>; // best floors per zone

export function isUnlocked(progress: ZoneProgress, index: number): boolean {
  if (index <= 0) return true;
  const prev = ZONES[index - 1];
  if (!prev) return false;
  return (progress[prev.id] ?? 0) >= prev.goal;
}

export function isComplete(progress: ZoneProgress, id: ZoneId): boolean {
  const z = ZONES.find(z => z.id === id);
  return !!z && (progress[id] ?? 0) >= z.goal;
}

export function recordFloors(progress: ZoneProgress, id: ZoneId, floors: number): ZoneProgress {
  return (progress[id] ?? 0) >= floors ? progress : { ...progress, [id]: floors };
}

const KEY = "bloxx-zones";
export function loadProgress(): ZoneProgress {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as ZoneProgress; } catch { return {}; }
}
export function saveProgress(p: ZoneProgress) { localStorage.setItem(KEY, JSON.stringify(p)); }
