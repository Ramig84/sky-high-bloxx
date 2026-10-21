// Space Climb's own painted skies: one approved painting per zone, in climb order.
import rooftops from "@/assets/sky-space-rooftops.webp";
import clouds from "@/assets/sky-space-clouds.webp";
import storm from "@/assets/sky-space-storm.webp";
import edge from "@/assets/sky-space-edge.webp";
import orbit from "@/assets/sky-space-orbit.webp";
import { SPACE_ZONES } from "./spaceClimb";

/** Approved paintings so far, in climb order: Rooftops, High Clouds, Storm & Aurora, Edge of Space, Orbit. */
const painted: readonly string[] = [rooftops, clouds, storm, edge, orbit];

/** One sky per zone; a zone without its own painting yet reuses the closest approved one above it. */
export const SPACE_ZONE_SKY: readonly string[] = SPACE_ZONES.map(
  (_, i) => painted[Math.min(i, painted.length - 1)]!,
);

/** The distinct paintings Space Climb needs decoded before its first frame. */
export const SPACE_SKY_IMAGES = painted;
