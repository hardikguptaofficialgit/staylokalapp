import ffmpegProcessor from "../../../lib/tools/ffmpeg";
import type { MediaEditorAction } from "./types";
import type { ProcessedFile, ProgressEvent } from "@/lib/tools/types";

export function audioTrimOptions(action: MediaEditorAction) {
  return {
    operation: "audio-trim",
    start: action.start,
    duration: action.duration,
  };
}

export function processAudioTrim(
  file: File,
  action: MediaEditorAction,
  signal: AbortSignal,
  onProgress: (event: ProgressEvent) => void,
): Promise<ProcessedFile[]> {
  return ffmpegProcessor([file], audioTrimOptions(action), { signal, onProgress });
}
