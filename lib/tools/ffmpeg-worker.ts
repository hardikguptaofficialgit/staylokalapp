import { FFmpeg } from "@ffmpeg/ffmpeg";
import { mediaArgs, mediaOutput, type MediaOptions } from "./ffmpeg-commands";

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
let activeId = 0;

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

async function ensureLoaded() {
  if (loaded) return;
  if (typeof WebAssembly === "undefined") throw new Error("WebAssembly is not available in this browser.");
  loadPromise ??= (async () => {
    const base = `${self.location.origin}/api/ffmpeg`;
    await ffmpeg.load({
      coreURL: `${base}/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg-core.wasm`,
    });
    ffmpeg.on("progress", ({ progress }) => post(activeId, { type: "progress", ratio: progress, label: "Encoding media" }));
    ffmpeg.on("log", ({ message }) => {
      logs = `${logs}${message}`.slice(-8_000);
    });
    loaded = true;
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
    activeId = id;
    logs = "";
    await ensureLoaded();
    for (const file of sourceFiles) await ffmpeg.writeFile(file.name, new Uint8Array(file.buffer));
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
    await ffmpeg.exec(args);
    const entries = await ffmpeg.listDir(".");
    const outputNames = operation === "frames"
      ? entries.filter((entry) => (entry.name.startsWith("ihatefiles-frame-") || entry.name === "ihatefiles-contact-sheet.jpg") && entry.name.endsWith(".jpg")).map((entry) => entry.name).sort()
      : operation === "split"
        ? entries.filter((entry) => entry.name.startsWith("ihatefiles-segment-") && entry.name.endsWith(".mp4")).map((entry) => entry.name).sort()
        : [output.pattern];
    if (!outputNames.length) throw new Error(`FFmpeg completed without producing an output file. Generated: ${entries.map((entry) => entry.name).join(", ") || "none"}`);
    const outputs = [];
    for (const name of outputNames) {
      const data = await ffmpeg.readFile(name);
      const buffer = data instanceof Uint8Array ? data.slice().buffer : new TextEncoder().encode(data).buffer;
      outputs.push({ name, buffer });
    }
    result = { outputs, mime: output.mime, extension: output.extension };
  } catch (error) {
    const detail = describeError(error);
    failure = `${detail}${logs ? ` ${logs.slice(-600)}` : ""}`;
  } finally {
    const entries = await ffmpeg.listDir(".").catch(() => []);
    const generated = entries
      .map((entry) => entry.name)
      .filter((name) => name === outputPattern || name === "ihatefiles-contact-sheet.jpg" || name.startsWith("ihatefiles-frame-") || name.startsWith("ihatefiles-segment-"));
    await cleanup([...temporaryNames, ...generated]);
    if (result) {
      post(id, { type: "complete", ...result });
    } else {
      post(id, { type: "error", message: failure ?? "FFmpeg could not process this file." });
    }
  }
};
