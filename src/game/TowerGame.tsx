import { useEffect, useRef, useState } from "react";
import b1 from "@/assets/floor-1.jpg";
import b2 from "@/assets/floor-2.jpg";
import b3 from "@/assets/floor-3.jpg";
import bg0 from "@/assets/floor-ground.jpg";
import streetSrc from "@/assets/bg-street.jpg";
import cloudsSrc from "@/assets/bg-clouds.jpg";
import sunsetSrc from "@/assets/bg-sunset.jpg";
import spaceSrc from "@/assets/bg-space.jpg";
import hookSrc from "@/assets/hook.png";
import residentSrc from "@/assets/resident.png";
import { BLOCK_W as BW, BLOCK_H as BH, advanceSwing, classifyLanding, collapseIndex, floorSway, integrateFall } from "./motion";

const VH = 640; // logical height
const GROUND_SCREEN = 400; // screen y of plot at camera 0
const PIVOT_SCREEN = 36;
const ROPE = 150;
const GRAVITY = 1500;
const SWING = 0.42; // max swing angle (rad)
const HOOK_GAP = 16;

type Floor = { x: number; skin: number };
type Faller = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; skin: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
type Resident = { sx: number; sy: number; tx: number; ty: number; t: number };
type Hud = { score: number; floors: number; lives: number; combo: number; best: number; over: boolean; msg: string; msgKey: number };

function load(src: string) { const i = new Image(); i.src = src; return i; }

