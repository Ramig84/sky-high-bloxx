// Browser-safe ambient life per district, drawn from the painted ambient.webp strip.
// Cells: 0 autumn leaf, 1 blossom petal, 2 butterfly open, 3 butterfly closed, 4 steam puff, 5 sailboat, 6 green leaf.
import type { DistrictId } from "./levels";

export type AmbientKind = "fall" | "flutter" | "steam" | "boat" | "mist";
export interface AmbientLayer { kind: AmbientKind; cells: number[]; count: number; size: number; alpha: number }

export const AMBIENT: Record<DistrictId, AmbientLayer[]> = {
  oldtown: [{ kind: "fall", cells: [0, 6], count: 5, size: 11, alpha: 0.9 }],
  harbour: [{ kind: "boat", cells: [5], count: 2, size: 26, alpha: 0.95 }],
  market: [{ kind: "flutter", cells: [2], count: 2, size: 12, alpha: 1 }, { kind: "steam", cells: [4], count: 1, size: 34, alpha: 0.55 }],
  riverside: [{ kind: "fall", cells: [6], count: 6, size: 10, alpha: 0.9 }],
  gardens: [{ kind: "fall", cells: [1], count: 10, size: 9, alpha: 0.85 }, { kind: "flutter", cells: [2], count: 3, size: 12, alpha: 1 }],
  university: [{ kind: "fall", cells: [0], count: 8, size: 11, alpha: 0.9 }],
  railyard: [{ kind: "steam", cells: [4], count: 2, size: 48, alpha: 0.7 }],
  downtown: [{ kind: "steam", cells: [4], count: 1, size: 28, alpha: 0.3 }],
  skyline: [{ kind: "mist", cells: [], count: 2, size: 180, alpha: 0.16 }],
  cloudpeak: [{ kind: "mist", cells: [], count: 3, size: 220, alpha: 0.2 }],
};

export interface AmbientParticle { layer: AmbientLayer; cell: number; x: number; y: number; ph: number; age: number; sp: number }

/** Match an authored point on the backdrop to the exact cover transform used by the canvas. */
export function backdropPoint(iw: number, ih: number, vw: number, vh: number, nx: number, ny: number, camera: number) {
  const scale = Math.max(vw / iw, vh / ih);
  return { x: (vw - iw * scale) / 2 + nx * iw * scale, y: (vh - ih * scale) / 2 + ny * ih * scale + camera };
}

/** Spawn particles. x is offset from screen centre; y is screen-space for fall/mist, height above the street for the rest. */
export function spawnAmbient(id: DistrictId, vw: number, rand: () => number = Math.random): AmbientParticle[] {
  const out: AmbientParticle[] = [];
  for (const layer of AMBIENT[id]) for (let i = 0; i < layer.count; i++) {
    const cell = layer.cells[i % layer.cells.length] ?? 0;
    out.push({ layer, cell, x: (rand() - 0.5) * vw, y: layer.kind === "fall" ? rand() * 640 : layer.kind === "mist" ? 120 + rand() * 360 : 0, ph: rand() * 6, age: rand() * 4, sp: 0.6 + rand() * 0.8 });
  }
  return out;
}

/** Advance one particle by dt seconds; wraps around within the viewport so motion never stops. */
export function stepAmbient(p: AmbientParticle, dt: number, vw: number, wind = 0): void {
  p.age += dt;
  const half = vw / 2 + 40;
  switch (p.layer.kind) {
    case "fall":
      p.y += 26 * p.sp * dt; p.x += (Math.sin(p.age * 1.4 + p.ph) * 18 + wind * 0.2) * dt;
      if (p.y > 680) { p.y = -20; p.x = (Math.random() - 0.5) * vw; }
      break;
    case "flutter":
      p.x += Math.sin(p.age * 0.7 + p.ph) * 22 * dt;
      p.y = 26 + Math.sin(p.age * 1.9 + p.ph) * 12;
      break;
    case "boat":
      p.x += 6 * p.sp * dt; p.y = Math.sin(p.age * 1.6 + p.ph) * 1.2;
      break;
    case "mist":
      p.x += 8 * p.sp * dt + wind * 0.05 * dt;
      break;
    case "steam":
      if (p.age > 4) p.age -= 4; // each puff rises and fades over 4s, then re-emits
      break;
  }
  if (p.x > half) p.x = -half;
  if (p.x < -half) p.x = half;
}
