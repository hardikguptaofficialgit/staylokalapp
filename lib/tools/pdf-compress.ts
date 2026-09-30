import { ProcessingError, type ProcessorContext } from "./types";
import { qpdfCompressionErrorMessage, qpdfRunnerAssetOptions } from "./qpdf-assets";

export type PdfCompressProfile = "balanced" | "maximum";

export type PdfCompressOptions = {
  compressProfile?: string;
  removeMetadata?: boolean;
};

type QpdfRunner = {
  runOne: (options: {
    input: Uint8Array;
    inputName?: string;
    outputName?: string;
    args: string[];
  }) => Promise<Uint8Array>;
  destroy: () => Promise<void>;
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatCompressionSummary(originalBytes: number, outputBytes: number) {
  const savedBytes = Math.max(0, originalBytes - outputBytes);
  const savedPercent = originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0;
  return {
    savedBytes,
    savedPercent,
    detail: `${formatFileSize(originalBytes)} → ${formatFileSize(outputBytes)} · saved ${formatFileSize(savedBytes)} (${savedPercent.toFixed(1)}% smaller)`,
  };
}

function compressProfileFromOptions(options: PdfCompressOptions): PdfCompressProfile {
  return options.compressProfile === "maximum" ? "maximum" : "balanced";
}

function qpdfCompressArgs(compressionLevel: number, extras: string[] = []) {
  return [
    "--stream-data=compress",
    "--object-streams=generate",
    "--compress-streams=y",
    "--recompress-flate",
    `--compression-level=${compressionLevel}`,
    ...extras,
    "--",
    "input.pdf",
    "output.pdf",
  ];
}

async function runQpdfPass(runner: QpdfRunner, input: Uint8Array, compressionLevel: number, extras: string[] = []) {
  return runner.runOne({
    input,
    inputName: "input.pdf",
    outputName: "output.pdf",
    args: qpdfCompressArgs(compressionLevel, extras),
  });
}

async function tryQpdfPass(runner: QpdfRunner, input: Uint8Array, compressionLevel: number, extras: string[] = []) {
  try {
    const output = await runQpdfPass(runner, input, compressionLevel, extras);
    return output.byteLength < input.byteLength ? output : null;
  } catch {
    return null;
  }
}

async function stripPdfMetadata(input: Uint8Array) {
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.load(input);
  document.setTitle("");
  document.setAuthor("");
  document.setSubject("");
  document.setKeywords([]);
  document.setCreator("");
  document.setProducer("");
  document.setCreationDate(new Date(0));
  document.setModificationDate(new Date(0));
  return new Uint8Array(await document.save({ useObjectStreams: true }));
}

async function improveWithPasses(
  runner: QpdfRunner,
  input: Uint8Array,
  profile: PdfCompressProfile,
  context: ProcessorContext,
  passOffset: number,
  passTotal: number,
) {
  let best = input;
  const steps: Array<{ label: string; level: number; extras: string[] }> = profile === "maximum"
    ? [
        { label: "Recompressing streams", level: 9, extras: [] },
        { label: "Decoding and re-encoding content", level: 9, extras: ["--decode-level=generalized"] },
        { label: "Tightening object structure", level: 9, extras: ["--remove-unreferenced-resources"] },
        { label: "Final pass", level: 9, extras: [] },
      ]
    : [{ label: "Optimizing PDF streams", level: 6, extras: [] }];

  for (const [index, step] of steps.entries()) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    context.onProgress({
      ratio: Math.min(0.95, (passOffset + index + 1) / passTotal),
      label: `${step.label} (${index + 1}/${steps.length})…`,
    });
    const output = await tryQpdfPass(runner, best, step.level, step.extras);
    if (output) best = output;
  }
  return best;
}

export async function compressPdfFile(
  file: File,
  options: PdfCompressOptions,
  context: ProcessorContext,
) {
  const profile = compressProfileFromOptions(options);
  const baselineBytes = file.size;
  let working = new Uint8Array(await file.arrayBuffer());

  if (options.removeMetadata) {
    context.onProgress({ ratio: 0.05, label: "Removing document metadata…" });
    working = await stripPdfMetadata(working);
  }

  try {
    const { createQpdfRunner } = await import("qpdf-run");
    const runner = await createQpdfRunner({
      ...qpdfRunnerAssetOptions(),
      timeoutMs: profile === "maximum" ? 120_000 : 60_000,
    });
    try {
      const passTotal = profile === "maximum" ? 4 : 1;
      const compressed = await improveWithPasses(runner, working, profile, context, 0, passTotal);
      if (compressed.byteLength >= baselineBytes) {
        throw new ProcessingError(
          "Compression did not reduce this PDF. The original file is already efficiently encoded.",
          "invalid",
        );
      }
      const summary = formatCompressionSummary(baselineBytes, compressed.byteLength);
      context.onProgress({ ratio: 1, label: `Saved ${formatFileSize(summary.savedBytes)} (${summary.savedPercent.toFixed(1)}%)` });
      const baseName = file.name.replace(/\.pdf$/i, "");
      return {
        bytes: compressed,
        summary,
        name: `${baseName}-compressed.pdf`,
      };
    } finally {
      await runner.destroy();
    }
  } catch (error) {
    if (error instanceof ProcessingError) throw error;
    throw new ProcessingError(qpdfCompressionErrorMessage(error), "unsupported");
  }
}
