import { describe, expect, it } from "vitest";
import { mediaArgs, mediaOutput } from "../lib/tools/ffmpeg-commands";
import { tools } from "../lib/tools/registry";

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

  it("mutes video by copying the video stream without audio", () => {
    const output = mediaOutput("mute", {}, "fixture.mp4");
    expect(mediaArgs("mute", {}, "fixture.mp4", output)).toEqual([
      "-i", "fixture.mp4", "-map", "0:v:0", "-c:v", "copy", output.pattern,
    ]);
  });

  it("re-encodes cut output with browser-compatible MP4 codecs", () => {
    expect(mediaArgs("cut", { startSeconds: 1, durationSeconds: 2 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"))).toContain("libx264");
    expect(mediaArgs("cut", { startSeconds: 1, durationSeconds: 2 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"))).toContain("aac");
  });

  it("limits frame export to the selected time range when provided", () => {
    expect(mediaArgs("frames", { startSeconds: 2, durationSeconds: 5, fps: 2 }, "fixture.mp4", mediaOutput("frames", {}, "fixture.mp4"))).toEqual([
      "-ss", "2", "-i", "fixture.mp4", "-t", "5", "-vf", "fps=2", "staylokal-frame-%03d.jpg",
    ]);
  });

  it("builds fade and volume filters for audio tools", () => {
    const output = mediaOutput("audio-fade", {}, "fixture.wav");
    expect(mediaArgs("audio-fade", { fadeIn: 1, fadeOut: 2 }, "fixture.wav", output).join(" ")).toContain("afade=t=in:st=0:d=1");
    expect(mediaArgs("audio-volume", { gainDb: 6 }, "fixture.wav", mediaOutput("audio-volume", {}, "fixture.wav"))).toContain("volume=6dB");
  });

  it("uses an audio-only codec for normalized WAV output", () => {
    const output = mediaOutput("normalize-audio", {}, "fixture.wav");
    expect(mediaArgs("normalize-audio", { audioOnly: true }, "fixture.wav", output)).toEqual([
      "-i", "fixture.wav", "-vn", "-af", "loudnorm", "-c:a", "pcm_s16le", "staylokal-output.wav",
    ]);
  });

  it.each(tools.filter((tool) => tool.kind === "ffmpeg").map((tool) => tool.id))(
    "builds FFmpeg args for exposed tool %s",
    (operation) => {
      const tool = tools.find((item) => item.id === operation)!;
      const options = Object.fromEntries(tool.options.map((option) => [option.id, option.defaultValue ?? option.options?.[0]?.value ?? ""]));
      const input = operation === "from-gif"
        ? "fixture.gif"
        : tool.accept.includes("audio/*") && !tool.accept.includes("video/*")
          ? "fixture.wav"
          : "fixture.mp4";
      const extension = input.split(".").pop() ?? "mp4";
      const audioOnly = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "oga"].includes(extension);
      const output = mediaOutput(operation, options, input);
      const args = mediaArgs(operation, { ...options, audioOnly, videoOnly: false }, input, output);
      expect(args.length).toBeGreaterThan(0);
      expect(output.pattern).toBeTruthy();
    },
  );
});
