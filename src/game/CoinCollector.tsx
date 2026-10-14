import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import { coin } from "./shopArtwork";
import { sfx } from "./audio";
import { coinFlightAmounts } from "./coinFlight";

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
  const clear = () => {
    generation.current++;
    active.current.forEach(animation => animation.cancel());
    active.current.clear();
    layer.current?.replaceChildren();
  };
  useEffect(() => clear, []);
  useImperativeHandle(ref, () => ({ clear, collect: ({ source, target, counter, from, to, onComplete }) => {
    const root = layer.current;
    if (!root || to <= from) { onComplete?.(); return; }
    clear();
    const token = generation.current;
    const bounds = target.getBoundingClientRect();
    const dx = bounds.left + bounds.width / 2 - source.x;
    const dy = bounds.top + bounds.height / 2 - source.y;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amounts = coinFlightAmounts(to - from, reduced);
    const count = amounts.length;
    let landed = 0;
    let received = 0;
    counter.textContent = from.toLocaleString();
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
      const angle = i * Math.PI * 2 / count;
      const spreadX = Math.cos(angle) * 35;
      const spreadY = Math.sin(angle) * 24 - 25;
      const animation = sprite.animate([
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 },
        { transform: `translate(calc(-50% + ${spreadX}px), calc(-50% + ${spreadY}px)) scale(1)`, opacity: 1, offset: 0.25 },
        { transform: `translate(calc(-50% + ${dx * 0.4 + spreadX}px), calc(-50% + ${dy * 0.4 - 65}px)) scale(0.95)`, opacity: 1, offset: 0.58 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45)`, opacity: 1 },
      ], { duration: reduced ? 120 : 780, delay: reduced ? 0 : i * 42, easing: "cubic-bezier(0.3,0,0.6,1)", fill: "both" });
      active.current.add(animation);
      animation.onfinish = () => {
        active.current.delete(animation);
        sprite.remove();
        if (token !== generation.current) return;
        landed++;
        received += amount;
        counter.textContent = (from + received).toLocaleString();
        if (landed === count) {
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