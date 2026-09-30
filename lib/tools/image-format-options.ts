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
