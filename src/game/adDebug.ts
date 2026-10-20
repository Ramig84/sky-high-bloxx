/** Test-build ad debugging: an event timeline and per-second frame stats, shown only when ads run in testing mode. */
export type FrameStats = { fps: number; drawMs: number; worstMs: number };

const start = typeof performance !== "undefined" ? performance.now() : 0;
const events: string[] = [];
const history: FrameStats[] = [];
let listener: (() => void) | null = null;

export const onAdDebugChange = (fn: (() => void) | null) => { listener = fn; };

/** Records a timestamped ad step (load, open, close, countdown) for the on-screen timeline. */
export function logAdEvent(label: string) {
  const t = ((performance.now() - start) / 1000).toFixed(1);
  events.unshift(`${t}s ${label}`);
  events.length = Math.min(events.length, 8);
  listener?.();
}

/** Summarises one second of frames: frame rate, average drawing time and slowest frame gap. */
export function summariseFrames(gaps: number[], draws: number[]): FrameStats {
  const total = gaps.reduce((a, b) => a + b, 0);
  return {
    fps: total > 0 ? Math.round((gaps.length * 1000) / total) : 0,
    drawMs: draws.length ? Math.round((draws.reduce((a, b) => a + b, 0) / draws.length) * 10) / 10 : 0,
    worstMs: gaps.length ? Math.round(Math.max(...gaps)) : 0,
  };
}

export function pushFrameStats(stats: FrameStats) {
  history.unshift(stats);
  history.length = Math.min(history.length, 6);
  listener?.();
}

export const adDebugEvents = () => events.slice();
export const adDebugHistory = () => history.slice();
