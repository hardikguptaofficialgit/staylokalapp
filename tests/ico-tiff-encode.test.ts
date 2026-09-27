import { describe, expect, it } from "vitest";
import { encodeRgbaToTiff } from "../lib/tools/tiff-encode";

describe("custom image encoders", () => {
  it("writes a minimal RGB TIFF header", () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ]);
    const tiff = encodeRgbaToTiff(2, 2, rgba);
    expect(tiff[0]).toBe(0x49);
    expect(tiff[1]).toBe(0x49);
    expect(tiff.length).toBeGreaterThan(40);
  });
});
