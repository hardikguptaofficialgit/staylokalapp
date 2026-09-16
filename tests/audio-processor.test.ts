import { describe, expect, it } from "vitest";
import { audioTrimOptions } from "../components/editor/media/audio-processor";
import { rangeAction } from "../components/editor/media/types";

describe("audio editor processor adapter", () => {
  it("maps the selected range to the registered audio-trim options", () => {
    expect(audioTrimOptions(rangeAction("trim", 1.25, 4.5))).toEqual({
      operation: "audio-trim",
      start: "0:00:01.250",
      duration: "0:00:03.250",
    });
  });
});
