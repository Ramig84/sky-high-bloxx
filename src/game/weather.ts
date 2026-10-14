// Individual painted strokes, never a repeating full-screen rain tile.
export interface RainStroke { x: number; y: number; speed: number; length: number; alpha: number; cell: number }
export function spawnRain(width: number, height: number, random: () => number = Math.random): RainStroke[] {
  return Array.from({ length: 24 }, (_, i) => ({ x: random() * width, y: random() * height,
    speed: 180 + random() * 90, length: 14 + random() * 14, alpha: 0.16 + random() * 0.16, cell: i % 4 }));
}
export function stepRain(p: RainStroke, dt: number, width: number, height: number, wind: number) {
  p.x = ((p.x + wind * 0.12 * dt) % width + width) % width;
  p.y = ((p.y + p.speed * dt) % (height + 40) + height + 40) % (height + 40);
}