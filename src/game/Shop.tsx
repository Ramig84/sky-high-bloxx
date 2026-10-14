import { useState } from "react";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOCK_ITEMS, CRANE_ITEMS, coin, marketSign, type ShopItem } from "./shopArtwork";
import { coins, loadLoadout, saveLoadout, spendCoins, type Loadout } from "./wallet";

type Tab = "crane" | "block";
export function Shop({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("crane");
  const [balance, setBalance] = useState(coins);
  const [loadout, setLoadout] = useState<Loadout>(loadLoadout);
  const items = tab === "crane" ? CRANE_ITEMS : BLOCK_ITEMS;
  const owned = tab === "crane" ? loadout.ownedCranes : loadout.ownedBlocks;
  const selected = tab === "crane" ? loadout.crane : loadout.block;
  const choose = (item: ShopItem) => {
    let next = loadout;
    if (!owned.includes(item.id)) {
      if (!spendCoins(item.price)) return;
      next = tab === "crane" ? { ...loadout, ownedCranes: [...loadout.ownedCranes, item.id], crane: item.id } : { ...loadout, ownedBlocks: [...loadout.ownedBlocks, item.id], block: item.id };
      setBalance(coins());
    } else next = tab === "crane" ? { ...loadout, crane: item.id } : { ...loadout, block: item.id };
    saveLoadout(next); setLoadout(next);
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
        <div className="market-grid">
          {items.map(item => { const has = owned.includes(item.id), active = selected === item.id; return (
            <button type="button" key={item.id} className={`market-item ${active ? "is-selected" : ""}`} onClick={() => choose(item)} aria-label={`${item.name}, ${active ? "selected" : has ? "owned" : `${item.price} coins`}`}>
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
