import JSZip from "jszip";
import type { ProcessedFile } from "@/lib/tools/types";

export async function buildResultsZip(files: ProcessedFile[]) {
  const zip = new JSZip();
  for (const item of files) zip.file(item.name, item.blob);
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
