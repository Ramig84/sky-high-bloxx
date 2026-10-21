import gantrySrc from "@/assets/space-gantry-block.webp";
import { BLOCK_H, BLOCK_W } from "./motion";

export const SPACE_BLOCK_IMAGE = gantrySrc;

/** One compact launch-gantry section; campaign dimensions remain untouched. */
export function blockDimensions(endless: boolean) {
  return endless ? { width: 56, height: 48 } : { width: BLOCK_W, height: BLOCK_H };
}