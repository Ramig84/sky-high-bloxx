import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { advanceSwing, suspendedBlock, integrateFall, floorSway, HOOK_HEIGHT, ROPE_LENGTH } from "./motion";
import * as THREE from "three";

// ---- Tunables ----
const BW = 2.2; // block width
const BH = 1.3; // block height
const ROPE = ROPE_LENGTH;
const GRAVITY = 26;
const SPRING_K = 7;
const SPRING_DAMP = 0.9;
const PERFECT = 0.18;
const MAX_LIVES = 3;
const PALETTE = ["#4f7fd9", "#ef8f87", "#f4c04e", "#4cc2c4", "#9ad06b", "#c48bdc", "#f39a4f"];

const pal = (i: number): string => (PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length] ?? PALETTE[0] ?? "#4f7fd9");
type Phase = "menu" | "play" | "over";
type Landed = { x: number; color: string; awning: boolean; id: number };
type Faller = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string; id: number };
type Hud = { score: number; combo: number; lives: number; floors: number; pop: number; msg: string; msgKey: number };

// ---- Audio ----
let actx: AudioContext | null = null;
function tone(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + dur);
}
const sfx = {
  thud: () => tone(110, 0.2, "triangle", 0.3),
  perfect: (c: number) => [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, (s + Math.min(c, 8)) / 12), 0.25, "sine", 0.12, i * 0.06)),
  miss: () => { tone(300, 0.3, "sawtooth", 0.1); tone(180, 0.4, "sawtooth", 0.1, 0.15); },
  over: () => [523, 440, 349, 262].forEach((f, i) => tone(f, 0.35, "triangle", 0.15, i * 0.18)),
};
function vibrate(ms: number) { try { navigator.vibrate?.(ms); } catch { /* noop */ } }

