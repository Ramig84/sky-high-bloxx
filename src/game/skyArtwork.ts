// Painted sky layers: high wisps, cloud sea, far city haze and district sky visitors.
import wispSrc from "@/assets/sky-wisp.webp";
import cloudSeaSrc from "@/assets/sky-cloud-sea.webp";
import cityHazeSrc from "@/assets/sky-city-haze.webp";
import cityHazeTowersSrc from "@/assets/sky-city-haze-towers.webp";
import cityHazeMountainsSrc from "@/assets/sky-mountain-haze.webp";
import kiteSrc from "@/assets/sky-kite.webp";
import balloonSrc from "@/assets/sky-balloon.webp";
import auroraSrc from "@/assets/sky-aurora.webp";
import gullSrc from "@/assets/spirit-gull.webp";
import butterflySrc from "@/assets/spirit-butterfly.webp";
import leafSrc from "@/assets/spirit-leaf.webp";
import steamSrc from "@/assets/spirit-steam.webp";
import lanternSrc from "@/assets/spirit-lantern.webp";
import type { DistrictId } from "./levels";

import oldtownLow from "@/assets/dsky-oldtown-low.webp";
import oldtownHigh from "@/assets/dsky-oldtown-high.webp";
import harbourLow from "@/assets/dsky-harbour-low.webp";
import harbourHigh from "@/assets/dsky-harbour-high.webp";
import marketLow from "@/assets/dsky-market-low.webp";
import marketHigh from "@/assets/dsky-market-high.webp";
import riversideLow from "@/assets/dsky-riverside-low.webp";
import riversideHigh from "@/assets/dsky-riverside-high.webp";
import gardensLow from "@/assets/dsky-gardens-low.webp";
import gardensHigh from "@/assets/dsky-gardens-high.webp";
import universityLow from "@/assets/dsky-university-low.webp";
import universityHigh from "@/assets/dsky-university-high.webp";
import railyardLow from "@/assets/dsky-railyard-low.webp";
import railyardHigh from "@/assets/dsky-railyard-high.webp";
import downtownLow from "@/assets/dsky-downtown-low.webp";
import downtownHigh from "@/assets/dsky-downtown-high.webp";
import skylineLow from "@/assets/dsky-skyline-low.webp";
import skylineHigh from "@/assets/dsky-skyline-high.webp";
import cloudpeakLow from "@/assets/dsky-cloudpeak-low.webp";
import cloudpeakHigh from "@/assets/dsky-cloudpeak-high.webp";
export const skyArt = { wispSrc, cloudSeaSrc, cityHazeSrc, cityHazeTowersSrc, kiteSrc, balloonSrc, auroraSrc, gullSrc, butterflySrc, leafSrc, steamSrc, lanternSrc };
export const SKY_IMAGES = Object.values(skyArt);

/** Each district's own painted sky: one at street height, one at the top of the climb. */
export const districtSkyArt: Record<DistrictId, { low: string; high: string }> = {
  oldtown: { low: oldtownLow, high: oldtownHigh },
  harbour: { low: harbourLow, high: harbourHigh },
  market: { low: marketLow, high: marketHigh },
  riverside: { low: riversideLow, high: riversideHigh },
  gardens: { low: gardensLow, high: gardensHigh },
  university: { low: universityLow, high: universityHigh },
  railyard: { low: railyardLow, high: railyardHigh },
  downtown: { low: downtownLow, high: downtownHigh },
  skyline: { low: skylineLow, high: skylineHigh },
  cloudpeak: { low: cloudpeakLow, high: cloudpeakHigh },
};
