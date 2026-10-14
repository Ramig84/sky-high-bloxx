import b1 from "@/assets/floor-1.webp";
import b1Tablet from "@/assets/floor-1-tablet.webp";
import b2 from "@/assets/floor-2.webp";
import b2Tablet from "@/assets/floor-2-tablet.webp";
import b3 from "@/assets/floor-3.webp";
import b3Tablet from "@/assets/floor-3-tablet.webp";
import bg0 from "@/assets/floor-ground.webp";
import bg0Tablet from "@/assets/floor-ground-tablet.webp";
import streetSrc from "@/assets/bg-street.webp";
import streetSrcTablet from "@/assets/bg-street-tablet.webp";
import cloudsSrc from "@/assets/bg-clouds.webp";
import cloudsSrcTablet from "@/assets/bg-clouds-tablet.webp";
import sunsetSrc from "@/assets/bg-sunset.webp";
import sunsetSrcTablet from "@/assets/bg-sunset-tablet.webp";
import spaceSrc from "@/assets/bg-space.webp";
import spaceSrcTablet from "@/assets/bg-space-tablet.webp";
import hookSrc from "@/assets/hook.webp";
import hookSrcTablet from "@/assets/hook-tablet.webp";
import craneSrc from "@/assets/crane.webp";
import craneSrcTablet from "@/assets/crane-tablet.webp";
import foundationSrc from "@/assets/foundation.webp";
import foundationSrcTablet from "@/assets/foundation-tablet.webp";
import cloudSrc from "@/assets/cloud.webp";
import cloudSrcTablet from "@/assets/cloud-tablet.webp";
import birdSrc from "@/assets/bird-flight.webp";
import birdSrcTablet from "@/assets/bird-flight-tablet.webp";
import logoSrc from "@/assets/logo.webp";
import logoSrcTablet from "@/assets/logo-tablet.webp";
import mapSrc from "@/assets/city-map-10.webp";
import mapSrcTablet from "@/assets/city-map-10-tablet.webp";
import rainSrc from "@/assets/rain-strokes.webp";
import type { DistrictId } from "./levels";

export const phoneArtwork = { b1, b2, b3, bg0, streetSrc, cloudsSrc, sunsetSrc, spaceSrc, hookSrc, craneSrc, foundationSrc, cloudSrc, birdSrc, logoSrc, mapSrc, rainSrc };
export const tabletArtwork = { b1: b1Tablet, b2: b2Tablet, b3: b3Tablet, bg0: bg0Tablet, streetSrc: streetSrcTablet, cloudsSrc: cloudsSrcTablet, sunsetSrc: sunsetSrcTablet, spaceSrc: spaceSrcTablet, hookSrc: hookSrcTablet, craneSrc: craneSrcTablet, foundationSrc: foundationSrcTablet, cloudSrc: cloudSrcTablet, birdSrc: birdSrcTablet, logoSrc: logoSrcTablet, mapSrc: mapSrcTablet, rainSrc };

// Floor skins per district, ordered [floor1, floor2, floor3, ground]. Old Town uses the original paintings.
const phoneFloors = import.meta.glob<string>("../assets/floor-*-{1,2,3,ground}.webp", { eager: true, import: "default", query: "?url" });
const tabletFloors = import.meta.glob<string>("../assets/floor-*-{1,2,3,ground}-tablet.webp", { eager: true, import: "default", query: "?url" });
type Four = [string, string, string, string];
const pick = (g: Record<string, string>, id: string, suffix: string): Four =>
  (["1", "2", "3", "ground"].map(n => g[`../assets/floor-${id}-${n}${suffix}.webp`] ?? "") as Four);
export function districtFloors(id: DistrictId, tablet: boolean): Four {
  if (id === "oldtown") return tablet ? [b1Tablet, b2Tablet, b3Tablet, bg0Tablet] : [b1, b2, b3, bg0];
  return tablet ? pick(tabletFloors, id, "-tablet") : pick(phoneFloors, id, "");
}

// Painted street plate per district, sharing the same ground line as the Old Town plate.
const phoneStreets = import.meta.glob<string>("../assets/street-*.webp", { eager: true, import: "default", query: "?url" });
export function districtStreet(id: DistrictId, tablet: boolean): string {
  if (id === "oldtown") return tablet ? streetSrcTablet : streetSrc;
  return phoneStreets[`../assets/street-${id}${tablet ? "-tablet" : ""}.webp`] ?? streetSrc;
}
