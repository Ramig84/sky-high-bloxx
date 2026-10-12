import { createFileRoute } from "@tanstack/react-router";
import { TowerGame } from "@/game/TowerGame";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sky Bloxx — Stack the Tallest Tower" },
      { name: "description", content: "A one-tap mobile tower stacking game. Drop swinging apartment blocks, chain perfect combos and build to the stratosphere." },
      { property: "og:title", content: "Sky Bloxx — Stack the Tallest Tower" },
      { property: "og:description", content: "One-tap 3D tower stacking for your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TowerGame,
});
