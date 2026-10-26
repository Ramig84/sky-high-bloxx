import { useEffect, useRef, useState } from "react";
import { subscribeActivity } from "./activity";

export const AD_RESUME_SECONDS = 5;

/** A visible five-second return to the same tower; gameplay remains paused until completion. */
export function AdResumeCountdown({ onComplete }: { onComplete: () => void }) {
  const [remaining, setRemaining] = useState(AD_RESUME_SECONDS);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    let elapsed = 0;
    let last = performance.now();
    let active = !document.hidden;
    const unsubscribe = subscribeActivity(value => { active = value; last = performance.now(); });
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (active) elapsed += Math.max(0, now - last);
      last = now;
      setRemaining(Math.max(0, Math.ceil(AD_RESUME_SECONDS - elapsed / 1000)));
      if (elapsed >= AD_RESUME_SECONDS * 1000) {
        window.clearInterval(timer);
        complete.current();
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);
  // Only the number floats over the paused tower — no box or window.
  return <div className="ready-overlay" role="status" aria-live="polite" aria-label={`Get ready, resuming in ${remaining}`} onPointerDown={event => event.stopPropagation()}>
    <span key={remaining} className="ready-count" aria-hidden="true">{remaining}</span>
  </div>;
}
