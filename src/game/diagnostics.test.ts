import { describe, expect, it } from "vitest";
import { diagPixelRatio, setDiag, tapCounter } from "./diagnostics";

describe("diagnostics", () => {
  it("keeps full sharpness unless the tester switches to low", () => {
    setDiag({ sharpness: "full" });
    expect(diagPixelRatio(2.625)).toBe(2.625);
    setDiag({ sharpness: "low" });
    expect(diagPixelRatio(2.625)).toBe(1);
    setDiag({ sharpness: "full" });
  });
  it("opens only after five taps within 2.5 seconds", () => {
    let t = 0;
    const tap = tapCounter(() => t);
    for (let i = 0; i < 4; i++) { expect(tap()).toBe(false); t += 400; }
    expect(tap()).toBe(true);
    t += 10000;
    for (let i = 0; i < 4; i++) { expect(tap()).toBe(false); t += 1000; }
    expect(tap()).toBe(false);
  });
});
