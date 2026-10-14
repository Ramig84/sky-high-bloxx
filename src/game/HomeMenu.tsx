import { useEffect, useRef, useState, type RefObject } from "react";
import { CalendarDays, Gift, Map as MapIcon, Infinity as InfinityIcon, Trophy, Settings as Cog, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { sfx, setMusic, currentMusic } from "./audio";
import { districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { loadSettings, resetProgress, saveSettings, type Settings } from "./settings";
import { topScores, type ScoreRow } from "./leaderboard";
import { ENDLESS_STAGES } from "./endless";
import { coin, craneSource } from "./shopArtwork";
import { DAILY_REWARDS, GIFT_KEY, claimDailyReward, coins, giftAvailable, nextRewardDay } from "./wallet";
import { CoinCollector, type CoinCollectorHandle } from "./CoinCollector";
import { ACCOUNT_EVENT, claimGift, isSignedIn, signIn, signOut } from "./account";
import { AdPlacementTests } from "./AdPlaceholder";
import { deleteMyAccount } from "./account.functions";

type Panel = "home" | "leaderboard" | "settings";

export function HomeMenu({ onCampaign, onEndless, onDaily, onShop, onReset }: { onCampaign: () => void; onEndless: () => void; onDaily: () => void; onShop: () => void; onReset: () => void }) {
  const [panel, setPanel] = useState<Panel>("home");
  const [tablet, setTablet] = useState(false);
  const [, refresh] = useState(0);
  const [gift, setGift] = useState({ available: false, day: 1, reward: 0, crane: false });
  const [showMap, setShowMap] = useState(false);
  const collector = useRef<CoinCollectorHandle>(null);
  const rewardTarget = useRef<HTMLImageElement>(null);
  const rewardCounter = useRef<HTMLElement>(null);
  const collecting = useRef(false);
  const [balance, setBalance] = useState(coins);
  const claimGiftNow = () => {
    if (!giftAvailable() || collecting.current) return;
    collecting.current = true;
    const before = coins();
    const bounds = document.querySelector(".reward-tile.is-today img")?.getBoundingClientRect();
    const source = { x: bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2, y: bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2 };
    const done = (r: { day: number; reward: number; crane: boolean; claimed: boolean } | null) => {
      if (!r || r.claimed) { collecting.current = false; setGift(g => ({ ...g, available: false })); return; }
      localStorage.setItem(GIFT_KEY, JSON.stringify({ day: new Date().toISOString().slice(0, 10), count: r.day }));
      setGift({ available: false, day: r.day, reward: r.reward, crane: r.crane });
      const finish = () => { collecting.current = false; setBalance(coins()); };
      const target = rewardTarget.current, counter = rewardCounter.current;
      if (r.reward > 0 && target && counter && collector.current) collector.current.collect({ source, target, counter, from: before, to: coins(), onComplete: finish });
      else finish();
    };
    if (isSignedIn()) void claimGift().then(done).catch(() => { collecting.current = false; });
    else done(claimDailyReward());
  };
  useEffect(() => {
    const on = () => { refresh(n => n + 1); if (!collecting.current) setBalance(coins()); };
    window.addEventListener(ACCOUNT_EVENT, on);
    return () => window.removeEventListener(ACCOUNT_EVENT, on);
  }, []);
  useEffect(() => setTablet(window.matchMedia("(min-width: 600px)").matches), []);
  useEffect(() => setGift(g => ({ ...g, available: giftAvailable(), day: nextRewardDay() })), []);
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
          {panel === "home" && <MainButtons onCampaign={onCampaign} onEndless={onEndless} onDaily={onDaily} onShop={onShop} setPanel={setPanel} gift={gift} balance={balance} onGift={() => setShowMap(true)} />}
          {showMap && <RewardMap gift={gift} balance={balance} targetRef={rewardTarget} counterRef={rewardCounter} onClaim={claimGiftNow} onClose={() => { collector.current?.clear(); collecting.current = false; setBalance(coins()); setShowMap(false); }} />}
          <CoinCollector ref={collector} />
          {panel === "leaderboard" && <Leaderboard onBack={() => setPanel("home")} />}
          {panel === "settings" && <SettingsPanel onBack={() => setPanel("home")} onReset={onReset} />}
        </div>
      </div>
    </div>
  );
}

const big = "plaque menu-plaque h-auto w-full justify-start gap-3 rounded-none text-xl font-extrabold";

const small = "plaque h-14 rounded-none text-sm font-extrabold";

function MainButtons({ onCampaign, onEndless, onDaily, onShop, setPanel, gift, balance, onGift }: { onCampaign: () => void; onEndless: () => void; onDaily: () => void; onShop: () => void; setPanel: (p: Panel) => void; gift: { available: boolean; day: number; reward: number; crane: boolean }; balance: number; onGift: () => void }) {
  const best = typeof window === "undefined" ? 0 : Number(localStorage.getItem("bloxx-endless-best") || 0);
  const label = gift.day === 7 ? "crane!" : `+${DAILY_REWARDS[gift.day - 1] ?? 100}`;
  return (
    <div className="home-buttons mt-auto flex w-full max-w-xs flex-col gap-2">
      <div className="home-topline">
        <div className="home-wallet"><img src={coin} alt="" /><strong>{balance.toLocaleString()}</strong></div>
        <button type="button" className={`home-gift ${gift.available ? "is-ready" : ""}`} onClick={onGift} aria-label={`Daily reward, day ${gift.day} of 7`}>
          <Gift className="h-4 w-4" /> Day {gift.day}/7 · {gift.crane ? "crane won!" : gift.available ? label : "claimed"}
        </button>
      </div>
      <Button variant="ghost" className={big} onClick={onCampaign}><MapIcon className="h-6 w-6" /> Play city</Button>
      <Button variant="ghost" className={big} onClick={onDaily}><CalendarDays className="h-6 w-6" /> Daily challenge<span className="ml-auto text-sm font-semibold">3× coins</span></Button>
      <Button variant="ghost" className={big} onClick={onEndless}><InfinityIcon className="h-6 w-6" /> Endless<span className="ml-auto text-sm font-semibold opacity-80">best {best}</span></Button>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="ghost" className={small} onClick={onShop}><Store /> Market</Button>
        <Button variant="ghost" className={small} onClick={() => setPanel("leaderboard")}><Trophy /> Scores</Button>
        <Button variant="ghost" className={small} onClick={() => setPanel("settings")}><Cog /> Settings</Button>
      </div>
      {isSignedIn()
        ? <button type="button" className="home-account" onClick={() => void signOut()}>{loadSettings().name} · Sign out</button>
        : <button type="button" className="home-account" onClick={() => void signIn().catch(() => {})}>Sign in with Google to save coins</button>}
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
  const update = (p: Partial<Settings>) => { const n = { ...s, ...p }; setS(n); saveSettings(n); setMusic(true, 0.35, currentMusic()); };
  const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
    <Button variant="ghost" className="flex items-center justify-between rounded px-1 py-2 text-lg" onClick={() => set(!on)} aria-pressed={on}>
      <span>{label}</span><span className={`paper-btn rounded-full px-4 py-1 text-sm font-extrabold ${on ? "" : "opacity-50"}`}>{on ? "On" : "Off"}</span>
    </Button>
  );
  return (
    <div className="hud-pill w-full max-w-sm gap-2 p-4">
      <span className="text-2xl font-extrabold">Settings</span>
      <label className="flex flex-col gap-1 text-lg">Player name
        <input className="rounded border border-current/30 bg-transparent px-3 py-2 text-base" maxLength={16} value={s.name}
          onChange={e => update({ name: e.target.value })} onBlur={e => { if (!e.target.value.trim()) update({ name: "Builder" }); }} />
      </label>
      <label className="volume-control">Music <output>{Math.round((s.music ? s.musicVolume : 0) * 100)}%</output>
        <Slider aria-label="Music volume" min={0} max={100} step={1} value={[s.music ? Math.round(s.musicVolume * 100) : 0]} onValueChange={([v]) => update({ music: true, musicVolume: (v ?? 0) / 100 })} />
      </label>
      <label className="volume-control">Sound effects <output>{Math.round((s.sound ? s.soundVolume : 0) * 100)}%</output>
        <Slider aria-label="Sound effects volume" min={0} max={100} step={1} value={[s.sound ? Math.round(s.soundVolume * 100) : 0]} onValueChange={([v]) => update({ sound: true, soundVolume: (v ?? 0) / 100 })} onValueCommit={() => void sfx("drop", 0.55)} />
      </label>
      <Toggle label="Vibration" on={s.vibrate} set={v => update({ vibrate: v })} />
      <AdPlacementTests />
      <div className="flex justify-center gap-4 text-sm underline">
        <a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a>
      </div>
      {isSignedIn() && <Button variant="ghost" className="paper-btn rounded-full text-destructive" onClick={async () => {
        const typed = window.prompt("This permanently deletes your account, coins, cranes, tower styles and stars. Type DELETE to confirm.");
        if (typed !== "DELETE") return;
        try { await deleteMyAccount({ data: { confirm: typed } }); await signOut(); window.alert("Your account has been deleted."); onBack(); }
        catch (e) { window.alert(e instanceof Error ? e.message : "Could not delete your account"); }
      }}>Delete account</Button>}
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

function RewardMap({ gift, balance, targetRef, counterRef, onClaim, onClose }: { gift: { available: boolean; day: number; reward: number; crane: boolean }; balance: number; targetRef: RefObject<HTMLImageElement | null>; counterRef: RefObject<HTMLElement | null>; onClaim: () => void; onClose: () => void }) {
  return (
    <div className="reward-backdrop" role="dialog" aria-label="Daily rewards" onClick={onClose}>
      <div className="reward-map hud-pill" onClick={e => e.stopPropagation()}>
        <strong className="text-lg">Daily rewards</strong>
        <div className="reward-wallet" aria-label="Coin balance"><img ref={targetRef} src={coin} alt="" /><strong ref={counterRef}>{balance.toLocaleString()}</strong></div>
        <p className="text-xs opacity-75">Come back every day. Miss a day and it starts again at day 1.</p>
        <div className="reward-grid">
          {[1, 2, 3, 4, 5, 6, 7].map(n => {
            const done = n < gift.day || (n === gift.day && !gift.available), today = n === gift.day;
            return (
              <div key={n} className={`reward-tile ${n === 7 ? "is-big" : ""} ${done ? "is-done" : ""} ${today && gift.available ? "is-today" : ""}`}>
                <span>Day {n}</span>
                <img src={n === 7 ? craneSource("weekly") : coin} alt="" className={n === 7 ? "reward-crane" : ""} />
                <b>{n === 7 ? "Festival Crane" : `+${DAILY_REWARDS[n - 1]}`}</b>
                {done && <i>✓</i>}
              </div>
            );
          })}
          <div className="reward-tile is-mystery"><span>Next week</span><b className="text-2xl">?</b><b>Mystery</b></div>
        </div>
        {gift.available
          ? <Button variant="ghost" className="plaque h-14 w-full rounded-none text-lg font-extrabold" onClick={onClaim}>Claim day {gift.day}</Button>
          : <Button variant="ghost" className="plaque h-12 w-full rounded-none font-extrabold" onClick={onClose}>{gift.crane ? "Festival Crane won!" : gift.reward ? `+${gift.reward} coins!` : "Come back tomorrow"}</Button>}
      </div>
    </div>
  );
}
