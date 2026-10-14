import { createFileRoute } from "@tanstack/react-router";
import { DistrictCelebration } from "@/game/DistrictCelebration";
import { Preloader } from "@/game/Preloader";
import { celebrateAssets } from "@/game/preload";
export const Route = createFileRoute("/zz-celebrate-preview")({ ssr: false, component: () => <Preloader assets={() => celebrateAssets("oldtown", "harbour")}><DistrictCelebration district={0} stars={Array(10).fill(3)} onNext={() => {}} onMap={() => {}} /></Preloader> });
