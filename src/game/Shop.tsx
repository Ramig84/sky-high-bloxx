import { useState } from "react";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOCK_ITEMS, CRANE_ITEMS, coin, marketSign, type ShopItem } from "./shopArtwork";
import { coins, loadLoadout, type Loadout } from "./wallet";
import { buyOrEquip, isSignedIn, signIn } from "./account";

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
  const signedIn = isSignedIn();
  const choose = async (item: ShopItem) => {
    if (busy) return;
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
          <Button variant="ghost" className={tab === "crane" ? "is-active" : ""} onClick={() => setTab("crane")}>Cranes</Button>
          <Button variant="ghost" className={tab === "block" ? "is-active" : ""} onClick={() => setTab("block")}>Tower styles</Button>
        </div>
        {!signedIn && <Button variant="ghost" className="plaque mx-auto mb-3 flex h-14 w-full max-w-xs rounded-none font-extrabold" onClick={() => void signIn().catch(() => {})}>Sign in with Google</Button>}
        {note && <p className="market-note" role="status">{note}</p>}
        <div className="market-grid">
          {items.map(item => { const has = owned.includes(item.id), active = selected === item.id; return (
            <button type="button" key={item.id} className={`market-item ${active ? "is-selected" : ""}`} onClick={() => void choose(item)} aria-label={`${item.name}, ${active ? "selected" : has ? "owned" : `${item.price} coins`}`}>
              <div className={`market-art ${tab}`}><img src={item.src} alt="" loading="lazy" /></div>
              <strong>{item.name}</strong>
              <span>{active ? <><Check /> Equipped</> : has ? "Equip" : <><img src={coin} alt="" /> {item.price.toLocaleString()}</>}</span>
              {!has && balance < item.price && <LockKeyhole className="market-lock" />}
            </button>
          ); })}
        </div>
      </div>
    </div>
  );
}
