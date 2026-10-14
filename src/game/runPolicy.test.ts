import { describe, expect, it } from "vitest";
import { canBankRun } from "./runPolicy";
describe("unfinished level rewards", () => {
  it("does not bank failed city or daily coins", () => {
    expect(canBankRun(false, false, false)).toBe(false);
    expect(canBankRun(false, false, true)).toBe(false);
  });
  it("keeps completed rewards and finished Endless scores", () => {
    expect(canBankRun(true, false, false)).toBe(true);
    expect(canBankRun(true, false, true)).toBe(true);
    expect(canBankRun(false, true, false)).toBe(true);
  });
});