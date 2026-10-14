import { useEffect, useState } from "react";
import { CalendarDays, Map as MapIcon, Infinity as InfinityIcon, Trophy, Settings as Cog, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { loadSettings, resetProgress, saveSettings, type Settings } from "./settings";
import { topScores, type ScoreRow } from "./leaderboard";
import { ENDLESS_STAGES } from "./endless";
import { coin } from "./shopArtwork";
import { claimDailyStreak, coins } from "./wallet";

type Panel = "home" | "leaderboard" | "settings";

export function HomeMenu({ onCampaign, onEndless, onDaily, onShop, onReset }: { onCampaign: () => void; onEndless: () => void; onDaily: () => void; onShop: () => void; onReset: () => void }) {
  const [panel, setPanel] = useState<Panel>("home");
  const [tablet, setTablet] = useState(false);
  const [streak] = useState(() => claimDailyStreak());
  useEffect(() => setTablet(window.matchMedia("(min-width: 600px)").matches), []);
  const [woke, setWoke] = useState(false);
  const art = tablet ? tabletArtwork : phoneArtwork;
  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none" onPointerUp={() => setWoke(true)}>
      <div className="game-viewport relative h-full overflow-hidden">
        <div className="map-pan absolute inset-0 bg-cover bg-bottom" style={{ backgroundImage: `url(${districtStreet("oldtown", tablet)})` }} aria-hidden />
        {[0, 1, 2].map(i => <img key={`c${i}`} src={art.cloudSrc} alt="" aria-hidden className="map-cloud" style={{ top: `${4 + i * 14}%`, animationDelay: `${-i * 15}s`, animationDuration: `${34 + i * 10}s` }} />)}
        {[0, 1].map(i => (
          <div key={`b${i}`} className="map-bird-path" style={{ top: `${22 + i * 12}%`, animationDelay: `${-i * 9}s` }} aria-hidden>
            <div className="map-bird" style={{ backgroundImage: `url(${art.birdSrc})` }} />
          </div>
        ))}
        <div className="home-crane" aria-hidden>
          <div className="home-swing">
            <span className="home-rope" />
            <img src={art.hookSrc} alt="" className="home-hook" />
            <img src={art.b1} alt="" className="home-block" />
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center gap-4 overflow-y-auto px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
          <img src={art.logoSrc} alt="Sky Bloxx" className="home-logo w-64 drop-shadow-md" />
          {!woke && panel === "home" && <span className="home-hint">Tap anywhere to start</span>}
          {panel === "home" && <MainButtons onCampaign={onCampaign} onEndless={onEndless} onDaily={onDaily} onShop={onShop} setPanel={setPanel} streak={streak} />}
          {panel === "leaderboard" && <Leaderboard onBack={() => setPanel("home")} />}
          {panel === "settings" && <SettingsPanel onBack={() => setPanel("home")} onReset={onReset} />}
        </div>
      </div>
    </div>
  );
}

const big = "plaque menu-plaque h-auto w-full justify-start gap-3 rounded-none text-xl font-extrabold";

function MainButtons({ onCampaign, onEndless, onDaily, onShop, setPanel, streak }: { onCampaign: () => void; onEndless: () => void; onDaily: () => void; onShop: () => void; setPanel: (p: Panel) => void; streak: { count: number; reward: number } }) {
  const best = typeof window === "undefined" ? 0 : Number(localStorage.getItem("bloxx-endless-best") || 0);
  return (
    <div className="home-buttons mt-auto flex w-full max-w-xs flex-col gap-2">
      <div className="home-wallet"><img src={coin} alt="" /><strong>{coins().toLocaleString()}</strong><span>coins · {streak.count} day streak{streak.reward ? ` · +${streak.reward}` : ""}</span></div>
      <Button variant="ghost" className={big} onClick={onCampaign}><MapIcon className="h-6 w-6" /> Play city</Button>
      <Button variant="ghost" className={big} onClick={onDaily}><CalendarDays className="h-6 w-6" /> Daily challenge<span className="ml-auto text-sm font-semibold">3× coins</span></Button>
      <Button variant="ghost" className={big} onClick={onEndless}><InfinityIcon className="h-6 w-6" /> Endless<span className="ml-auto text-sm font-semibold opacity-80">best {best}</span></Button>
      <Button variant="ghost" className={big} onClick={onShop}><Store className="h-6 w-6" /> Market</Button>
      <div className="grid grid-cols-2 gap-2"><Button variant="ghost" className="plaque h-14 rounded-none text-sm font-extrabold" onClick={() => setPanel("leaderboard")}><Trophy /> Scores</Button><Button variant="ghost" className="plaque h-14 rounded-none text-sm font-extrabold" onClick={() => setPanel("settings")}><Cog /> Settings</Button></div>
    </div>
  );
}

