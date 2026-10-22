import gantrySrc from "@/assets/space-gantry-front.webp";
import launchBaseSrc from "@/assets/space-launch-base-connected.webp";
import { BLOCK_H, BLOCK_W } from "./motion";

export const SPACE_BLOCK_IMAGE = gantrySrc;
export const SPACE_BASE_IMAGE = launchBaseSrc;
export const SPACE_BLOCK_IMAGES = [SPACE_BLOCK_IMAGE, SPACE_BASE_IMAGE];

/** The support's narrow top matches the collision footing; its roof continues below view. */
export function spaceBaseDimensions(width: number) {
  const supportWidth = width * 1.12 / 0.54;
  return { width: supportWidth, height: supportWidth * 895 / 852 };
}

/** One compact launch-gantry section; campaign dimensions remain untouched. */
export function blockDimensions(endless: boolean) {
  return endless ? { width: 72, height: 52 } : { width: BLOCK_W, height: BLOCK_H };
}