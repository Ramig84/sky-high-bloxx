import { useEffect, useRef } from "react";
import { birdPath, restingBird } from "./sky";
import { frameDelta } from "./frameClock";
import { subscribeActivity } from "./activity";

/** Painted birds for menu screens, flying the same natural path as in the game (no CSS sliding). */
export function SkyBirds({ src, count = 2, top = 0.14, band = 0.18 }: { src: string; count?: number; top?: number; band?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const birds = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const element = box.current;
    if (!element) return;
    let frame = 0, time = 0, last = performance.now(), active = true;
    let vw = element.clientWidth, vh = element.clientHeight;
    const paint = () => {
      birds.current.forEach((b, i) => {
        if (!b) return;
        const m = media.matches ? restingBird(i, vw, vh, top, band) : birdPath(i, time, vw, vh, top, band);
        b.style.transform = `translate(${m.x - 14}px, ${m.y - 36}px) rotate(${m.mirror ? -m.rot : m.rot}rad) scale(${m.mirror ? -m.scale : m.scale}, ${m.scale})`;
        b.style.backgroundPosition = `${m.pose * 20}% 0`;
      });
    };
    const tick = (now: number) => {
      time += frameDelta(last, now, !active);
      last = now;
      if (active) paint();
      if (!media.matches && active) frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (active) paint();
      if (active && !media.matches) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => { vw = element.clientWidth; vh = element.clientHeight; if (active) paint(); });
    resize.observe(element);
    const unsubscribe = subscribeActivity(value => { active = value; visibility(); });
    media.addEventListener("change", visibility);
    return () => { unsubscribe(); cancelAnimationFrame(frame); resize.disconnect(); media.removeEventListener("change", visibility); };
  }, [top, band, count, src]);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} ref={el => { birds.current[i] = el; }} className="sky-bird" style={{ backgroundImage: `url(${src})`, transform: "translate(-60px, -60px)" }} />
      ))}
    </div>
  );
}