function Leaderboard({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [err, setErr] = useState(false);
  const me = loadSettings().playerId;
  useEffect(() => { topScores().then(setRows).catch(() => setErr(true)); }, []);
  return (
    <div className="hud-pill w-full max-w-sm gap-2 p-4">
      <span className="text-2xl font-extrabold">Endless leaderboard</span>
      <span className="hud-label">New obstacle every 10 floors: {ENDLESS_STAGES.join(" → ")}</span>
      <ol className="mt-2 flex max-h-[45dvh] flex-col gap-1 overflow-y-auto">
        {err && <li>Couldn't load scores. Check your connection.</li>}
        {!err && !rows && <li>Loading…</li>}
        {rows?.length === 0 && <li>No scores yet — be the first!</li>}
        {rows?.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-2 rounded px-2 py-1 ${r.player_id === me ? "bg-hud-accent/30 font-extrabold" : ""}`}>
            <span className="w-7 text-right">{i + 1}.</span><span className="flex-1 truncate">{r.name}</span>
            <span className="text-sm opacity-70">{r.floors} fl</span><span className="w-16 text-right font-extrabold">{r.score}</span>
          </li>
        ))}
      </ol>
      <Button variant="ghost" className="plaque menu-plaque mt-2 rounded-none text-lg font-extrabold" onClick={onBack}>Back</Button>
    </div>
  );
}

function SettingsPanel({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  const [s, setS] = useState<Settings>(loadSettings);
  const [confirm, setConfirm] = useState(false);
  const update = (p: Partial<Settings>) => { const n = { ...s, ...p }; setS(n); saveSettings(n); };
  const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
    <button type="button" className="flex items-center justify-between rounded px-1 py-2 text-lg" onClick={() => set(!on)} aria-pressed={on}>
      <span>{label}</span><span className={`paper-btn rounded-full px-4 py-1 text-sm font-extrabold ${on ? "" : "opacity-50"}`}>{on ? "On" : "Off"}</span>
    </button>
  );
  return (
    <div className="hud-pill w-full max-w-sm gap-2 p-4">
      <span className="text-2xl font-extrabold">Settings</span>
      <label className="flex flex-col gap-1 text-lg">Player name
        <input className="rounded border border-current/30 bg-transparent px-3 py-2 text-base" maxLength={16} value={s.name}
          onChange={e => update({ name: e.target.value })} onBlur={e => { if (!e.target.value.trim()) update({ name: "Builder" }); }} />
      </label>
      <Toggle label="Sound" on={s.sound} set={v => update({ sound: v })} />
      <Toggle label="Music" on={s.music} set={v => update({ music: v })} />
      <Toggle label="Vibration" on={s.vibrate} set={v => update({ vibrate: v })} />
      {!confirm ? <Button variant="ghost" className="paper-btn rounded-full" onClick={() => setConfirm(true)}>Reset progress</Button> : (
        <div className="flex flex-col gap-2"><span>Erase all stars and best scores?</span>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1 rounded-full" onClick={() => { resetProgress(); onReset(); setConfirm(false); }}>Erase</Button>
            <Button variant="ghost" className="paper-btn flex-1 rounded-full" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      <Button variant="ghost" className="plaque menu-plaque mt-2 rounded-none text-lg font-extrabold" onClick={onBack}>Back</Button>
    </div>
  );
}
