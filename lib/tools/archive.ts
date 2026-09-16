import JSZip from "jszip";
import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";

export type ArchiveEntry = {
  originalName: string;
  name: string;
  directory: boolean;
  size: number;
};

export type ArchiveData = {
  entries: ArchiveEntry[];
  zip: JSZip;
};

function safeArchivePath(name: string) {
  const segments = name.replaceAll("\\", "/").split("/");
  const safe = segments.filter((segment) => segment && segment !== "." && segment !== "..");
  return safe.join("/");
}

function mimeForName(name: string) {
  const extension = name.toLowerCase().split(".").pop();
  return extension === "txt" ? "text/plain"
    : extension === "json" ? "application/json"
      : extension === "csv" ? "text/csv"
        : extension === "pdf" ? "application/pdf"
          : extension === "jpg" || extension === "jpeg" ? "image/jpeg"
            : extension === "png" ? "image/png"
              : extension === "gif" ? "image/gif"
                : extension === "webp" ? "image/webp"
                  : "application/octet-stream";
}

export async function readArchive(
  file: File,
  signal: AbortSignal,
  onProgress: (ratio: number) => void = () => undefined,
): Promise<ArchiveData> {
  if (file.size === 0) throw new ProcessingError("Empty ZIP files cannot be processed.", "invalid");
  if (signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new ProcessingError("This ZIP archive could not be opened locally.", "invalid");
  }

  const entries = Object.values(zip.files).map((entry) => {
    const data = (entry as unknown as { _data?: { uncompressedSize?: number } })._data;
    return {
      originalName: entry.name,
      name: safeArchivePath(entry.name),
      directory: entry.dir,
      size: entry.dir ? 0 : data?.uncompressedSize ?? 0,
    };
  }).filter((entry) => entry.name || entry.directory);
  if (!entries.length) throw new ProcessingError("This ZIP archive contains no entries.", "invalid");
  onProgress(1);
  return { entries, zip };
}

const archiveProcessor: ToolProcessor = async (files, options, context) => {
  const outputs: ProcessedFile[] = [];
  for (const [index, file] of files.entries()) {
    const archive = await readArchive(file, context.signal, (ratio) => {
      context.onProgress({ ratio: (index + ratio) / files.length, label: `Inspected ${file.name}` });
    });
    if (options.operation === "archive-list") {
      const manifest = archive.entries
        .map((entry) => `${entry.directory ? "[folder]" : `${entry.size} bytes`}\t${entry.name}`)
        .join("\n");
      outputs.push({
        blob: new Blob([manifest], { type: "text/plain" }),
        type: "text/plain",
        name: `${file.name.replace(/\.zip$/i, "")}-contents.txt`,
      });
      continue;
    }

    const requestedName = typeof options.entry === "string" ? options.entry : "";
    const selected = archive.entries.find((entry) => !entry.directory && (entry.name === requestedName || entry.originalName === requestedName))
      ?? archive.entries.find((entry) => !entry.directory);
    if (!selected) throw new ProcessingError("Select a file inside the ZIP archive to extract.", "invalid");
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    const zipEntry = archive.zip.files[selected.originalName];
    if (!zipEntry) throw new ProcessingError("The selected archive entry could not be found.", "invalid");
    const blob = await zipEntry.async("blob");
    outputs.push({
      blob: new Blob([blob], { type: mimeForName(selected.name) }),
      type: mimeForName(selected.name),
      name: `${file.name.replace(/\.zip$/i, "")}-${selected.name.replaceAll("/", "-")}`,
    });
    context.onProgress({ ratio: (index + 1) / files.length, label: `Extracted ${selected.name}` });
  }
  return outputs;
};

export default archiveProcessor;
