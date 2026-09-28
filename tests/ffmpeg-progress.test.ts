import { describe, expect, it } from "vitest";
import { clampProgressRatio, mapEncodeProgress, parseMediaDurationSeconds, parseMediaTimeSeconds } from "../lib/tools/ffmpeg-progress";

describe("ffmpeg progress helpers", () => {
  it("clamps invalid ratios", () => {
    expect(clampProgressRatio(-0.2)).toBe(0);
    expect(clampProgressRatio(1.4)).toBe(1);
    expect(clampProgressRatio(Number.NaN)).toBe(0);
  });

  it("maps encode progress into the reserved slice", () => {
    expect(mapEncodeProgress(0)).toBeCloseTo(0.14, 2);
    expect(mapEncodeProgress(1)).toBeCloseTo(0.96, 2);
    expect(mapEncodeProgress(0.5)).toBeCloseTo(0.55, 2);
  });

  it("parses duration and time from ffmpeg logs", () => {
    expect(parseMediaDurationSeconds("Input #0, Duration: 00:01:05.12")).toBeCloseTo(65.12, 1);
    expect(parseMediaTimeSeconds("frame= 12 fps=0.0 q=-1.0 size=       0kB time=00:00:02.50 bitrate=   0.0kbits/s")).toBeCloseTo(2.5, 1);
  });
});
