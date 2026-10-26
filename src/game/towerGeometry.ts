import { floorSway } from "./motion";

type FloorContact = { x: number; swayAtLanding: number; width: number };

/** Reuse contact buffers; compute each floor's expensive bend coefficient once. */
export class TowerGeometry {
  private source: readonly FloorContact[] | null = null;
  private sway = NaN;
  private coefficients: number[] = [];
  readonly xs: number[] = [];
  readonly widths: number[] = [];
  center = 0;

  update(floors: readonly FloorContact[], sway: number) {
    if (floors !== this.source) {
      this.source = floors;
      this.coefficients.length = this.xs.length = this.widths.length = 0;
      this.sway = NaN;
    }
    if (this.sway === sway && floors.length === this.xs.length) return this;
    let sum = 0;
    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i]!;
      const coefficient = this.coefficients[i] ?? (this.coefficients[i] = floorSway(1, i));
      // Retain the original expression and contact coordinates (not a regrouped approximation).
      const x = floor.x + (sway * coefficient - floor.swayAtLanding * coefficient) * floor.width / 2;
      this.xs[i] = x;
      this.widths[i] = floor.width;
      sum += x;
    }
    this.coefficients.length = this.xs.length = this.widths.length = floors.length;
    this.center = floors.length ? sum / floors.length : 0;
    this.sway = sway;
    return this;
  }
}

/** Inclusive candidate range. Visibility checks still use the original exact screen coordinates. */
export function visibleFloorRange(count: number, cameraY: number, blockHeight: number, groundY: number, viewportHeight: number) {
  const first = Math.max(0, Math.floor((groundY + cameraY - viewportHeight) / blockHeight - 1.5));
  const end = Math.min(count, Math.ceil((groundY + cameraY) / blockHeight + 0.5));
  return { first, end: Math.max(first, end) };
}

/** Compact transient sprites in place instead of allocating a new array every frame. */
export function retainInPlace<T>(items: T[], keep: (item: T) => boolean) {
  let write = 0;
  for (let read = 0; read < items.length; read++) {
    const item = items[read]!;
    if (keep(item)) items[write++] = item;
  }
  items.length = write;
}
