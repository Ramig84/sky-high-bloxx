import { describe, expect, it } from "vitest";
import { endlessSpec, endlessStage } from "./endless";
import { levelSpec } from "./levels";

describe("endless mode", () => {
  it("starts harder than the last campaign level's crane", () => {
    expect(endlessSpec(0).speed).toBeLessThan(levelSpec(99).speed + 20);
    expect(endlessSpec(20).speed).toBeGreaterThan(levelSpec(99).speed);
  });
  it("adds a new obstacle every 10 floors and keeps earlier ones", () => {
    expect(endlessSpec(9).wind).toBe(0);
    expect(endlessSpec(10).wind).toBeGreaterThan(0);
    expect(endlessSpec(20).slide).toBeGreaterThan(0);
    expect(endlessSpec(30).slip).toBeGreaterThan(0);
    expect(endlessSpec(40).fog).toBeGreaterThan(0);
    expect(endlessSpec(50).night).toBe(true);
    expect(endlessSpec(60).width).toBeLessThan(1);
    const late = endlessSpec(80);
    expect(late.wind && late.slide && late.slip && late.fog && late.night).toBeTruthy();
  });
  it("never ends by goal and ramps wind", () => {
    expect(endlessSpec(500).goal).toBe(Infinity);
    expect(endlessSpec(40).wind).toBeGreaterThan(endlessSpec(15).wind);
    expect(endlessStage(1000)).toBe(6);
  });
});
