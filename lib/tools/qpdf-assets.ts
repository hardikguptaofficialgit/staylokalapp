import { ProcessingError } from "./types";

/** Self-hosted qpdf-run assets under /public/qpdf (see scripts/copy-qpdf-assets.mjs). */
export function qpdfRunnerAssetOptions() {
  if (typeof window === "undefined") {
    throw new ProcessingError("PDF compression runs only in the browser.", "unsupported");
  }
  const origin = window.location.origin.replace(/\/+$/, "");
  const base = `${origin}/qpdf/`;
  return {
    assetBaseUrl: base,
    workerUrl: `${base}worker.js`,
  };
}

export function qpdfCompressionErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code)
    : "";
  if (code === "QPDF_INIT_FAILED") {
    return "PDF compression could not load in this browser. Refresh the page and try again.";
  }
  if (code === "QPDF_TIMEOUT") {
    return "PDF compression took too long. Try a smaller PDF or flatten scanned pages first.";
  }
  if (code === "QPDF_EXEC_FAILED") {
    return "qpdf could not compress this PDF. It may be encrypted, corrupted, or use unsupported features.";
  }
  return "PDF compression could not complete. Try flattening large scans or removing embedded attachments first.";
}
