import { useEffect, useRef } from "react";
import { getImage } from "./preload";
import { atmosphereArtwork, drawAtmosphere } from "./paintedAtmosphere";

export function PaintedClouds({ map = false }: { map?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const image = getImage(atmosphereArtwork.cloud);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, time = 0, last = performance.now();
    const draw = (now: number) => {
      if (!document.hidden) time += Math.min(0.05, (now - last) / 1000);
      last = now;
      const bounds = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(bounds.width * dpr), h = Math.round(bounds.height * dpr);
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) drawAtmosphere(ctx, image, reduce ? 0 : time, i * 2.3, w * (i % 2 ? 0.74 : -0.1), h * ((map ? 0.16 : 0.03) + i * (map ? 0.24 : 0.13)), w * (0.38 + i * 0.025), 0.32);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [map]);
  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}