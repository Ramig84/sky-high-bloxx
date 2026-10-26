/** Test-only phone diagnostics: measures, never changes rules, rewards or progress. Hidden until 5 taps on "Paused". */
export type DiagSharpness = "full" | "low";
type DiagState = { open: boolean; silent: boolean; sharpness: DiagSharpness };

const KEY = "bloxx-diag-sharpness";
let state: DiagState = { open: false, silent: false, sharpness: "full" };
const listeners = new Set<() => void>();
try { if (typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "low") state.sharpness = "low"; } catch { /* storage blocked */ }

export const diagState = () => state;
export function setDiag(patch: Partial<DiagState>) {
  state = { ...state, ...patch };
  try { if (patch.sharpness) localStorage.setItem(KEY, patch.sharpness); } catch { /* storage blocked */ }
  for (const l of listeners) l();
}
export function subscribeDiag(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Drawing density used by the canvas; "low" is a switch the tester flips, never automatic. */
export const diagPixelRatio = (dpr: number) => (state.sharpness === "low" ? 1 : dpr);

const draws: number[] = [];
export function recordDraw(ms: number) { draws.push(ms); if (draws.length > 120) draws.shift(); }
export function averageDraw() { return draws.length ? draws.reduce((a, b) => a + b, 0) / draws.length : 0; }

/** Five taps within 2.5 s opens the panel. */
export function tapCounter(now = () => Date.now()) {
  let taps: number[] = [];
  return () => {
    const t = now();
    taps = [...taps.filter(x => t - x < 2500), t];
    if (taps.length >= 5) { taps = []; return true; }
    return false;
  };
}
