// Space Climb's own painted skies: one approved painting per zone, in climb order.
import rooftops from "@/assets/sky-space-rooftops.webp";
import clouds from "@/assets/sky-space-clouds.webp";
import storm from "@/assets/sky-space-storm.webp";
import edge from "@/assets/sky-space-edge.webp";
import orbit from "@/assets/sky-space-orbit.webp";
import moon from "@/assets/sky-space-moon.webp";
import mars from "@/assets/sky-space-mars.webp";
import asteroids from "@/assets/sky-space-asteroids.webp";
import jupiter from "@/assets/sky-space-jupiter.webp";
import saturn from "@/assets/sky-space-saturn.webp";
import { SPACE_ZONES } from "./spaceClimb";

/** Approved paintings so far, in climb order: Rooftops, High Clouds, Storm & Aurora, Edge of Space, Orbit, The Moon, Mars, Asteroid Belt, Jupiter, Saturn. */
const painted: readonly string[] = [rooftops, clouds, storm, edge, orbit, moon, mars, asteroids, jupiter, saturn];

/** One sky per zone; a zone without its own painting yet reuses the closest approved one above it. */
export const SPACE_ZONE_SKY: readonly string[] = SPACE_ZONES.map(
  (_, i) => painted[Math.min(i, painted.length - 1)]!,
);

/** The distinct paintings Space Climb needs decoded before its first frame. */
export const SPACE_SKY_IMAGES = painted;
