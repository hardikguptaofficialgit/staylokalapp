import { ProcessingError, type ToolProcessor } from "./types";

let worker: Worker | null = null;
let requestId = 0;
let activeRequest = false;

function getWorker() {
  if (typeof window === "undefined") throw new ProcessingError("Media processing is only available in a browser.", "unsupported");
  worker ??= new Worker(new URL("./ffmpeg-worker.ts", import.meta.url), { type: "module" });
  return worker;
}

const ffmpegProcessor: ToolProcessor = async (files, options, context) => {
  if (!files.length) throw new ProcessingError("Add at least one media file first.", "invalid");
  if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
    throw new ProcessingError("This browser does not support the local media engine.", "unsupported");
  }
  if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
  if (activeRequest) throw new ProcessingError("Media processing is already in progress.", "runtime");
  const id = ++requestId;
  const activeWorker = getWorker();
  activeRequest = true;
  let inputs: { name: string; buffer: ArrayBuffer }[];
  try {
    inputs = await Promise.all(files.map(async (file) => ({ name: file.name, buffer: await file.arrayBuffer() })));
  } catch (error) {
    activeRequest = false;
    throw new ProcessingError(error instanceof Error ? error.message : "Could not read media files.", "runtime");
  }
  if (context.signal.aborted) {
    activeRequest = false;
    throw new ProcessingError("Processing cancelled.", "cancelled");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      activeWorker.removeEventListener("message", onMessage);
      activeWorker.removeEventListener("error", onWorkerError);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      context.signal.removeEventListener("abort", cancel);
      activeRequest = false;
      callback();
    };
    const cancel = () => {
      finish(() => reject(new ProcessingError("Processing cancelled.", "cancelled")));
      if (worker === activeWorker) {
        activeWorker.terminate();
        worker = null;
      }
    };
    const onMessage = (event: MessageEvent<{
      id: number;
      type: string;
      ratio?: number;
      label?: string;
      outputs?: { name: string; buffer: ArrayBuffer }[];
      mime?: string;
      message?: string;
    }>) => {
      if (event.data.id !== id) return;
      if (event.data.type === "progress") context.onProgress({ ratio: event.data.ratio ?? 0, label: event.data.label ?? "Processing media" });
      if (event.data.type === "complete") {
        if (!event.data.outputs?.length || !event.data.mime) {
          finish(() => reject(new ProcessingError("Media processing completed without a downloadable result.", "runtime")));
          return;
        }
        finish(() => resolve(event.data.outputs!.map((output, index) => ({
            blob: new Blob([output.buffer], { type: event.data.mime }),
            name: `${files[0].name.replace(/\.[^.]+$/, "")}-${String(options.operation || "processed")}-${String(index + 1).padStart(3, "0")}.${output.name.split(".").pop()}`,
            type: event.data.mime!,
          }))));
      }
      if (event.data.type === "error") {
        finish(() => reject(new ProcessingError(event.data.message ?? "Media processing failed.", "runtime")));
      }
    };
    const onWorkerError = (event: ErrorEvent) => {
      finish(() => reject(new ProcessingError(event.message || "The media worker stopped unexpectedly.", "runtime")));
      if (worker === activeWorker) {
        activeWorker.terminate();
        worker = null;
      }
    };
    activeWorker.addEventListener("message", onMessage);
    activeWorker.addEventListener("error", onWorkerError);
    context.signal.addEventListener("abort", cancel, { once: true });
    try {
      activeWorker.postMessage({ id, files: inputs, operation: options.operation, options }, inputs.map((input) => input.buffer));
    } catch (error) {
      finish(() => reject(new ProcessingError(error instanceof Error ? error.message : "Could not start media processing.", "runtime")));
    }
  });
};

export default ffmpegProcessor;
