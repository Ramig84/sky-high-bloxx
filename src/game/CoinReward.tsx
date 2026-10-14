import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { coin } from "./shopArtwork";
import { sfx } from "./audio";

function useCountUp(target: number, from = 0, duration = 1100) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (target <= from) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, from, duration]);
  return value;
}

/** Wallet total that counts up when it grows (e.g. after a streak reward). */
export function CoinTotal({ value, from }: { value: number; from?: number | undefined }) {
  const shown = useCountUp(value, from ?? value);
  return <>{shown.toLocaleString()}</>;
}

/** Animated "+N coins" reward: painted coins burst outward while the total counts up. */
export function CoinReward({ amount }: { amount: number }) {
  const shown = useCountUp(amount);
  const burst = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 60 + Math.random() * 70;
        return {
          "--dx": `${Math.cos(angle) * dist}px`,
          "--dy": `${Math.sin(angle) * dist - 30}px`,
          "--rot": `${Math.round(Math.random() * 720 - 360)}deg`,
          "--d": `${(Math.random() * 0.25).toFixed(2)}s`,
        } as CSSProperties;
      }),
    [],
  );
  if (amount <= 0) return null;
  return (
    <span className="coin-reward" aria-label={`+${amount.toLocaleString()} coins`}>
      <span className="coin-burst" aria-hidden>
        {burst.map((style, i) => (
          <img key={i} src={coin} alt="" style={style} />
        ))}
      </span>
      <img src={coin} alt="" className="coin-reward-icon" />
      <span>+{shown.toLocaleString()} coins</span>
    </span>
  );
}
