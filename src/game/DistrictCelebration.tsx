// A continuous painted scene: finish the roof, then reveal the next district.
import { useEffect, useRef } from "react";
import { ArrowRight, Map, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { districtFloors, districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, districtStars, LEVELS_PER_DISTRICT, type Stars } from "./levels";
import { confettiSrc, getImage, roofSrc } from "./preload";
import { birdPath } from "./sky";
import { sfx } from "./audio";
import contactSrc from "@/assets/painted-ground-contact.webp";
import footingSrc from "@/assets/storybook-footing.webp";
import ambientSrc from "@/assets/ambient.webp";

const ease = (t: number) => { const n = Math.max(0, Math.min(1, t)); return n * n * (3 - 2 * n); };

export function DistrictCelebration({ district, stars, onNext, onMap }: { district: number; stars: Stars; onNext?: (() => void) | undefined; onMap: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = DISTRICTS[district], next = DISTRICTS[district + 1] ?? null;

  useEffect(() => {
    const el = canvas.current;
    if (!el || !done) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const tablet = window.matchMedia("(min-width: 600px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const art = tablet ? tabletArtwork : phoneArtwork;
    const cloud = getImage(art.cloudSrc), bird = getImage(art.birdSrc), ambient = getImage(ambientSrc);
    const from = { street: getImage(districtStreet(done.id, tablet)), floors: districtFloors(done.id, tablet).map(getImage) };
    const to = next ? { street: getImage(districtStreet(next.id, tablet)), floors: districtFloors(next.id, tablet).map(getImage) } : null;
    const roof = getImage(roofSrc), contact = getImage(contactSrc), footing = getImage(footingSrc), confetti = getImage(confettiSrc);
    let frame = 0, start = 0, width = 394, pausedAt = 0;
    const resize = () => {
      const bounds = el.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(bounds.width * ratio); el.height = Math.round(bounds.height * ratio);
      width = bounds.width / Math.max(1, bounds.height) * 700;
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    const paint = (scene: typeof from, count: number, roofDrop: number, alpha: number) => {
      ctx.save(); ctx.globalAlpha = alpha;
      const street = scene.street;
      const scale = Math.max(width / street.naturalWidth, 700 / street.naturalHeight);
      ctx.drawImage(street, (width - street.naturalWidth * scale) / 2, (700 - street.naturalHeight * scale) / 2, street.naturalWidth * scale, street.naturalHeight * scale);
      const bw = 90, bh = bw * 250 / 420, ground = 534;
      // Same stone footing, pigment joins and painted proportions as gameplay.
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= 0.35;
      ctx.drawImage(contact, width / 2 - 74, ground + 14, 148, 9); ctx.restore();
      ctx.drawImage(footing, width / 2 - 56, ground - 1, 112, 25);
      for (let i = 0; i < count; i++) {
        const tile = scene.floors[i === 0 ? 3 : (i - 1) % 3];
        if (!tile) continue;
        ctx.drawImage(tile, width / 2 - bw / 2, ground - (i + 1) * bh, bw, bh);
        if (i > 0) {
          ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= 0.15;
          ctx.drawImage(contact, width / 2 - bw / 2, ground - i * bh - 2, bw, 4); ctx.restore();
        }
      }
      const rw = bw * 1.06, rh = rw * roof.naturalHeight / roof.naturalWidth;
      ctx.drawImage(roof, width / 2 - rw / 2, ground - count * bh - rh + 2 - roofDrop, rw, rh);
      ctx.restore();
    };
    const draw = (now: number) => {
      if (!start) start = now;
      const t = reduce ? 6 : (now - start) / 1000;
      ctx.setTransform(el.width / width, 0, 0, el.height / 700, 0, 0);
      ctx.clearRect(0, 0, width, 700);
      const reveal = to ? ease((t - 3.1) / 1.6) : 0;
      paint(from, 5, (1 - ease((t - 0.25) / 1.1)) * 85, 1);
      if (to && reveal > 0) paint(to, 3, 0, reveal);
      // Painted sky life stays behind the tower silhouette and clear of the headings.
      for (let i = 0; i < 2; i++) {
        const cw = 82 + i * 24, ch = cw * cloud.naturalHeight / cloud.naturalWidth;
        const x = (i === 0 ? -32 : width - 70) + Math.sin(t * 0.16 + i * 2) * 18;
        ctx.save(); ctx.globalAlpha = 0.42;
        ctx.drawImage(cloud, x, 190 + i * 34, cw, ch); ctx.restore();
      }
      if (!reduce) {
        for (let i = 0; i < 2; i++) {
          const m = birdPath(i, t, width, 700, 0.27, 0.08);
          const sw = bird.naturalWidth / 6, s = 13 * m.scale;
          ctx.save(); ctx.globalAlpha = 0.68; ctx.translate(m.x, m.y); ctx.rotate(m.mirror ? -m.rot : m.rot);
          if (m.mirror) ctx.scale(-1, 1);
          ctx.drawImage(bird, m.pose * sw, 0, sw, bird.naturalHeight, -s / 2, -s * 1.28, s, s * 1.28);
          ctx.restore();
        }
        // A few turning painted petals linger at the edges, never an endless confetti curtain.
        for (let i = 0; i < 5; i++) {
          const y = 210 + ((t * (12 + i) + i * 67) % 330);
          const side = i % 2 ? 1 : -1;
          const x = width / 2 + side * (width * 0.36 + Math.sin(t * 0.8 + i * 2) * 13);
          const cell = ambient.naturalWidth / 7;
          ctx.save(); ctx.globalAlpha = 0.6;
          ctx.translate(x, y); ctx.rotate(Math.sin(t + i) * 0.7);
          ctx.drawImage(ambient, cell, 0, cell, ambient.naturalHeight, -4, -4, 8, 8);
          ctx.restore();
        }
      }
      // One restrained celebratory burst, not an endless confetti curtain.
      if (!reduce && t > 1.25 && t < 4.8) {
        for (let i = 0; i < 24; i++) {
          const age = t - 1.25 - (i % 6) * 0.055;
          if (age < 0) continue;
          const side = i % 2 ? 1 : -1, velocity = 24 + (i * 17) % 70;
          const x = width / 2 + side * (12 + velocity * age);
          const y = 252 - (75 + (i * 11) % 60) * age + 65 * age * age;
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 3.2);
          ctx.translate(x, y); ctx.rotate(side * age * 2);
          ctx.drawImage(confetti, (i % 6) * confetti.naturalWidth / 6, 0, confetti.naturalWidth / 6, confetti.naturalHeight, -3, -4.5, 6, 9);
          ctx.restore();
        }
      }
      if (!reduce && !document.hidden) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const resume = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) pausedAt = performance.now();
      else {
        if (pausedAt && start) start += performance.now() - pausedAt;
        pausedAt = 0;
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", resume);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", resume); };
  }, [done, next]);

  useEffect(() => {
    void sfx("clear", 0.8);
    const timers = [window.setTimeout(() => void sfx("perfect", 0.6, 1.2), 1700), window.setTimeout(() => void sfx("perfect", 0.6, 1.5), 2600)];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  if (!done) return null;
  return (
    <main className="celebrate fixed inset-0 flex justify-center overflow-hidden bg-game-shell">
      <div className="game-viewport celebrate-stage relative h-full overflow-hidden">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img" aria-label={`${done.name} tower completed${next ? `, revealing ${next.name}` : ", city complete"}`} />
        <header className={`celebrate-heading ${next ? "has-next" : ""}`}>
          <div className="celebrate-completed">
            <span className="celebrate-eyebrow">{next ? "DISTRICT COMPLETE" : "CITY COMPLETE"}</span>
            <h1>{done.name}</h1>
            <div className="celebrate-rating"><Star className="h-4 w-4 fill-current" /><strong>{districtStars(stars, district)}</strong><span>/ {LEVELS_PER_DISTRICT * 3}</span></div>
          </div>
          {next && <div className="celebrate-destination"><span className="celebrate-eyebrow">NEXT DISTRICT UNLOCKED</span><h2>{next.name}</h2><p>{next.obstacle}</p></div>}
        </header>
        <div className="celebrate-actions">
          {next && onNext ? <Button variant="ghost" className="plaque celebrate-primary" onClick={onNext}>Build in {next.name}<ArrowRight /></Button> : <p className="celebrate-finale">All ten districts. One city in the clouds.</p>}
          <Button variant="ghost" className="plaque celebrate-map-button" onClick={onMap}><Map />City map</Button>
        </div>
      </div>
    </main>
  );
}