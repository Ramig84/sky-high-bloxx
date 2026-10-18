import { useEffect, useRef } from "react";
import { birdPath } from "./sky";

/** Painted birds for menu screens, flying the same natural path as in the game (no CSS sliding). */
export function SkyBirds({ src, count = 2, top = 0.14, band = 0.18 }: { src: string; count?: number; top?: number; band?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const birds = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, time = 0, last = performance.now();
    const tick = (now: number) => {
      time += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const el = box.current;
      if (el && !document.hidden) {
        const vw = el.clientWidth, vh = el.clientHeight, t = time;
        birds.current.forEach((b, i) => {
          if (!b) return;
          const m = birdPath(i, t, vw, vh, top, band);
          b.style.transform = `translate(${m.x - 14}px, ${m.y - 36}px) rotate(${m.mirror ? -m.rot : m.rot}rad) scale(${m.mirror ? -m.scale : m.scale}, ${m.scale})`;
          b.style.backgroundPosition = `${m.pose * 20}% 0`;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", visibility); };
  }, [top, band]);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} ref={el => { birds.current[i] = el; }} className="sky-bird" style={{ backgroundImage: `url(${src})`, transform: "translate(-60px, -60px)" }} />
      ))}
    </div>
  );
}
