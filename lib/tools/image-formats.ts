import { encodeCanvasToIco } from "./ico-encode";
import { encodeCanvasToTiff } from "./tiff-encode";
import {
  imageFormatLabel,
  normalizeImageMime,
  type ImageExportFormat,
} from "./image-format-options";
import { ProcessingError } from "./types";

export type { ImageExportFormat };
export {
  IMAGE_EXPORT_FORMATS,
  imageExtensionForMime,
  imageFormatLabel,
  imageFormatSelectOptions,
  isImageExportMime,
  normalizeImageMime,
} from "./image-format-options";

export async function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality = 0.92,
): Promise<Blob> {
  const normalized = normalizeImageMime(mime);
  if (normalized === "image/x-icon") {
    return encodeCanvasToIco(canvas);
  }
  if (normalized === "image/tiff") {
    const nativeTiff = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/tiff", quality));
    if (nativeTiff) return nativeTiff;
    const bytes = encodeCanvasToTiff(canvas);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: "image/tiff" });
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, normalized, quality));
  if (blob) return blob;
  if (normalized !== "image/png") {
    const fallback = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", quality));
    if (fallback) {
      throw new ProcessingError(
        `${imageFormatLabel(normalized)} export is not supported in this browser. Try JPEG, PNG, or WebP.`,
        "unsupported",
      );
    }
  }
  throw new ProcessingError("The image could not be encoded.", "runtime");
}

export function resolvePdfRasterExportFormat(operation: string, options: Record<string, unknown>) {
  if (operation === "pdf-to-jpg") return "image/jpeg";
  if (operation === "pdf-to-png") return "image/png";
  if (operation === "pdf-to-image") return normalizeImageMime(options.format, "image/png");
  return null;
}
