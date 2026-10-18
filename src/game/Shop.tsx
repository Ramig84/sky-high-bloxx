import { useState } from "react";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOCK_ITEMS, CRANE_ITEMS, coin, marketSign, type ShopItem } from "./shopArtwork";
import { coins, loadLoadout, type Loadout } from "./wallet";
import { buyOrEquip, isSignedIn, signIn } from "./account";
import { CranePreview } from "./CranePreview";

type Tab = "crane" | "block";
export function Shop({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("crane");
  const [balance, setBalance] = useState(coins);
  const [loadout, setLoadout] = useState<Loadout>(loadLoadout);
  const items = tab === "crane" ? CRANE_ITEMS : BLOCK_ITEMS;
  const owned = tab === "crane" ? loadout.ownedCranes : loadout.ownedBlocks;
  const selected = tab === "crane" ? loadout.crane : loadout.block;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [inspect, setInspect] = useState<ShopItem | null>(null);
  const signedIn = isSignedIn();
  const choose = async (item: ShopItem) => {
    if (busy) return;
    if (item.price < 0 && !owned.includes(item.id)) { setNote("Collect 7 daily rewards in a row to win this crane."); return; }
    if (!signedIn) { setNote("Sign in to buy and keep items on every phone."); return; }
    if (!owned.includes(item.id) && balance < item.price) { setNote(`You need ${(item.price - balance).toLocaleString()} more coins.`); return; }
    setBusy(true); setNote("");
    try { setLoadout(await buyOrEquip(tab, item.id)); setBalance(coins()); }
    catch { setNote("Couldn't reach your account. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-game-shell select-none">
      <div className="game-viewport market-screen relative h-full overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="sticky top-0 z-10 flex items-center justify-between py-2">
          <Button variant="ghost" className="market-round" aria-label="Back" onClick={onBack}><ArrowLeft /></Button>
          <div className="market-balance"><img src={coin} alt="" width={128} height={128} /><strong>{balance.toLocaleString()}</strong></div>
        </div>
        <img src={marketSign} alt="Market" width={768} height={480} className="market-sign mx-auto" />
        <div className="market-tabs" role="tablist">
          <Button variant="ghost" role="tab" aria-selected={tab === "crane"} className={tab === "crane" ? "is-active" : ""} onClick={() => setTab("crane")}>Cranes</Button>
          <Button variant="ghost" role="tab" aria-selected={tab === "block"} className={tab === "block" ? "is-active" : ""} onClick={() => setTab("block")}>Tower styles</Button>
        </div>
        {!signedIn && <Button variant="ghost" className="plaque mx-auto mb-3 flex h-14 w-full max-w-xs rounded-none font-extrabold" onClick={() => void signIn().catch(() => {})}>Sign in with Google</Button>}
        {note && <p className="market-note" role="status">{note}</p>}
        <div className="market-grid">
          {items.map(item => { const has = owned.includes(item.id), active = selected === item.id; return (
            <Button variant="ghost" key={item.id} className={`market-item ${active ? "is-selected" : ""}`} onClick={() => { setNote(""); setInspect(item); }} aria-label={`${item.name}, ${active ? "selected" : has ? "owned" : item.price < 0 ? "day 7 reward" : `${item.price} coins`}`}>
              <div className={`market-art ${tab}`}>{tab === "crane" ? <CranePreview src={item.src} name={item.name} /> : <img src={item.src} alt="" loading="lazy" />}</div>
              <strong>{item.name}</strong>
              <span>{active ? <><Check /> Equipped</> : has ? "Equip" : item.price < 0 ? "Day 7 reward" : <><img src={coin} alt="" /> {item.price.toLocaleString()}</>}</span>
              {!has && (item.price < 0 || balance < item.price) && <LockKeyhole className="market-lock" />}
            </Button>
          ); })}
        </div>
        {inspect && <div className="market-inspect-backdrop" role="dialog" aria-modal="true" aria-label={inspect.name} onClick={() => setInspect(null)}>
          <div className="hud-pill market-inspect" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-extrabold">{inspect.name}</h2>
            <div className={`market-art ${tab}`}>{tab === "crane" ? <CranePreview src={inspect.src} name={inspect.name} /> : <img src={inspect.src} alt={inspect.name} />}</div>
            {note && <p role="status" className="text-sm text-center">{note}</p>}
            <Button variant="ghost" className="plaque h-14 w-full rounded-none font-extrabold" disabled={busy || selected === inspect.id} onClick={() => void choose(inspect)}>{selected === inspect.id ? "Equipped" : owned.includes(inspect.id) ? "Equip" : inspect.price < 0 ? "Day 7 reward" : `Buy · ${inspect.price.toLocaleString()} coins`}</Button>
            <Button variant="ghost" className="paper-btn h-12 w-full" onClick={() => setInspect(null)}>Close</Button>
          </div>
        </div>}
      </div>
    </div>
  );
}
