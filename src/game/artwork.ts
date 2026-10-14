import b1 from "@/assets/floor-1.webp";
import b1Tablet from "@/assets/floor-1-tablet.webp";
import b2 from "@/assets/floor-2.webp";
import b2Tablet from "@/assets/floor-2-tablet.webp";
import b3 from "@/assets/floor-3.webp";
import b3Tablet from "@/assets/floor-3-tablet.webp";
import bg0 from "@/assets/floor-ground.webp";
import bg0Tablet from "@/assets/floor-ground-tablet.webp";
import h1 from "@/assets/floor-harbour-1.webp";
import h1T from "@/assets/floor-harbour-1-tablet.webp";
import h2 from "@/assets/floor-harbour-2.webp";
import h2T from "@/assets/floor-harbour-2-tablet.webp";
import h3 from "@/assets/floor-harbour-3.webp";
import h3T from "@/assets/floor-harbour-3-tablet.webp";
import h0 from "@/assets/floor-harbour-ground.webp";
import h0T from "@/assets/floor-harbour-ground-tablet.webp";
import d1 from "@/assets/floor-downtown-1.webp";
import d1T from "@/assets/floor-downtown-1-tablet.webp";
import d2 from "@/assets/floor-downtown-2.webp";
import d2T from "@/assets/floor-downtown-2-tablet.webp";
import d3 from "@/assets/floor-downtown-3.webp";
import d3T from "@/assets/floor-downtown-3-tablet.webp";
import d0 from "@/assets/floor-downtown-ground.webp";
import d0T from "@/assets/floor-downtown-ground-tablet.webp";
import mapSrc from "@/assets/city-map.webp";
import mapSrcTablet from "@/assets/city-map-tablet.webp";
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
import type { ZoneId } from "./zones";

export const phoneArtwork = { b1, b2, b3, bg0, streetSrc, cloudsSrc, sunsetSrc, spaceSrc, hookSrc, craneSrc, foundationSrc, cloudSrc, birdSrc, logoSrc, mapSrc };
export const tabletArtwork = { b1: b1Tablet, b2: b2Tablet, b3: b3Tablet, bg0: bg0Tablet, streetSrc: streetSrcTablet, cloudsSrc: cloudsSrcTablet, sunsetSrc: sunsetSrcTablet, spaceSrc: spaceSrcTablet, hookSrc: hookSrcTablet, craneSrc: craneSrcTablet, foundationSrc: foundationSrcTablet, cloudSrc: cloudSrcTablet, birdSrc: birdSrcTablet, logoSrc: logoSrcTablet, mapSrc: mapSrcTablet };

// Floor skins per zone, ordered [floor1, floor2, floor3, ground].
export const zoneFloors: Record<ZoneId, { phone: [string, string, string, string]; tablet: [string, string, string, string] }> = {
  oldtown: { phone: [b1, b2, b3, bg0], tablet: [b1Tablet, b2Tablet, b3Tablet, bg0Tablet] },
  harbour: { phone: [h1, h2, h3, h0], tablet: [h1T, h2T, h3T, h0T] },
  downtown: { phone: [d1, d2, d3, d0], tablet: [d1T, d2T, d3T, d0T] },
};
