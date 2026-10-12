import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import blueImg from "@/assets/block-blue.png";
import pinkImg from "@/assets/block-pink.png";
import yellowImg from "@/assets/block-yellow.png";
import tealImg from "@/assets/block-teal.png";
import lobbyImg from "@/assets/block-lobby.png";
import cloudImg from "@/assets/cloud.png";
import hookImg from "@/assets/hook.png";
import cityImg from "@/assets/city-bg.jpg";
import sideBlue from "@/assets/side-blue.png";
import sidePink from "@/assets/side-pink.png";
import sideYellow from "@/assets/side-yellow.png";
import sideTeal from "@/assets/side-teal.png";
import roofImg from "@/assets/roof.png";
import residentsImg from "@/assets/residents.png";

// ---- Tunables ----
const BW = 2.4; // block width
const BH = 1.45; // block height
const LOBBY_W = 3.4;
const LOBBY_H = LOBBY_W * (607 / 978);
const BASE_Y = LOBBY_H;
const ROPE = 3.6;
const GRAVITY = 26;
const SPRING_K = 7;
const SPRING_DAMP = 0.9;
// ---- Difficulty levels (ramp every 100 floors) ----
const LEVELS = [
  { name: "Rookie",  omega: 1.9, amp: 0.45, perfect: 0.18, wind: 0    },
  { name: "Builder", omega: 2.3, amp: 0.55, perfect: 0.15, wind: 0.05 },
  { name: "Pro",     omega: 2.7, amp: 0.65, perfect: 0.12, wind: 0.10 },
  { name: "Master",  omega: 3.1, amp: 0.75, perfect: 0.10, wind: 0.16 },
  { name: "Legend",  omega: 3.5, amp: 0.85, perfect: 0.08, wind: 0.22 },
] as const;
const levelFor = (floors: number) => LEVELS[Math.min(Math.floor(floors / 100), LEVELS.length - 1)]!;
const MAX_LIVES = 3;
const PALETTE = ["#3f6fc4", "#ef8a78", "#f2b93b", "#2fa3ad"];

const pal = (i: number): string => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length]!;
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
function windowTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = color; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 128; i += 8) { x.fillStyle = "rgba(0,0,0,0.04)"; x.fillRect(i, 0, 4, 64); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function cityTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const x = c.getContext("2d")!;
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

// ---- Painted resident sprites (6 characters in one sheet) ----
let residentsTex: THREE.Texture | null = null;
function residentSprite(): THREE.Mesh | null {
  if (!residentsTex) {
    residentsTex = new THREE.TextureLoader().load(residentsImg);
    residentsTex.colorSpace = THREE.SRGBColorSpace;
  }
  const N_CHARS = 6;
  const idx = Math.floor(Math.random() * N_CHARS);
  const t = residentsTex.clone();
  t.repeat.set(1 / N_CHARS, 1);
  t.offset.set(idx / N_CHARS, 0);
  t.needsUpdate = true;
  const h = 0.85;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(h / 3, h),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.05, toneMapped: false, side: THREE.DoubleSide })
  );
  return m;
}

