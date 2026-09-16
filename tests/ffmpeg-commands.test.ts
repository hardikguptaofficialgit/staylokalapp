import { describe, expect, it } from "vitest";
import { mediaArgs, mediaOutput } from "../lib/tools/ffmpeg-commands";

describe("video command validation", () => {
  it("rejects zero playback speed instead of building a hanging atempo loop", () => {
    expect(() => mediaArgs("speed", { speed: 0 }, "fixture.mp4", mediaOutput("speed", {}, "fixture.mp4"))).toThrow(
      "Playback speed must be greater than zero.",
    );
  });

  it("rejects invalid cut ranges", () => {
    expect(() => mediaArgs("cut", { startSeconds: 1, durationSeconds: 0 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"))).toThrow(
      "Cut start and duration must be valid positive numbers.",
    );
  });

  it("re-encodes cut output with browser-compatible MP4 codecs", () => {
    expect(mediaArgs("cut", { startSeconds: 1, durationSeconds: 2 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"))).toContain("libx264");
    expect(mediaArgs("cut", { startSeconds: 1, durationSeconds: 2 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"))).toContain("aac");
  });

  it("uses an audio-only codec for normalized WAV output", () => {
    const output = mediaOutput("normalize-audio", {}, "fixture.wav");
    expect(mediaArgs("normalize-audio", { audioOnly: true }, "fixture.wav", output)).toEqual([
      "-i", "fixture.wav", "-vn", "-af", "loudnorm", "-c:a", "pcm_s16le", "ihatefiles-output.wav",
    ]);
  });
});
