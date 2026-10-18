import { expect, it } from "vitest";
import { poseBlend } from "./poseMotion";

it("keeps fast wing poses crisp instead of double-exposing silhouettes", () => {
  expect(poseBlend([0, 1, 2], 8, 0, 0.1, false)).toEqual({ current: 0, next: 1, mix: 0 });
});
it("dissolves slow poses continuously across the cycle boundary", () => {
  const before = poseBlend([0, 1], 3, 0, 2 / 3 - 0.00001, true);
  const after = poseBlend([0, 1], 3, 0, 2 / 3, true);
  expect(before.next).toBe(after.current);
  expect(before.mix).toBeGreaterThan(0.999);
  expect(after.mix).toBe(0);
});