// ---- Textures ----
const textureCache = new Map<string, THREE.CanvasTexture>();
function windowTexture(color: string) {
  const cached = textureCache.get(color);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const x = c.getContext("2d");
  if (!x) throw new Error("Canvas artwork is unavailable");
  x.fillStyle = color; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 128; i += 8) { x.fillStyle = "rgba(0,0,0,0.04)"; x.fillRect(i, 0, 4, 64); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(color, t);
  return t;
}
function cityTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const x = c.getContext("2d");
  if (!x) throw new Error("Canvas artwork is unavailable");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 64, 128);
  for (let r = 4; r < 128; r += 10) for (let col = 4; col < 64; col += 12) {
    x.fillStyle = (Math.sin(r * 13 + col * 7 + seed) > 0.3) ? "#ffe9a8" : "#9fb7d6";
    x.fillRect(col, r, 7, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---- Apartment block ----
function Apartment({ color, awning, ground }: { color: string; awning: boolean; ground?: boolean }) {
  const tex = useMemo(() => windowTexture(color), [color]);
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, BH / 2, 0]}>
        <boxGeometry args={[BW, BH - 0.12, BW]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[BW + 0.14, 0.12, BW + 0.14]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      {[-0.55, 0.55].map((wx) => (
        <group key={wx} position={[wx, BH * 0.55, BW / 2 + 0.01]}>
          <mesh>
            <planeGeometry args={[0.6, 0.62]} />
            <meshStandardMaterial color="#ffd77a" emissive="#ffb547" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.04, 0.62]} />
            <meshStandardMaterial color="#5a3b2a" />
          </mesh>
          <mesh position={[0, -0.33, 0.18]}>
            <boxGeometry args={[0.8, 0.06, 0.36]} />
            <meshStandardMaterial color="#e9e4dc" />
          </mesh>
          <mesh position={[0, -0.2, 0.35]}>
            <boxGeometry args={[0.8, 0.22, 0.03]} />
            <meshStandardMaterial color="#2c2f3a" transparent opacity={0.85} />
          </mesh>
          {awning && (
            <mesh position={[0, 0.4, 0.15]} rotation-x={0.5}>
              <boxGeometry args={[0.7, 0.04, 0.36]} />
              <meshStandardMaterial color={wx < 0 ? "#e2483d" : "#ffffff"} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[BW / 2 - 0.25, BH - 0.02, BW / 2 - 0.3]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#5fae4a" />
      </mesh>
      {ground && (
        <mesh position={[0, BH * 0.35, BW / 2 + 0.02]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#3a6fbf" emissive="#1c3d7a" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ---- Static world ----
const City = memo(function City() {
  const items = useMemo(() => {
    const arr: { x: number; z: number; w: number; h: number; c: string; t: THREE.Texture }[] = [];
    for (let i = 0; i < 26; i++) {
      const z = -10 - Math.random() * 25;
      arr.push({ x: (Math.random() - 0.5) * 40, z, w: 2 + Math.random() * 3, h: 4 + Math.random() * 18, c: ["#cfd8e8", "#e8d7c6", "#bfd0dd", "#d9cfe6"][i % 4] ?? "#cfd8e8", t: cityTexture(i) });
    }
    return arr;
  }, []);
  const trees = useMemo(() => Array.from({ length: 14 }, () => ({ x: (Math.random() - 0.5) * 18, z: -2 - Math.random() * 7, s: 0.6 + Math.random() * 0.5 })).filter((t) => Math.abs(t.x) > 2.2), []);
  useEffect(() => () => { items.forEach((item) => item.t.dispose()); }, [items]);
  const stars = useMemo(() => new Float32Array(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? (Math.random() - 0.3) * 120 : (Math.random() - 0.5) * 80))), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, -10]}>
        <planeGeometry args={[120, 60]} />
        <meshStandardMaterial color="#8fbf6a" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 2.5]} receiveShadow>
        <planeGeometry args={[120, 3]} />
        <meshStandardMaterial color="#5b6170" />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[4, 0.3, 3.5]} />
        <meshStandardMaterial color="#b9bcc4" />
      </mesh>
      {items.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={b.c} map={b.t} />
        </mesh>
      ))}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.25, 1, 0.25]} /><meshStandardMaterial color="#7a5233" /></mesh>
          <mesh position={[0, 1.4, 0]} castShadow><boxGeometry args={[1.1, 1.1, 1.1]} /><meshStandardMaterial color="#57a545" /></mesh>
        </group>
      ))}
      {/* clouds */}
      {Array.from({ length: 22 }).map((_, i) => {
        const y = 12 + i * 4.5;
        const x = Math.sin(i * 2.3) * 9;
        return (
          <group key={i} position={[x, y, -6 - (i % 3) * 3]}>
            {[0, 1, 2].map((k) => (
              <mesh key={k} position={[k * 0.9 - 0.9, k === 1 ? 0.3 : 0, 0]}>
                <sphereGeometry args={[k === 1 ? 1 : 0.75, 12, 10]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* stars for stratosphere */}
      <points position={[0, 140, -20]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.25} />
      </points>
    </group>
  );
});

const SKY = [
  { h: 0, c: new THREE.Color("#8fd0ff") },
  { h: 30, c: new THREE.Color("#b9dcff") },
  { h: 65, c: new THREE.Color("#ffb070") },
  { h: 100, c: new THREE.Color("#3b2a6b") },
  { h: 140, c: new THREE.Color("#070a1e") },
];
function skyAt(h: number, out: THREE.Color) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const from = SKY[i]; const to = SKY[i + 1];
    if (from && to && h <= to.h) return out.copy(from.c).lerp(to.c, (h - from.h) / (to.h - from.h));
  }
  const last = SKY.at(-1);
  return last ? out.copy(last.c) : out;
}

// ---- Game world ----
type World = {
  phase: Phase;
  t: number; swingPhase: number; swingAmp: number;
  sway: number; swayV: number; bias: number;
  hanging: boolean; respawn: number;
  faller: Faller | null;
  combo: number; score: number; lives: number; pop: number;
  camY: number;
  dropReq: boolean;
};

function GameScene({ w, landed, setLanded, misses, setMisses, onHud, onOver }: {
  w: React.MutableRefObject<World>;
  landed: Landed[]; setLanded: React.Dispatch<React.SetStateAction<Landed[]>>;
  misses: Faller[]; setMisses: React.Dispatch<React.SetStateAction<Faller[]>>;
  onHud: (msg?: string, floors?: number) => void; onOver: () => void;
}) {
  const { camera, scene } = useThree();
  const blockRefs = useRef<(THREE.Group | null)[]>([]);
  const missRefs = useRef<Map<number, THREE.Group>>(new Map());
  const active = useRef<THREE.Group>(null);
  const activeSkins = useRef<Map<string, THREE.Group>>(new Map());
  const liftingBracket = useRef<THREE.Mesh>(null);
  const rope = useRef<THREE.Mesh>(null);
  const crane = useRef<THREE.Group>(null);
  const nextColor = useRef({ color: pal(0), awning: true });
  const fog = useMemo(() => new THREE.Fog("#8fd0ff", 25, 70), []);
  const sky = useMemo(() => new THREE.Color(), []);
  const idRef = useRef(1);

  // confetti pool
  const N = 160;
  const conf = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => Array.from({ length: N }, () => ({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), life: 0, r: 0 })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const confColors = useMemo(() => {
    const arr = new Float32Array(N * 3); const c = new THREE.Color();
    for (let i = 0; i < N; i++) { c.set(pal(i % PALETTE.length)); c.toArray(arr, i * 3); }
    return arr;
  }, []);
  // residents
  const people = useRef<{ g: THREE.Group | null; from: THREE.Vector3; to: THREE.Vector3; t: number }[]>([]);
  const peopleGroup = useRef<THREE.Group>(null);
  const residents = useMemo(() => {
    const bodyGeo = new THREE.CapsuleGeometry(0.12, 0.2, 4, 8);
    const headGeo = new THREE.SphereGeometry(0.12, 10, 8);
    const materials = PALETTE.map((color) => new THREE.MeshStandardMaterial({ color }));
    const skin = new THREE.MeshStandardMaterial({ color: "#f5c9a0" });
    const pool = Array.from({ length: 24 }, (_, i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, materials[i % materials.length]);
      const head = new THREE.Mesh(headGeo, skin);
      head.position.y = 0.3;
      group.add(body, head); group.visible = false;
      return group;
    });
    return { pool, dispose: () => { bodyGeo.dispose(); headGeo.dispose(); skin.dispose(); materials.forEach((m) => m.dispose()); } };
  }, []);
  useEffect(() => {
    const group = peopleGroup.current;
    if (group) residents.pool.forEach((person) => group.add(person));
    return () => {
      if (group) residents.pool.forEach((person) => group.remove(person));
      residents.dispose();
      textureCache.forEach((texture) => texture.dispose()); textureCache.clear();
    };
  }, [residents]);

  useEffect(() => { scene.fog = fog; }, [scene, fog]);

  const topLocalX = () => (landed.length ? (landed[landed.length - 1]?.x ?? 0) : 0);
  const topY = () => 0.3 + landed.length * BH;
  const swayAt = (i: number, _n: number) => floorSway(w.current.sway, i);

  function burst(x: number, y: number, count: number) {
    let k = 0;
    for (const p of parts) {
      if (p.life > 0) continue;
      p.p.set(x, y, 0.5);
      p.v.set((Math.random() - 0.5) * 9, 4 + Math.random() * 7, (Math.random() - 0.2) * 5);
      p.life = 1.4 + Math.random(); p.r = Math.random() * 6;
      if (++k >= count) break;
    }
  }
  function spawnPeople(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const person = residents.pool.find((p) => !people.current.some((entry) => entry.g === p));
      if (!person) break;
      const side = i % 2 ? 1 : -1;
      people.current.push({ g: person, from: new THREE.Vector3(x + side * (3 + Math.random()), y - 3, 1.5), to: new THREE.Vector3(x + side * 0.55, y + BH * 0.5, BW / 2), t: -i * 0.15 });
    }
  }

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const g = w.current;
    g.t += dt;
    const n = landed.length;
    const ty = topY();

    // tower spring sway
    const target = g.bias;
    const steps = Math.max(1, Math.ceil(dt * 120));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      g.swayV += (-SPRING_K * (g.sway - target)) * step;
      g.swayV *= Math.exp(-SPRING_DAMP * step);
      g.sway += g.swayV * step;
    }
    blockRefs.current.forEach((b, i) => {
      if (!b) return;
      const s = swayAt(i, n);
      b.visible = i * BH > g.camY - 14 && i < n;
      b.position.x = (landed[i]?.x ?? 0) + s;
      b.rotation.z = -w.current.swayV * 0.004 * (i / Math.max(n, 1)) - (s - swayAt(i - 1, n)) * 0.25;
    });
    const towerTopX = topLocalX() + swayAt(n - 1, n);

    // camera
    const camTarget = ty + 2.5;
    g.camY += (camTarget - g.camY) * (1 - Math.exp(-2.5 * dt));
    camera.position.set(0, g.camY + 1.5, 15);
    camera.lookAt(0, g.camY, 0);
    skyAt(ty, sky);
    scene.background = sky;
    fog.color.copy(sky);

    // crane pendulum
    const level = n;
    g.swingAmp += (Math.min(0.45 + level * 0.015, 0.85) - g.swingAmp) * (1 - Math.exp(-2 * dt));
    const omega = Math.min(1.9 + level * 0.03, 3.2);
    g.swingPhase = advanceSwing(g.swingPhase, level, dt);
    const theta = g.swingAmp * Math.sin(g.swingPhase);
    const thetaV = g.swingAmp * omega * Math.cos(g.swingPhase);
    const pivotY = g.camY + 6.2;
    const hx = Math.sin(theta) * ROPE;
    const hy = pivotY - Math.cos(theta) * ROPE;
    const hangingPosition = suspendedBlock(theta, pivotY);
    if (crane.current) crane.current.position.y = pivotY;
    if (rope.current) {
      rope.current.position.set(hx / 2, pivotY - Math.cos(theta) * ROPE / 2, 0);
      rope.current.rotation.z = theta;
    }

    if (g.phase === "play") {
      if (g.respawn > 0) { g.respawn -= dt; if (g.respawn <= 0) g.hanging = true; }
      if (g.dropReq && g.hanging) {
        g.hanging = false;
        g.faller = { x: hangingPosition.x, y: hangingPosition.y, vx: thetaV * (ROPE + HOOK_HEIGHT) * Math.cos(theta), vy: thetaV * (ROPE + HOOK_HEIGHT) * Math.sin(theta), rot: theta, vr: 0, color: nextColor.current.color, id: idRef.current++ };
      }
    }
    g.dropReq = false;

    // active block
    if (active.current) {
      activeSkins.current.forEach((skin, key) => { skin.visible = key === `${nextColor.current.color}:${nextColor.current.awning}`; });
      if (liftingBracket.current) liftingBracket.current.visible = g.hanging;
      if (g.hanging && g.phase !== "over") {
        active.current.visible = true;
        active.current.position.set(hangingPosition.x, hangingPosition.y, 0);
        active.current.rotation.z = theta;
      } else if (g.faller) {
        const f = g.faller;
        integrateFall(f, dt, GRAVITY);
        f.rot *= Math.exp(-6 * dt);
        active.current.position.set(f.x, f.y, 0);
        active.current.rotation.z = f.rot;
        if (f.y <= ty) {
          const off = f.x - towerTopX;
          const onPlot = n > 0 || Math.abs(f.x) < 0.9; // first floor must sit on the building plot
          if (Math.abs(off) < BW * 0.78 && onPlot) {
            const localX = f.x - swayAt(n, n + 1);
            const perfect = Math.abs(off) < PERFECT;
            const finalX = perfect ? topLocalX() : localX;
            const newBlock = { x: finalX, color: f.color, awning: nextColor.current.awning, id: f.id };
            const newL = [...landed, newBlock];
            // real balance check: centre of mass above every floor must rest on that floor
            let breakAt = -1;
            for (let k = 0; k < newL.length - 1 && breakAt < 0; k++) {
              let sum = 0;
              for (let j = k + 1; j < newL.length; j++) sum += (newL[j]?.x ?? 0);
              const com = sum / (newL.length - k - 1);
              if (Math.abs(com - (newL[k]?.x ?? 0)) > BW * 0.5) breakAt = k + 1;
            }
            g.swayV += off * 2.2;
            // lean of whole tower over its base drives the visible wobble
            const comAll = newL.reduce((a, b) => a + b.x, 0) / newL.length;
            const lean = comAll - (newL[0]?.x ?? 0);
            g.bias = Math.max(-1.6, Math.min(1.6, lean * 1.2));
            g.swayV += lean * 1.5;
            if (breakAt >= 0) {
              // collapse: floors from breakAt up topple off
              const fallen = newL.slice(breakAt);
              const dir = Math.sign(lean || off) || 1;
              setMisses((M) => [...M.slice(-4), ...fallen.slice(-8).map((b, i) => ({
                x: b.x + swayAt(breakAt + i, n + 1), y: 0.3 + (breakAt + i) * BH, vx: dir * (2 + i * 0.4), vy: 2, rot: 0, vr: dir * (1.5 + i * 0.3), color: b.color, id: idRef.current++,
              }))]);
              setLanded(newL.slice(0, breakAt));
              g.combo = 0; g.sway = 0; g.swayV = dir * 3; g.bias = 0;
              g.lives -= 1;
              sfx.miss(); vibrate(150);
              g.faller = null;
              if (g.lives <= 0) { g.phase = "over"; sfx.over(); onOver(); }
              else { g.respawn = 0.9; onHud("COLLAPSE!"); }
              active.current.visible = false;
              onHud(undefined, breakAt);
              return;
            }
            setLanded(newL);
            if (perfect) {
              g.combo += 1;
              const pts = 25 * Math.min(g.combo, 10);
              g.score += pts;
              g.pop += 8 + g.combo * 2;
              sfx.perfect(g.combo); vibrate(25);
              burst(towerTopX, ty + BH, 40 + g.combo * 6);
              spawnPeople(towerTopX, ty, 2 + Math.min(g.combo, 4));
              onHud(g.combo > 1 ? `PERFECT x${g.combo}!` : "PERFECT!");
            } else {
              g.combo = 0;
              g.score += 10;
              g.pop += 4;
              sfx.thud(); vibrate(12);
              spawnPeople(towerTopX, ty, 1);
              onHud(Math.abs(lean) > BW * 0.3 ? "LEANING!" : Math.abs(off) < 0.6 ? "GOOD" : "WOBBLY!");
            }
            const ci = (n + 1) % PALETTE.length;
            nextColor.current = { color: pal(ci), awning: Math.random() < 0.5 };
            g.faller = null;
            g.hanging = false;
            g.respawn = 0.12;
            active.current.visible = false;
          } else {
            // miss
            setMisses((M) => [...M.slice(-4), { ...f, vr: Math.sign(off) * 3, vx: f.vx + Math.sign(off) * 2 }]);
            g.faller = null;
            g.combo = 0;
            g.lives -= 1;
            sfx.miss(); vibrate(80);
            if (g.lives <= 0) { g.phase = "over"; sfx.over(); onOver(); }
            else { g.respawn = 0.7; onHud("MISS!"); }
          }
          active.current.visible = false;
          onHud(undefined, Math.abs(off) < BW * 0.78 && onPlot ? n + 1 : n);
        }
      } else {
        active.current.visible = false;
      }
    }

    // missed blocks tumbling
    misses.forEach((m) => {
      const ref = missRefs.current.get(m.id);
      if (!ref) return;
      ref.visible = m.y > g.camY - 16;
      if (!ref.visible) return;
      integrateFall(m, dt, GRAVITY); m.rot += m.vr * dt;
      ref.position.set(m.x, m.y, 0); ref.rotation.z = m.rot;
    });

    // confetti
    if (conf.current) {
      parts.forEach((p, i) => {
        if (p.life > 0) {
          p.life -= dt;
          p.v.y -= 9 * dt; p.v.multiplyScalar(Math.exp(-1.2 * dt));
          p.p.addScaledVector(p.v, dt); p.r += dt * 8;
          dummy.position.copy(p.p); dummy.rotation.set(p.r, p.r * 0.7, 0); dummy.scale.setScalar(Math.max(0, Math.min(p.life, 1)));
        } else { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix(); conf.current?.setMatrixAt(i, dummy.matrix);
      });
      conf.current.instanceMatrix.needsUpdate = true;
    }

    // residents jumping in
    if (peopleGroup.current) {
      people.current = people.current.filter((pp) => {
        pp.t += dt * 1.4;
        if (!pp.g) return false;
        const k = Math.max(0, Math.min(pp.t, 1));
        pp.g.visible = pp.t > 0;
        pp.g.position.lerpVectors(pp.from, pp.to, k);
        pp.g.position.y += Math.sin(k * Math.PI) * 3;
        pp.g.rotation.z = k * Math.PI * 2;
        if (pp.t >= 1) { pp.g.visible = false; return false; }
        return true;
      });
    }
    void state;
  });

  return (
    <>
      <City />
      {/* tower */}
      <group position={[0, 0.3, 0]}>
        {landed.map((b, i) => (
          <group key={b.id} ref={(r) => { blockRefs.current[i] = r; }} position={[b.x, i * BH, 0]}>
            <Apartment color={b.color} awning={b.awning} ground={i === 0} />
          </group>
        ))}
      </group>
      {/* crane */}
      <group ref={crane}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[14, 0.5, 0.5]} />
          <meshStandardMaterial color="#f2b41f" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#333842" />
        </mesh>
      </group>
      <mesh ref={rope}>
        <cylinderGeometry args={[0.04, 0.04, ROPE, 6]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <group ref={active}>
        <mesh ref={liftingBracket} position={[0, BH + 0.08, 0]}>
          <boxGeometry args={[1.2, 0.16, 0.5]} />
          <meshStandardMaterial color="#f2b41f" />
        </mesh>
        {PALETTE.flatMap((color) => [false, true].map((awning) => (
          <group key={`${color}:${awning}`} visible={false} ref={(r) => { const key = `${color}:${awning}`; if (r) activeSkins.current.set(key, r); else activeSkins.current.delete(key); }}>
            <Apartment color={color} awning={awning} />
          </group>
        )))}
      </group>
      {misses.map((m) => (
        <group key={m.id} ref={(r) => { if (r) missRefs.current.set(m.id, r); else missRefs.current.delete(m.id); }}>
          <Apartment color={m.color} awning={false} />
        </group>
      ))}
      <instancedMesh ref={conf} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.14, 0.14, 0.03]}>
          <instancedBufferAttribute attach="attributes-color" args={[confColors, 3]} />
        </boxGeometry>
        <meshBasicMaterial vertexColors />
      </instancedMesh>
      <group ref={peopleGroup} />
    </>
  );
}

