import { useEffect, useRef } from "react";
import { birdPath, restingBird } from "./sky";

/** Painted birds for menu screens, flying the same natural path as in the game (no CSS sliding). */
export function SkyBirds({ src, count = 2, top = 0.14, band = 0.18 }: { src: string; count?: number; top?: number; band?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const birds = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, time = 0, last = performance.now();
    const paint = () => {
      const el = box.current;
      if (!el) return;
      const vw = el.clientWidth, vh = el.clientHeight;
      birds.current.forEach((b, i) => {
        if (!b) return;
        const m = media.matches ? restingBird(i, vw, vh, top, band) : birdPath(i, time, vw, vh, top, band);
        b.style.transform = `translate(${m.x - 14}px, ${m.y - 36}px) rotate(${m.mirror ? -m.rot : m.rot}rad) scale(${m.mirror ? -m.scale : m.scale}, ${m.scale})`;
        b.style.backgroundPosition = `${m.pose * 20}% 0`;
      });
    };
    const tick = (now: number) => {
      time += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!document.hidden) paint();
      if (!media.matches && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      paint();
      if (!document.hidden && !media.matches) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(paint);
    if (box.current) resize.observe(box.current);
    visibility();
    media.addEventListener("change", visibility);
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); media.removeEventListener("change", visibility); document.removeEventListener("visibilitychange", visibility); };
  }, [top, band, count]);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} ref={el => { birds.current[i] = el; }} className="sky-bird" style={{ backgroundImage: `url(${src})`, transform: "translate(-60px, -60px)" }} />
      ))}
    </div>
  );
}
