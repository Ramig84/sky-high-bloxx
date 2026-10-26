import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("all approved district skies are opaque, so omitting covered fallback layers preserves pixels", () => {
  const root = resolve(process.cwd(), "src/assets");
  const skies = readdirSync(root).filter(name => /^dsky-.*-(low|high)\.webp$/.test(name));
  expect(skies).toHaveLength(20);
  for (const name of skies) {
    const bytes = readFileSync(resolve(root, name));
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    const type = bytes.toString("ascii", 12, 16);
    expect(type === "VP8 " || (type === "VP8X" && !(bytes[20]! & 16))).toBe(true);
  }
});