// ---- Root component ----
function freshWorld(): World {
  return { phase: "menu", t: 0, swingPhase: 0, swingAmp: 0.45, sway: 0, swayV: 0, bias: 0, hanging: true, respawn: 0, faller: null, combo: 0, score: 0, lives: MAX_LIVES, pop: 0, camY: 3, dropReq: false };
}

export function TowerGame() {
  const w = useRef<World>(freshWorld());
  const [phase, setPhase] = useState<Phase>("menu");
  const [landed, setLanded] = useState<Landed[]>([]);
  const [misses, setMisses] = useState<Faller[]>([]);
  const [hud, setHud] = useState<Hud>({ score: 0, combo: 0, lives: MAX_LIVES, floors: 0, pop: 0, msg: "", msgKey: 0 });
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => { setBest(Number(localStorage.getItem("bloxx-best") || 0)); }, []);

  const floorsRef = useRef(0);
  floorsRef.current = landed.length;

  const onHud = (msg?: string, floors = floorsRef.current) => {
    const g = w.current;
    setHud((h) => ({ score: g.score, combo: g.combo, lives: g.lives, floors, pop: g.pop, msg: msg ?? h.msg, msgKey: msg ? h.msgKey + 1 : h.msgKey }));
  };
  const onOver = () => {
    setPhase("over");
    const s = w.current.score;
    setBest((b) => { const nb = Math.max(b, s); localStorage.setItem("bloxx-best", String(nb)); return nb; });
  };

  const start = () => {
    if (!actx) { try { actx = new AudioContext(); } catch { /* noop */ } }
    actx?.resume();
    w.current = { ...freshWorld(), phase: "play", camY: 3 };
    setLanded([]); setMisses([]); setRound((r) => r + 1);
    setHud({ score: 0, combo: 0, lives: MAX_LIVES, floors: 0, pop: 0, msg: "", msgKey: 0 });
    setPhase("play");
  };

  const onTap = () => {
    if (phase === "play") w.current.dropReq = true;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-game-shell select-none touch-none">
      <div className="relative h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden" onPointerDown={onTap}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5, 15], fov: 55 }} key={round}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 20, 10]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <Environment resolution={64}>
            <Lightformer intensity={2} position={[0, 5, 5]} scale={[10, 10, 1]} />
            <Lightformer intensity={1} color="#ffd9a8" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          </Environment>
          <GameScene w={w} landed={landed} setLanded={setLanded} misses={misses} setMisses={setMisses} onHud={onHud} onOver={onOver} />
        </Canvas>

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="space-y-2">
            <div className="hud-pill"><span className="hud-label">SCORE</span><span className="hud-value">{hud.score}</span></div>
            <div className="hud-pill"><span className="hud-label">BEST</span><span className="hud-value text-lg">{best}</span></div>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex justify-end gap-1">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} className={`text-2xl transition-opacity ${i < hud.lives ? "opacity-100" : "opacity-20"}`}>🏠</span>
              ))}
            </div>
            <div className="hud-pill items-end"><span className="hud-label">FLOORS · POP</span><span className="hud-value text-lg">{hud.floors} · {hud.pop}</span></div>
          </div>
        </div>

        {phase === "play" && (
          <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 text-center">
            {hud.combo > 0 && (
              <div className="mb-1 h-2 w-36 overflow-hidden rounded-full bg-hud-track">
                <div className="h-full rounded-full bg-combo transition-all" style={{ width: `${Math.min(hud.combo, 10) * 10}%` }} />
              </div>
            )}
            {hud.msg && <div key={hud.msgKey} className="combo-pop whitespace-nowrap">{hud.msg}</div>}
          </div>
        )}

        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-overlay p-8 text-center" onPointerDown={(e) => { e.stopPropagation(); start(); }}>
            <h1 className="title-logo">SKY<br />BLOXX</h1>
            <p className="max-w-xs font-semibold text-overlay-foreground">Tap anywhere to drop. Stack perfectly for combos. 3 misses and it's over!</p>
            <div className="play-btn animate-pulse">TAP TO PLAY</div>
          </div>
        )}

        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-overlay p-8 text-center" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="title-logo text-5xl">TOWER<br />DOWN!</h2>
            <div className="rounded-3xl bg-card px-8 py-5 text-card-foreground shadow-xl">
              <div className="hud-label">SCORE</div>
              <div className="text-5xl font-black">{hud.score}</div>
              <div className="mt-2 text-sm font-bold text-muted-foreground">{hud.floors} floors · {hud.pop} residents</div>
              <div className="mt-1 text-sm font-bold text-primary">{hud.score >= best && hud.score > 0 ? "★ NEW HIGH SCORE ★" : `Best: ${best}`}</div>
            </div>
            <button className="play-btn" onClick={start}>↻ PLAY AGAIN</button>
          </div>
        )}
      </div>
    </div>
  );
}
