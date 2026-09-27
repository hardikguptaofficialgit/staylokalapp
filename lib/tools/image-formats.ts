import { encodeCanvasToIco } from "./ico-encode";
import { encodeCanvasToTiff } from "./tiff-encode";
import { ProcessingError } from "./types";

export type ImageExportFormat = {
  extension: string;
  label: string;
  mime: string;
};

/** Raster formats browsers can encode through Canvas (decode varies by input). */
export const IMAGE_EXPORT_FORMATS: readonly ImageExportFormat[] = [
  { label: "JPEG", mime: "image/jpeg", extension: "jpg" },
  { label: "PNG", mime: "image/png", extension: "png" },
  { label: "WebP", mime: "image/webp", extension: "webp" },
  { label: "GIF", mime: "image/gif", extension: "gif" },
  { label: "BMP", mime: "image/bmp", extension: "bmp" },
  { label: "AVIF", mime: "image/avif", extension: "avif" },
  { label: "ICO", mime: "image/x-icon", extension: "ico" },
  { label: "TIFF", mime: "image/tiff", extension: "tiff" },
];

export function imageFormatSelectOptions() {
  return IMAGE_EXPORT_FORMATS.map((item) => ({ label: item.label, value: item.mime }));
}

export function isImageExportMime(mime: string) {
  return IMAGE_EXPORT_FORMATS.some((item) => item.mime === mime);
}

export function normalizeImageMime(value: unknown, fallback = "image/jpeg") {
  const mime = typeof value === "string" ? value.trim() : "";
  return isImageExportMime(mime) ? mime : fallback;
}

export function imageExtensionForMime(mime: string) {
  return IMAGE_EXPORT_FORMATS.find((item) => item.mime === mime)?.extension ?? "png";
}

export function imageFormatLabel(mime: string) {
  return IMAGE_EXPORT_FORMATS.find((item) => item.mime === mime)?.label ?? "Image";
}

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
