export type AdPlacement = "extra-life" | "continue" | "five-levels";
export const AD_PLACEMENTS: Record<AdPlacement, { title: string; offer: string }> = {
  "extra-life": { title: "Extra life", offer: "Watch an ad for +1 life" },
  continue: { title: "Continue your tower", offer: "Watch an ad to continue" },
  "five-levels": { title: "Level-break ad", offer: "Ad break after five levels" },
};
export function fiveLevelOffer(level: number, won: boolean, endless: boolean, daily: boolean) {
  return won && !endless && !daily && (level + 1) % 5 === 0;
}