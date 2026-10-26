import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { averageDraw, diagState, setDiag, subscribeDiag } from "./diagnostics";

type Reading = { fps: number; worst: number; draw: number; busy: number; images: number; mb: number; focus: string; heap: string };

/** Measures the phone itself: frame rate, the game's own draw time, and main-thread blocking (busy ms/s). */
export function DiagnosticsPanel() {
  const s = useSyncExternalStore(subscribeDiag, diagState, diagState);
  const [r, setR] = useState<Reading | null>(null);
  const busy = useRef(0);
  useEffect(() => {
    if (!s.open) return;
    let frames = 0, worst = 0, last = performance.now(), start = last, raf = 0;
    const tick = (now: number) => { frames++; worst = Math.max(worst, now - last); last = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    let obs: PerformanceObserver | undefined;
    try {
      obs = new PerformanceObserver(list => { for (const e of list.getEntries()) busy.current += e.duration; });
      obs.observe({ type: "longtask", buffered: false });
    } catch { /* long-task timing unsupported */ }
    const id = window.setInterval(() => {
      const now = performance.now(), secs = (now - start) / 1000;
      const imgs = [...document.images, ...[]] as HTMLImageElement[];
      let px = 0, count = 0;
      for (const e of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) if (/\.(webp|png|jpe?g)/.test(e.name)) count++;
      for (const i of imgs) px += i.naturalWidth * i.naturalHeight;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      setR({ fps: Math.round(frames / secs), worst: Math.round(worst), draw: averageDraw(), busy: Math.round(busy.current / secs), images: count, mb: Math.round(px * 4 / 1048576),
        focus: `${document.hidden ? "hidden" : "visible"}/${document.hasFocus() ? "focused" : "unfocused"}`, heap: mem ? `${Math.round(mem.usedJSHeapSize / 1048576)} MB` : "n/a" });
      frames = 0; worst = 0; busy.current = 0; start = now;
    }, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(id); obs?.disconnect(); };
  }, [s.open]);
  if (!s.open) return null;
  return (
    <div className="absolute left-2 top-24 z-50 w-56 rounded-md bg-game-shell/85 p-2 font-mono text-[11px] leading-4 text-primary-foreground" onPointerDown={e => e.stopPropagation()}>
      <div className="mb-1 flex justify-between font-bold"><span>TEST PANEL</span><button onClick={() => setDiag({ open: false })}>×</button></div>
      {r ? <>
        <div>FPS {r.fps} · worst gap {r.worst} ms</div>
        <div>Game draw {r.draw.toFixed(1)} ms/frame</div>
        <div>Main thread blocked {r.busy} ms/s</div>
        <div>Images requested {r.images} · DOM pics ~{r.mb} MB</div>
        <div>JS memory {r.heap}</div>
        <div>Window {r.focus}</div>
      </> : <div>Measuring…</div>}
      <div className="mt-1 flex gap-1">
        <button className="flex-1 rounded bg-primary/70 px-1 py-1" onClick={() => setDiag({ silent: !s.silent })}>Sound {s.silent ? "OFF" : "ON"}</button>
        <button className="flex-1 rounded bg-primary/70 px-1 py-1" onClick={() => setDiag({ sharpness: s.sharpness === "full" ? "low" : "full" })}>Sharp {s.sharpness === "full" ? "FULL" : "LOW"}</button>
      </div>
      <div className="mt-1 opacity-80">Low FPS + small draw + low blocked = phone throttling the app, not game code.</div>
    </div>
  );
}
