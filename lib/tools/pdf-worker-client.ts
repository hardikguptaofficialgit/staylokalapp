import { ProcessingError, type ProcessorContext } from "./types";

let requestId = 0;

export function runPdfWorker(
  file: File,
  operation: "pdf-watermark" | "pdf-page-numbers" | "pdf-add-text" | "pdf-header-footer" | "pdf-highlight" | "pdf-shape",
  options: { text?: string; fontSize?: number; pageNumber?: number; header?: string; footer?: string; x?: number; y?: number; width?: number; height?: number },
  context: ProcessorContext,
) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const worker = new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
    const id = ++requestId;
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback();
    };
    const onAbort = () => finish(() => reject(new ProcessingError("Processing cancelled.", "cancelled")));
    context.signal.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<{ id: number; type: string; ratio?: number; label?: string; bytes?: ArrayBuffer; message?: string }>) => {
      if (event.data.id !== id) return;
      if (event.data.type === "progress") {
        context.onProgress({ ratio: event.data.ratio ?? 0, label: event.data.label ?? "Processing PDF" });
        return;
      }
      context.signal.removeEventListener("abort", onAbort);
      if (event.data.type === "result" && event.data.bytes) finish(() => resolve(new Uint8Array(event.data.bytes!)));
      else finish(() => reject(new ProcessingError(event.data.message ?? "PDF worker failed.", "runtime")));
    };
    worker.onerror = (event) => {
      context.signal.removeEventListener("abort", onAbort);
      finish(() => reject(new ProcessingError(event.message || "PDF worker failed.", "runtime")));
    };
    void file.arrayBuffer().then((buffer) => {
      if (settled) return;
      worker.postMessage({ id, operation, bytes: buffer, ...options }, [buffer]);
    }).catch((error: unknown) => {
      context.signal.removeEventListener("abort", onAbort);
      finish(() => reject(error));
    });
  });
}
