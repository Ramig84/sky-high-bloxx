import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import { coin } from "./shopArtwork";
import { sfx } from "./audio";
import { coinFlightAmounts, coinFlightPoint } from "./coinFlight";

export type CoinCollection = {
  source: { x: number; y: number };
  target: HTMLElement;
  counter: HTMLElement;
  from: number;
  to: number;
  onComplete?: () => void;
};
export type CoinCollectorHandle = { collect: (collection: CoinCollection) => void; clear: () => void };

/** Painted reward sprites; compositor motion never commits React during play. */
export const CoinCollector = forwardRef<CoinCollectorHandle>(function CoinCollector(_, ref) {
  const layer = useRef<HTMLDivElement>(null);
  const active = useRef(new Set<Animation>());
  const generation = useRef(0);
  const counters = useRef(new WeakMap<HTMLElement, { value: number; pending: number }>());
  const clear = () => {
    generation.current++;
    active.current.forEach(animation => animation.cancel());
    active.current.clear();
    counters.current = new WeakMap();
    layer.current?.replaceChildren();
  };
  useEffect(() => clear, []);
  useImperativeHandle(ref, () => ({ clear, collect: ({ source, target, counter, from, to, onComplete }) => {
    const root = layer.current;
    if (!root || to <= from) { onComplete?.(); return; }
    const token = generation.current;
    const bounds = target.getBoundingClientRect();
    const dx = bounds.left + bounds.width / 2 - source.x;
    const dy = bounds.top + bounds.height / 2 - source.y;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amounts = coinFlightAmounts(to - from, reduced);
    const count = amounts.length;
    let landed = 0;
    let counterState = counters.current.get(counter);
    if (!counterState || counterState.pending === 0) {
      counterState = { value: from, pending: 0 };
      counters.current.set(counter, counterState);
      counter.textContent = from.toLocaleString();
    }
    const currentCounter = counterState;
    currentCounter.pending++;
    void sfx("coins", 0.55);
    for (let i = 0; i < count; i++) {
      const image = document.createElement("img");
      image.src = coin;
      image.alt = "";
      image.className = "collecting-coin";
      image.style.left = `${source.x}px`;
      image.style.top = `${source.y}px`;
      const sprite = document.createElement("span");
      sprite.className = "coin-flight-sprite";
      sprite.style.left = `${source.x}px`; sprite.style.top = `${source.y}px`;
      image.style.left = "0"; image.style.top = "0";
      sprite.appendChild(image);
      const amount = amounts[i] ?? 1;
      if (amount > 1) {
        const label = document.createElement("strong"); label.textContent = `+${amount}`;
        sprite.appendChild(label);
      }
      root.appendChild(sprite);
      const frames = Array.from({ length: 25 }, (_, step) => {
        const t = step / 24, p = coinFlightPoint(dx, dy, i, count, t);
        const size = t < 0.15 ? 0.65 + t / 0.15 * 0.35 : 1 - Math.max(0, (t - 0.75) / 0.25) * 0.5;
        return { transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) scale(${size})`, opacity: Math.min(1, t * 12 + 0.2), offset: t };
      });
      const animation = sprite.animate(frames, { duration: reduced ? 120 : 680, delay: reduced ? 0 : i * 28, easing: "cubic-bezier(0.25,0.1,0.4,1)", fill: "both" });
      active.current.add(animation);
      animation.onfinish = () => {
        active.current.delete(animation);
        sprite.remove();
        if (token !== generation.current) return;
        landed++;
        currentCounter.value += amount;
        counter.textContent = currentCounter.value.toLocaleString();
        if (landed === count) {
          currentCounter.pending--;
          const pulse = target.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: reduced ? 0 : 230 });
          active.current.add(pulse);
          pulse.onfinish = () => active.current.delete(pulse);
          void sfx("coinDing", 0.45);
          onComplete?.();
        }
      };
    }
  } }));
  return typeof document === "undefined" ? null : createPortal(<div ref={layer} className="coin-collection-layer" aria-hidden="true" />, document.body);
});