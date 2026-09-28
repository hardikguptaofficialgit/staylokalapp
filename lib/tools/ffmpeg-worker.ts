import { FFmpeg } from "@ffmpeg/ffmpeg";
import { mediaArgs, mediaOutput, type MediaOptions } from "./ffmpeg-commands";
import { FFMPEG_TEMP_PREFIX, ffmpegTempName } from "./ffmpeg-temp-prefix";
import { clampProgressRatio, mapEncodeProgress, parseMediaDurationSeconds, parseMediaTimeSeconds } from "./ffmpeg-progress";

type Request = {
  id: number;
  files: { name: string; buffer: ArrayBuffer }[];
  operation: string;
  options: MediaOptions;
};

const ffmpeg = new FFmpeg();
let loaded = false;
let loadPromise: Promise<void> | null = null;
let logs = "";

function post(id: number, message: Record<string, unknown>) {
  self.postMessage({ id, ...message });
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "FFmpeg could not process this file.";
}

class ProgressTracker {
  private peak = 0;
  private durationSeconds: number | null = null;

  constructor(private readonly id: number) {}

  private labelFor(phase: "load" | "prepare" | "encode" | "finalize") {
    const names: Record<typeof phase, string> = {
      load: "Loading media engine",
      prepare: "Preparing input",
      encode: "Encoding media",
      finalize: "Finalizing output",
    };
    return names[phase];
  }

  report(ratio: number, phase: "load" | "prepare" | "encode" | "finalize" = "encode") {
    const clamped = clampProgressRatio(ratio);
    this.peak = Math.max(this.peak, clamped);
    post(this.id, { type: "progress", ratio: this.peak, label: this.labelFor(phase) });
  }

  noteLog(message: string) {
    const duration = parseMediaDurationSeconds(message);
    if (duration) this.durationSeconds = duration;
    const current = parseMediaTimeSeconds(message);
    if (current !== null && this.durationSeconds) {
      this.report(mapEncodeProgress(current / this.durationSeconds), "encode");
      return;
    }
    if (message.includes("Duration:") && !this.durationSeconds) {
      this.report(0.16, "prepare");
    }
  }

  noteLibraryProgress(progress: number) {
    const normalized = clampProgressRatio(progress);
    const mapped = mapEncodeProgress(normalized);
    if (this.durationSeconds) {
      this.report(Math.max(mapped, this.peak), "encode");
      return;
    }
    this.report(mapped, "encode");
  }

  phaseLoad() { this.report(0.04, "load"); }
  phasePrepared() { this.report(0.14, "prepare"); }
  phaseFinalize(index: number, total: number) {
    const slice = total > 0 ? (index + 1) / total : 1;
    this.report(0.96 + slice * 0.04, "finalize");
  }
}