export function TowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<Hud>({ score: 0, floors: 0, lives: 3, combo: 0, best: 0, over: false, msg: "", msgKey: 0 });
  const api = useRef<{ tap: () => void; restart: () => void }>({ tap: () => {}, restart: () => {} });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const skins = [load(b1), load(b2), load(b3), load(bg0)];
    const street = load(streetSrc), clouds = load(cloudsSrc), sunset = load(sunsetSrc), space = load(spaceSrc);
    const hook = load(hookSrc), resident = load(residentSrc);
    let audio: AudioContext | null = null;
    // Street backdrop with a soft painted fade at its top so it blends into the sky when scrolling away.
    const streetFaded = document.createElement("canvas");
    let faded = false;
    const buildFade = () => {
      faded = true;
      streetFaded.width = street.naturalWidth; streetFaded.height = street.naturalHeight;
      const c = streetFaded.getContext("2d")!;
      c.drawImage(street, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, street.naturalHeight * 0.3);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalCompositeOperation = "destination-out"; c.fillStyle = g;
      c.fillRect(0, 0, street.naturalWidth, street.naturalHeight * 0.3);
    };

    let scale = 1, vw = 360;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      scale = (window.innerHeight * dpr) / VH;
      vw = canvas.width / scale;
    };
    resize(); window.addEventListener("resize", resize);

    const best0 = Number(localStorage.getItem("bloxx-best") || 0);
    let s = fresh();
    function fresh() {
      return { floors: [] as Floor[], fallers: [] as Faller[], parts: [] as Particle[], res: [] as Resident[],
        phase: 0, t: 0, camY: 0, held: true, drop: null as null | { x: number; y: number; vx: number; vy: number; rot: number },
        nextSkin: 3, score: 0, lives: 3, combo: 0, best: best0, over: false, sway: 0, shake: 0 };
    }
    const publish = (msg = "") => setHud(h => ({ score: s.score, floors: s.floors.length, lives: s.lives, combo: s.combo, best: s.best, over: s.over, msg: msg || h.msg, msgKey: msg ? h.msgKey + 1 : h.msgKey }));

    const chime = (freq: number, dur = 0.25) => {
      if (!audio) return;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
    };

    const topY = () => s.floors.length * BH;
    const displayX = (i: number) => (s.floors[i]?.x ?? 0) + floorSway(s.sway, i) * BW * 0.5;
    const level = () => s.floors.length;
    const pivot = () => ({ x: Math.sin(s.t * 0.35) * Math.min(level() * 3, 70), y: s.camY + GROUND_SCREEN - PIVOT_SCREEN });
    const hung = () => {
      // Rope, hook and block swing as one rigid pendulum so the block never detaches from the hook.
      const th = SWING * Math.sin(s.phase), p = pivot(), dist = ROPE + HOOK_GAP + BH / 2;
      return { x: p.x + Math.sin(th) * dist, y: p.y - Math.cos(th) * dist, th, p };
    };

    api.current.tap = () => {
      if (!audio) { try { audio = new AudioContext(); } catch { /* no audio */ } }
      if (s.over || !s.held) return;
      const h = hung();
      const dth = SWING * Math.cos(s.phase) * Math.min(1.9 + level() * 0.03, 3.2);
      s.drop = { x: h.x, y: h.y, vx: Math.cos(h.th) * ROPE * dth * 0.2, vy: 0, rot: -h.th };
      s.held = false;
    };
    api.current.restart = () => { s = fresh(); publish(" "); };

    const loseLife = (msg: string) => {
      s.lives--; s.combo = 0; s.shake = 10; chime(160, 0.4);
      navigator.vibrate?.(120);
      if (s.lives <= 0) {
        s.over = true;
        if (s.score > s.best) { s.best = s.score; localStorage.setItem("bloxx-best", String(s.best)); }
      }
      publish(msg);
    };

    const land = (d: { x: number; vx: number }) => {
      const n = s.floors.length;
      const support = n === 0 ? 0 : displayX(n - 1);
      const off = d.x - support;
      const kind = classifyLanding(off, BW, n === 0);
      const skin = s.nextSkin;
      if (kind === "miss") {
        s.fallers.push({ x: d.x, y: topY() + BH / 2, vx: d.vx + Math.sign(off) * 80, vy: 0, rot: 0, vr: Math.sign(off) * 4, skin });
        loseLife("MISS!");
      } else {
        const base = n === 0 ? 0 : s.floors[n - 1]!.x;
        const x = kind === "perfect" ? base : base + off;
        s.floors.push({ x, skin });
        if (kind === "perfect") {
          s.combo++; s.score += 25 * Math.min(s.combo, 10);
          chime(523 * Math.pow(1.122, Math.min(s.combo, 8))); chime(784, 0.35);
          navigator.vibrate?.(30);
          for (let i = 0; i < 40; i++) s.parts.push({ x, y: topY(), vx: (Math.random() - 0.5) * 420, vy: 200 + Math.random() * 350, life: 1.4, hue: Math.random() * 360 });
          for (let i = 0; i < 2; i++) s.res.push({ sx: (i ? 1 : -1) * (vw / 2 + 20), sy: s.camY, tx: x + (i ? 22 : -22), ty: topY() - BH * 0.55, t: 0 });
        } else { s.combo = 0; s.score += 10; chime(330, 0.15); }
        s.shake = 3;
        const xs = s.floors.map(f => f.x);
        const ci = collapseIndex(xs, BW);
        if (ci >= 0) {
          const gone = s.floors.splice(ci + 1);
          gone.forEach((f, k) => {
            const dir = Math.sign(f.x - xs[ci]!) || 1;
            s.fallers.push({ x: f.x, y: (ci + 1 + k) * BH + BH / 2, vx: dir * (60 + k * 20), vy: 0, rot: 0, vr: dir * (1.5 + k * 0.3), skin: f.skin });
          });
          loseLife("COLLAPSE!");
        } else publish(kind === "perfect" ? `PERFECT ×${Math.min(s.combo, 10)}` : "");
      }
      s.nextSkin = s.floors.length === 0 ? 3 : (s.nextSkin + 1 + Math.floor(Math.random() * 2)) % 3;
      s.held = true;
    };

    const toScreenY = (wy: number) => GROUND_SCREEN - (wy - s.camY);

    const drawCover = (img: HTMLImageElement | HTMLCanvasElement, alpha: number, yOff: number) => {
      const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
      const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
      if (!iw || alpha <= 0) return;
      const sc = Math.max(vw / iw, VH / ih);
      const w = iw * sc, h = ih * sc;
      ctx.globalAlpha = alpha; ctx.drawImage(img, (vw - w) / 2, (VH - h) / 2 + yOff, w, h); ctx.globalAlpha = 1;
    };
    const drawBlock = (skin: number, cx: number, cyScreen: number, rot = 0, shadow = false) => {
      const img = skins[skin]!;
      ctx.save(); ctx.translate(vw / 2 + cx, cyScreen); if (rot) ctx.rotate(rot);
      if (shadow) { ctx.fillStyle = "rgba(20,10,30,0.25)"; ctx.fillRect(-BW / 2, BH / 2 - 2, BW, 4); }
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(img, -BW / 2, -BH / 2, BW, BH);
        ctx.strokeStyle = "rgba(40,20,10,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(-BW / 2 + 0.5, -BH / 2 + 0.5, BW - 1, BH - 1);
      }
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
      s.t += dt;
      if (!s.over) s.phase = advanceSwing(s.phase, level(), dt);

      // lean & sway
      const n = s.floors.length;
      const com = n ? s.floors.reduce((a, f) => a + f.x, 0) / n : 0;
      const lean = Math.max(-1.6, Math.min(1.6, (com - (s.floors[0]?.x ?? 0)) / (BW * 0.5)));
      s.sway = lean * 0.6 + Math.sin(s.t * 1.5) * (0.1 + Math.min(n, 30) * 0.012 + Math.abs(lean) * 0.5);

      // drop
      if (s.drop) {
        const prevBottom = s.drop.y - BH / 2;
        integrateFall(s.drop, dt, GRAVITY);
        s.drop.rot *= Math.exp(-dt * 14); // settle level while falling
        if (prevBottom >= topY() && s.drop.y - BH / 2 <= topY()) { const d = s.drop; s.drop = null; land(d); }
      }
      for (const f of s.fallers) { integrateFall(f, dt, GRAVITY); f.rot += f.vr * dt; }
      s.fallers = s.fallers.filter(f => f.y > s.camY - 800);
      for (const p of s.parts) { integrateFall(p, dt, 700); p.life -= dt; }
      s.parts = s.parts.filter(p => p.life > 0);
      for (const r of s.res) r.t += dt * 1.4;
      s.res = s.res.filter(r => r.t < 1);

      const target = Math.max(0, topY() - BH * 1.2);
      s.camY += (target - s.camY) * Math.min(1, dt * 3);
      s.shake *= 0.88;

      // render
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const alt = s.camY;
      const a = (lo: number, hi: number) => Math.max(0, Math.min(1, (alt - lo) / (hi - lo)));
      drawCover(clouds, 1, 0);
      drawCover(sunset, a(1200, 2000), 0);
      drawCover(space, a(3000, 3800), 0);
      if (!faded && street.complete && street.naturalWidth) buildFade();
      drawCover(faded ? streetFaded : street, 1 - a(400, 900), alt * 0.9);
      if (s.shake > 0.3) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);

      for (let i = 0; i < n; i++) drawBlock(s.floors[i]!.skin, displayX(i), toScreenY(i * BH + BH / 2), 0, true);
      for (const f of s.fallers) drawBlock(f.skin, f.x, toScreenY(f.y), f.rot);

      // crane
      const h = hung();
      ctx.save();
      ctx.translate(vw / 2 + h.p.x, toScreenY(h.p.y)); ctx.rotate(-h.th);
      ctx.strokeStyle = "rgba(40,40,50,0.9)"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, ROPE - 20); ctx.stroke();
      if (hook.complete) ctx.drawImage(hook, -12, ROPE - 26, 24, 35);
      ctx.restore();
      if (s.held && !s.over) drawBlock(s.nextSkin, h.x, toScreenY(h.y), -h.th);
      if (s.drop) drawBlock(s.nextSkin, s.drop.x, toScreenY(s.drop.y), s.drop.rot);

      // residents
      if (resident.complete) for (const r of s.res) {
        const x = r.sx + (r.tx - r.sx) * r.t, y = r.sy + (r.ty - r.sy) * r.t + Math.sin(r.t * Math.PI) * 140;
        ctx.globalAlpha = r.t > 0.85 ? (1 - r.t) / 0.15 : 1;
        ctx.drawImage(resident, vw / 2 + x - 9, toScreenY(y) - 26, 18, 27); ctx.globalAlpha = 1;
      }
      for (const p of s.parts) { ctx.fillStyle = `hsla(${p.hue},90%,60%,${Math.min(1, p.life)})`; ctx.fillRect(vw / 2 + p.x, toScreenY(p.y), 4, 7); }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __bloxx?: () => unknown }).__bloxx = () => s;
    publish();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); audio?.close(); };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-game-shell select-none touch-none" onPointerDown={() => api.current.tap()}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="hud-pill"><span className="hud-label">SCORE</span><span className="hud-value">{hud.score}</span></div>
        <div className="hud-pill items-center"><span className="hud-label">FLOORS</span><span className="hud-value">{hud.floors}</span></div>
        <div className="hud-pill items-end"><span className="hud-label">LIVES</span><span className="hud-value">{"♥".repeat(Math.max(0, hud.lives))}</span></div>
      </div>
      {hud.combo > 1 && <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 hud-pill items-center"><span className="hud-label">COMBO</span><span className="hud-value">×{Math.min(hud.combo, 10)}</span></div>}
      {hud.msg.trim() && !hud.over && <div key={hud.msgKey} className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-4xl font-extrabold text-hud-accent drop-shadow-lg animate-in fade-in zoom-in duration-300">{hud.msg}</div>}
      {hud.over && (
        <div className="absolute inset-0 flex items-center justify-center bg-game-shell/60 backdrop-blur-sm" onPointerDown={e => e.stopPropagation()}>
          <div className="hud-pill items-center gap-3 px-8 py-6">
            <span className="text-3xl font-extrabold">Game Over</span>
            <span className="hud-label">SCORE</span><span className="hud-value">{hud.score}</span>
            <span className="hud-label">BEST {hud.best} · {hud.floors} FLOORS</span>
            <button className="mt-2 rounded-full bg-hud-accent px-8 py-3 text-xl font-extrabold text-game-shell" onClick={() => api.current.restart()}>Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}
