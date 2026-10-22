import { SPACE_ZONES } from "./spaceClimb";

/** Overscanned painted sky: reveal higher pigment as the camera ascends, never tile or expose an edge. */
export function spaceSceneryTransform(zone: number, cameraFloors: number, width: number, height: number) {
  const start = SPACE_ZONES[zone]?.start ?? 0;
  const end = SPACE_ZONES[zone + 1]?.start ?? 600;
  const progress = Math.max(0, Math.min(1, (cameraFloors - start) / Math.max(1, end - start)));
  const scale = Math.max(width / 864, height / 1536) * 1.18;
  const w = 864 * scale, h = 1536 * scale;
  return { x: (width - w) / 2, y: (height - h) * (1 - progress), width: w, height: h, scale };
}

/** Local painted coordinates follow precisely the same crop and travel as their planet. */
export function spaceSceneryPoint(zone: number, cameraFloors: number, width: number, height: number, x: number, y: number) {
  const frame = spaceSceneryTransform(zone, cameraFloors, width, height);
  return { x: frame.x + x * frame.width, y: frame.y + y * frame.height };
}