async function ensureLoaded(progress: ProgressTracker) {
  if (loaded) return;
  if (typeof WebAssembly === "undefined") throw new Error("WebAssembly is not available in this browser.");
  progress.phaseLoad();
  loadPromise ??= (async () => {
    const base = `${self.location.origin}/api/ffmpeg`;
    await ffmpeg.load({
      coreURL: `${base}/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg-core.wasm`,
    });
    ffmpeg.on("progress", ({ progress: encodeRatio }) => progress.noteLibraryProgress(encodeRatio));
    ffmpeg.on("log", ({ message }) => {
      logs = `${logs}${message}\n`.slice(-12_000);
      progress.noteLog(message);
    });
    loaded = true;
    progress.report(0.12, "load");
  })();
  try {
    await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

async function cleanup(names: string[]) {
  for (const name of names) {
    try {
      await ffmpeg.deleteFile(name);
    } catch {
      // Cleanup is best-effort because FFmpeg may already have discarded a file.
    }
  }
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const { id, files, operation, options } = data;
  const progress = new ProgressTracker(id);
  const sourceFiles = files.map((file, index) => {
    const suffix = index ? `-${index}` : "";
    const dot = file.name.lastIndexOf(".");
    const name = dot > 0 ? `${file.name.slice(0, dot)}${suffix}${file.name.slice(dot)}` : `${file.name}${suffix}`;
    return { ...file, name };
  });
  const inputNames = sourceFiles.map((file) => file.name);
  const temporaryNames = [...inputNames, "concat.txt"];
  let outputPattern = "";
  let result: { outputs: { name: string; buffer: ArrayBuffer }[]; mime: string; extension: string } | null = null;
  let failure: string | null = null;
  try {
    logs = "";
    await ensureLoaded(progress);
    for (const file of sourceFiles) await ffmpeg.writeFile(file.name, new Uint8Array(file.buffer));
    progress.phasePrepared();
    let input = sourceFiles[0].name;
    if (operation === "merge") {
      const concat = sourceFiles.map((file) => `file '${file.name.replaceAll("'", "'\\''")}'`).join("\n");
      await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concat));
      input = "concat.txt";
    }
    const output = mediaOutput(operation, options, input);
    outputPattern = output.pattern;
    let audioPresent = true;
    if (operation === "speed" || operation === "cut") {
      logs = "";
      await ffmpeg.exec(["-i", input, "-t", "0", "-f", "null", "-"]).catch(() => undefined);
      audioPresent = /Stream #[^:]+:\d+(?:\([^)]*\))?:\s*Audio:/i.test(logs);
    }
    const extension = input.toLowerCase().split(".").pop() ?? "";
    const audioOnly = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "oga"].includes(extension);
    const commandOptions = (operation === "speed" || operation === "cut")
      ? { ...options, videoOnly: !audioPresent }
      : operation === "normalize-audio"
        ? { ...options, audioOnly }
        : options;
    const args = operation === "merge"
      ? ["-f", "concat", "-safe", "0", "-i", input, "-c:v", "libx264", "-c:a", "aac", output.pattern]
      : mediaArgs(operation, commandOptions, input, output);
    progress.report(0.15, "encode");
    await ffmpeg.exec(args);
    const entries = await ffmpeg.listDir(".");
    const outputNames = operation === "frames"
      ? entries.filter((entry) => (entry.name.startsWith(`${FFMPEG_TEMP_PREFIX}-frame-`) || entry.name === ffmpegTempName("contact-sheet.jpg")) && entry.name.endsWith(".jpg")).map((entry) => entry.name).sort()
      : operation === "split"
        ? entries.filter((entry) => entry.name.startsWith(`${FFMPEG_TEMP_PREFIX}-segment-`) && entry.name.endsWith(".mp4")).map((entry) => entry.name).sort()
        : [output.pattern];
    if (!outputNames.length) throw new Error(`FFmpeg completed without producing an output file. Generated: ${entries.map((entry) => entry.name).join(", ") || "none"}`);
    const outputs = [];
    for (let index = 0; index < outputNames.length; index += 1) {
      const name = outputNames[index];
      progress.phaseFinalize(index, outputNames.length);
      const fileData = await ffmpeg.readFile(name);
      const buffer = fileData instanceof Uint8Array ? fileData.slice().buffer : new TextEncoder().encode(fileData).buffer;
      outputs.push({ name, buffer });
    }
    progress.report(1, "finalize");
    result = { outputs, mime: output.mime, extension: output.extension };
  } catch (error) {
    const detail = describeError(error);
    failure = `${detail}${logs ? ` ${logs.slice(-600)}` : ""}`;
  } finally {
    const entries = await ffmpeg.listDir(".").catch(() => []);
    const generated = entries
      .map((entry) => entry.name)
      .filter((name) => name === outputPattern || name === ffmpegTempName("contact-sheet.jpg") || name.startsWith(`${FFMPEG_TEMP_PREFIX}-frame-`) || name.startsWith(`${FFMPEG_TEMP_PREFIX}-segment-`));
    await cleanup([...temporaryNames, ...generated]);
    if (result) {
      post(id, { type: "complete", ...result });
    } else {
      post(id, { type: "error", message: failure ?? "FFmpeg could not process this file." });
    }
  }
};
