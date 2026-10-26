import { useEffect, useRef } from "react";
import { getImage } from "./preload";
import { atmosphereArtwork, drawAtmosphere } from "./paintedAtmosphere";
import { canvasResolution } from "./canvasResolution";
import { frameDelta } from "./frameClock";
import { subscribeActivity } from "./activity";

export function PaintedClouds({ map = false }: { map?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const image = getImage(atmosphereArtwork.cloud);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0, time = 0, last = performance.now(), active = true;
    const resize = () => {
      const bounds = el.getBoundingClientRect();
      const { width, height } = canvasResolution(bounds.width, bounds.height, window.devicePixelRatio);
      if (el.width !== width || el.height !== height) { el.width = width; el.height = height; }
      if (media.matches && active) schedule();
    };
    const draw = (now: number) => {
      raf = 0;
      if (active) time += frameDelta(last, now, false);
      last = now;
      if (!active) return;
      const w = el.width, h = el.height;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) drawAtmosphere(ctx, image, media.matches ? 0 : time, i * 2.3, w * (i % 2 ? 0.74 : -0.1), h * ((map ? 0.16 : 0.03) + i * (map ? 0.24 : 0.13)), w * (0.38 + i * 0.025), 0.32);
      if (!media.matches) raf = requestAnimationFrame(draw);
    };
    function schedule() {
      cancelAnimationFrame(raf);
      raf = 0;
      last = performance.now();
      if (active) raf = requestAnimationFrame(draw);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const unsubscribe = subscribeActivity(value => { active = value; schedule(); });
    image.addEventListener("load", schedule);
    window.addEventListener("resize", resize);
    media.addEventListener("change", schedule);
    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      observer.disconnect();
      image.removeEventListener("load", schedule);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", schedule);
    };
  }, [map]);
  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
