import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DistrictCelebration } from "@/game/DistrictCelebration";
import { Preloader } from "@/game/Preloader";
import { celebrateAssets } from "@/game/preload";

export const Route = createFileRoute("/transition-preview")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "District Transition Preview — Sky Bloxx" },
      { name: "description", content: "Preview Sky Bloxx’s painted district celebration from Old Town to Harbour." },
      { property: "og:title", content: "District Transition Preview — Sky Bloxx" },
      { property: "og:description", content: "An animated painted tower celebration revealing the next Sky Bloxx district." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransitionPreview,
});

function TransitionPreview() {
  const navigate = useNavigate();
  return (
    <Preloader assets={() => celebrateAssets("oldtown", "harbour")}>
      <DistrictCelebration district={0} stars={Array.from({ length: 10 }, () => 3)}
        onNext={() => void navigate({ to: "/" })}
        onMap={() => void navigate({ to: "/" })} />
    </Preloader>
  );
}