// ---- Apartment block (full illustrated wrap on every face) ----
const FACADE_IMG: Record<string, string> = { "#3f6fc4": blueImg, "#ef8a78": pinkImg, "#f2b93b": yellowImg, "#2fa3ad": tealImg };
const SIDE_IMG: Record<string, string> = { "#3f6fc4": sideBlue, "#ef8a78": sidePink, "#f2b93b": sideYellow, "#2fa3ad": sideTeal };
function Apartment({ color }: { color: string; awning?: boolean; ground?: boolean }) {
  const tex = useTexture(FACADE_IMG[color] ?? blueImg);
  const sideTex = useTexture(SIDE_IMG[color] ?? sideBlue);
  const roofTex = useTexture(roofImg);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  sideTex.colorSpace = THREE.SRGBColorSpace;
  sideTex.anisotropy = 8;
  roofTex.colorSpace = THREE.SRGBColorSpace;
  const mats = useMemo(() => {
    const side = () => new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false });
    const roof = new THREE.MeshBasicMaterial({ map: roofTex, toneMapped: false });
    const under = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), roughness: 0.9 });
    // box faces: +x, -x, +y, -y, +z, -z
    return [side(), side(), roof, under, side(), side()];
  }, [sideTex, roofTex, color]);
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, BH / 2, -0.02]} material={mats}>
        <boxGeometry args={[BW * 0.96, BH * 0.9, BW * 0.9]} />
      </mesh>
      <mesh position={[0, BH / 2, BW * 0.45 + 0.01]}>
        <planeGeometry args={[BW * 1.04, BH]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} />
      </mesh>
    </group>
  );
}
function Lobby() {
  const tex = useTexture(lobbyImg);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <mesh position={[0, LOBBY_H / 2, BW * 0.2]}>
        <planeGeometry args={[LOBBY_W, LOBBY_H]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} />
      </mesh>
      <mesh position={[0, LOBBY_H / 2, -0.6]}>
        <boxGeometry args={[LOBBY_W * 0.85, LOBBY_H * 0.95, 1.4]} />
        <meshStandardMaterial color="#5b4a44" />
      </mesh>
    </group>
  );
}
function Cloud({ position, scale }: { position: [number, number, number]; scale: number }) {
  const tex = useTexture(cloudImg);
  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[3, 2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function HookSprite() {
  const tex = useTexture(hookImg);
  return (
    <mesh position={[0, BH + 0.7, BW * 0.5]}>
      <planeGeometry args={[BW * 0.95, BW * 0.95 * (482 / 753)]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} />
    </mesh>
  );
}
// ---- Static world ----
function City() {
  return (
    <group>
      {Array.from({ length: 24 }).map((_, i) => (
        <Cloud key={i} position={[Math.sin(i * 2.3) * 4.5, 14 + i * 4.2, -3 - (i % 3) * 2.5]} scale={0.8 + (i % 4) * 0.25} />
      ))}
      <points position={[0, 140, -20]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? (Math.random() - 0.3) * 120 : (Math.random() - 0.5) * 80))), 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.25} />
      </points>
    </group>
  );
}

const SKY = [
  { h: 0, c: new THREE.Color("#8fd0ff") },
  { h: 30, c: new THREE.Color("#b9dcff") },
  { h: 65, c: new THREE.Color("#ffb070") },
  { h: 100, c: new THREE.Color("#3b2a6b") },
  { h: 140, c: new THREE.Color("#070a1e") },
];
function skyAt(h: number, out: THREE.Color) {
  for (let i = 0; i < SKY.length - 1; i++) {
    if (h <= SKY[i + 1]!.h) return out.copy(SKY[i]!.c).lerp(SKY[i + 1]!.c, (h - SKY[i]!.h) / (SKY[i + 1]!.h - SKY[i]!.h));
  }
  return out.copy(SKY[SKY.length - 1]!.c);
}

// ---- Game world ----
type World = {
  phase: Phase;
  t: number;
  sway: number; swayV: number; bias: number;
  hanging: boolean; respawn: number;
  faller: Faller | null;
  combo: number; score: number; lives: number; pop: number;
  camY: number;
  dropReq: boolean;
};

