import { describe, expect, it } from "vitest";
import { levelSpec } from "./levels";

describe("obstacles preserved during scenery corrections", () => {
  it("retains Market wind", () => expect(levelSpec(20).wind).toBe(100));
  it("retains Gardens moving crane", () => expect(levelSpec(40).slide).toBe(30));
  it("retains Rail Yard slippery rain", () => expect(levelSpec(60).slip).toBe(3));
  it("retains Downtown fog", () => expect(levelSpec(70).fog).toBe(0.3));
  it("retains Skyline night", () => expect(levelSpec(80).night).toBe(true));
  it("retains Cloud Peak narrowing", () => expect(levelSpec(90).width).toBe(0.985));
});