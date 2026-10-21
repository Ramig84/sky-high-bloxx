import { describe, expect, it } from "vitest";
import { freshWind, finishWindDrop, stepWind, windPresentation, WIND_TURN_SECONDS } from "./wind";

describe("approved predictable wind", () => {
  it("holds the direction for several drops rather than resetting randomly after every landing", () => {
    let state = freshWind();
    for (let i = 0; i < 3; i++) {
      state = finishWindDrop(state);
      expect(state.direction).toBe(1);
      expect(state.turn).toBeNull();
    }
    state = finishWindDrop(state);
    expect(state.turn).toBe(0);
    expect(windPresentation(state).nextDirection).toBe(-1);
  });
  it("signals a gradual change and retains full force magnitude", () => {
    let state = { ...freshWind(), turn: 0 };
    state = stepWind(state, WIND_TURN_SECONDS / 4, true);
    expect(windPresentation(state).changing).toBe(true);
    expect(windPresentation(state).opacity).toBeCloseTo(Math.SQRT1_2);
    expect(Math.abs(137 * state.direction)).toBe(137);
    state = stepWind(state, WIND_TURN_SECONDS, true);
    expect(state.direction).toBe(-1);
    expect(state.turn).toBeNull();
    expect(Math.abs(137 * state.direction)).toBe(137);
  });
  it("never changes direction during descent or while paused", () => {
    const state = { ...freshWind(), turn: 0.2 };
    expect(stepWind(state, 10, false)).toEqual(state);
    expect(stepWind(state, 0, true)).toEqual(state);
  });
  it("alternates back on the next group and starts a replay fresh", () => {
    let state = freshWind();
    for (let group = 0; group < 2; group++) {
      for (let drop = 0; drop < 4; drop++) state = finishWindDrop(state);
      state = stepWind(state, WIND_TURN_SECONDS, true);
      expect(state.direction).toBe(group === 0 ? -1 : 1);
    }
    expect(freshWind()).toEqual({ direction: 1, drops: 0, turn: null, from: 1 });
  });
});