function GameScene({ w, landed, setLanded, misses, setMisses, onHud, onOver, bgRef, skyRef }: {
  bgRef: React.RefObject<HTMLDivElement | null>; skyRef: React.RefObject<HTMLDivElement | null>;
  w: React.MutableRefObject<World>;
  landed: Landed[]; setLanded: React.Dispatch<React.SetStateAction<Landed[]>>;
  misses: Faller[]; setMisses: React.Dispatch<React.SetStateAction<Faller[]>>;
  onHud: (msg?: string) => void; onOver: () => void;
}) {
  const { camera, scene } = useThree();
  const blockRefs = useRef<(THREE.Group | null)[]>([]);
  const missRefs = useRef<Map<number, THREE.Group>>(new Map());
  const active = useRef<THREE.Group>(null);
  const rope = useRef<THREE.Mesh>(null);
  const crane = useRef<THREE.Group>(null);
  const nextColor = useRef({ color: pal(0), awning: true });
  const fog = useMemo(() => new THREE.Fog("#8fd0ff", 40, 90), []);
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

  useEffect(() => { scene.fog = fog; scene.background = null; }, [scene, fog]);

  const topLocalX = () => (landed.length ? landed[landed.length - 1]!.x : 0);
  const topY = () => BASE_Y + landed.length * BH;
  const swayAt = (i: number, n: number) => w.current.sway * Math.pow((i + 1) / Math.max(n, 1), 1.6) * Math.min(n / 6, 1.5);

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
      const side = i % 2 ? 1 : -1;
      people.current.push({ g: null, from: new THREE.Vector3(x + side * (3 + Math.random()), y - 3, 1.5), to: new THREE.Vector3(x + side * 0.55, y + BH * 0.5, BW / 2), t: -i * 0.15 });
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
    g.swayV += (-SPRING_K * (g.sway - target)) * dt;
    g.swayV *= Math.exp(-SPRING_DAMP * dt);
    g.sway += g.swayV * dt;
    blockRefs.current.forEach((b, i) => {
      if (!b) return;
      const s = swayAt(i, n);
      b.position.x = (landed[i]?.x ?? 0) + s;
      b.rotation.z = -w.current.swayV * 0.004 * (i / Math.max(n, 1)) - (s - swayAt(i - 1, n)) * 0.25;
    });
    const towerTopX = topLocalX() + swayAt(n - 1, n);

    // camera
    const camTarget = ty + 2.5;
    g.camY += (camTarget - g.camY) * (1 - Math.exp(-2.5 * dt));
    camera.position.set(Math.sin(g.t * 0.2) * 0.6, g.camY + 1.5, 15);
    camera.lookAt(0, g.camY, 0);
    skyAt(ty, sky);
    fog.color.copy(sky);
    if (bgRef.current) bgRef.current.style.transform = `translateY(${Math.max(0, g.camY - 3) * 4}%)`;
    if (skyRef.current) { skyRef.current.style.backgroundColor = `#${sky.getHexString()}`; skyRef.current.style.opacity = String(Math.min(1, Math.max(0, (ty - 6) / 22))); }

    // crane pendulum
    const level = n;
    const amp = Math.min(0.45 + level * 0.015, 0.85);
    const omega = Math.min(1.9 + level * 0.03, 3.2);
    const theta = amp * Math.sin(g.t * omega);
    const thetaV = amp * omega * Math.cos(g.t * omega);
    const pivotY = g.camY + 6.2;
    const hx = Math.sin(theta) * ROPE;
    const hy = pivotY - Math.cos(theta) * ROPE;
    if (crane.current) crane.current.position.y = pivotY;
    if (rope.current) {
      rope.current.position.set(hx / 2, pivotY - Math.cos(theta) * ROPE / 2, 0);
      rope.current.rotation.z = theta;
    }

    if (g.phase === "play") {
      if (g.respawn > 0) { g.respawn -= dt; if (g.respawn <= 0) g.hanging = true; }
      if (g.dropReq && g.hanging) {
        g.hanging = false;
        g.faller = { x: hx, y: hy - BH - 1.4, vx: thetaV * ROPE * Math.cos(theta), vy: 0, rot: theta, vr: 0, color: nextColor.current.color, id: idRef.current++ };
      }
    }
    g.dropReq = false;

    // active block
    if (active.current) {
      if (g.hanging && g.phase !== "over") {
        active.current.visible = true;
        active.current.position.set(hx, hy - BH - 1.4, 0);
        active.current.rotation.z = theta * 0.6;
      } else if (g.faller) {
        const f = g.faller;
        f.vy -= GRAVITY * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        f.rot *= Math.exp(-6 * dt);
        active.current.position.set(f.x, f.y, 0);
        active.current.rotation.z = f.rot;
        if (f.y <= ty) {
          const off = f.x - towerTopX;
          if (Math.abs(off) < BW * 0.78) {
            const localX = f.x - swayAt(n - 1, n + 1) ;
            const perfect = Math.abs(off) < PERFECT;
            const finalX = perfect ? topLocalX() : localX;
            setLanded((L) => [...L, { x: finalX, color: f.color, awning: nextColor.current.awning, id: f.id }]);
            g.swayV += off * 2.2 + (n ? 0 : 0);
            g.bias = Math.max(-1.6, Math.min(1.6, g.bias + off * 0.12));
            if (perfect) {
              g.combo += 1;
              const pts = 25 * Math.min(g.combo, 10);
              g.score += pts;
              g.pop += 8 + g.combo * 2;
              g.bias *= 0.6;
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
              onHud(Math.abs(off) < 0.6 ? "GOOD" : "WOBBLY!");
            }
            const ci = (n + 1) % PALETTE.length;
            nextColor.current = { color: pal(ci), awning: Math.random() < 0.5 };
            g.faller = null;
            g.hanging = true;
            // tower collapse if bias too extreme
            if (Math.abs(g.bias) > 1.5) {
              g.lives = 0; g.phase = "over"; sfx.over(); onOver();
            }
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
          onHud();
        }
      } else {
        active.current.visible = false;
      }
    }

    // missed blocks tumbling
    misses.forEach((m) => {
      const ref = missRefs.current.get(m.id);
      if (!ref || m.y < -20) return;
      m.vy -= GRAVITY * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt;
      ref.position.set(m.x, m.y, 0); ref.rotation.z = m.rot;
    });

    // confetti
    if (conf.current) {
      parts.forEach((p, i) => {
        if (p.life > 0) {
          p.life -= dt;
          p.v.y -= 9 * dt; p.v.multiplyScalar(Math.exp(-1.2 * dt));
          p.p.addScaledVector(p.v, dt); p.r += dt * 8;
          dummy.position.copy(p.p); dummy.rotation.set(p.r, p.r * 0.7, 0); dummy.scale.setScalar(Math.min(p.life, 1));
        } else { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0); }
        dummy.updateMatrix(); conf.current!.setMatrixAt(i, dummy.matrix);
      });
      conf.current.instanceMatrix.needsUpdate = true;
    }

    // residents jumping in
    if (peopleGroup.current) {
      const grp = peopleGroup.current;
      people.current = people.current.filter((pp) => {
        pp.t += dt * 1.4;
        if (!pp.g) {
          const pg = new THREE.Group();
          const sprite = residentSprite();
          if (sprite) pg.add(sprite);
          grp.add(pg); pp.g = pg;
        }
        const k = Math.max(0, Math.min(pp.t, 1));
        pp.g.visible = pp.t > 0;
        pp.g.position.lerpVectors(pp.from, pp.to, k);
        pp.g.position.y += Math.sin(k * Math.PI) * 3;
        pp.g.rotation.z = k * Math.PI * 2;
        if (pp.t >= 1) { grp.remove(pp.g); return false; }
        return true;
      });
    }
    void state;
  });

  return (
    <>
      <City />
      {/* tower */}
      <Lobby />
      <group position={[0, BASE_Y, 0]}>
        {landed.map((b, i) => (
          <group key={b.id} ref={(r) => { blockRefs.current[i] = r; }} position={[b.x, i * BH, 0]}>
            <Apartment color={b.color} awning={b.awning} ground={i === 0} />
          </group>
        ))}
      </group>
      {/* crane */}
      <group ref={crane}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[14, 0.45, 0.45]} />
          <meshStandardMaterial color="#f2b41f" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
      <mesh ref={rope}>
        <cylinderGeometry args={[0.04, 0.04, ROPE, 6]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <group ref={active}>
        <HookSprite />
        <ActiveSkin nextColor={nextColor} />
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

function ActiveSkin({ nextColor }: { nextColor: React.MutableRefObject<{ color: string; awning: boolean }> }) {
  const [c, setC] = useState(nextColor.current);
  useFrame(() => { if (nextColor.current !== c) setC(nextColor.current); });
  return <Apartment color={c.color} awning={c.awning} />;
}

// ---- Root component ----
function freshWorld(): World {
  return { phase: "menu", t: 0, sway: 0, swayV: 0, bias: 0, hanging: true, respawn: 0, faller: null, combo: 0, score: 0, lives: MAX_LIVES, pop: 0, camY: 3, dropReq: false };
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

  const onHud = (msg?: string) => {
    const g = w.current;
    setHud((h) => ({ score: g.score, combo: g.combo, lives: g.lives, floors: floorsRef.current, pop: g.pop, msg: msg ?? h.msg, msgKey: msg ? h.msgKey + 1 : h.msgKey }));
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

  const bgRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const onTap = () => {
    if (phase === "play") w.current.dropReq = true;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-game-shell select-none touch-none">
      <div className="relative h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden" onPointerDown={onTap}>
        <div className="absolute inset-0 bg-sky-top" />
        <div ref={bgRef} className="absolute inset-x-0 bottom-0 h-full will-change-transform">
          <img src={cityImg} alt="" className="h-full w-full object-cover object-bottom" draggable={false} />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-sky-top to-transparent" />
        </div>
        <div ref={skyRef} className="absolute inset-0 opacity-0" />
        <Canvas shadows dpr={[1, 2]} gl={{ alpha: true }} camera={{ position: [0, 5, 15], fov: 55 }} key={round} className="!absolute inset-0">
          <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 20, 10]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <Environment resolution={64}>
            <Lightformer intensity={2} position={[0, 5, 5]} scale={[10, 10, 1]} />
            <Lightformer intensity={1} color="#ffd9a8" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          </Environment>
          <GameScene bgRef={bgRef} skyRef={skyRef} w={w} landed={landed} setLanded={setLanded} misses={misses} setMisses={setMisses} onHud={onHud} onOver={onOver} />
          </Suspense>
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
