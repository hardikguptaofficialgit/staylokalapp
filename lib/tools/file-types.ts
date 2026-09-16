export type DetectedFileKind =
  | "pdf"
  | "image"
  | "document"
  | "presentation"
  | "text"
  | "video"
  | "spreadsheet"
  | "audio"
  | "archive"
  | "folder"
  | "unknown";

export type DetectedFileType = {
  kind: DetectedFileKind;
  label: string;
};

const extensionKinds: Record<string, DetectedFileType> = {
  pdf: { kind: "pdf", label: "PDF" },
  jpg: { kind: "image", label: "JPEG image" },
  jpeg: { kind: "image", label: "JPEG image" },
  png: { kind: "image", label: "PNG image" },
  gif: { kind: "image", label: "GIF image" },
  webp: { kind: "image", label: "WebP image" },
  svg: { kind: "image", label: "SVG image" },
  bmp: { kind: "image", label: "BMP image" },
  avif: { kind: "image", label: "AVIF image" },
  doc: { kind: "document", label: "Word document" },
  docx: { kind: "document", label: "Word document" },
  ppt: { kind: "presentation", label: "Legacy PowerPoint presentation" },
  pptx: { kind: "presentation", label: "PowerPoint presentation" },
  txt: { kind: "text", label: "Text file" },
  mp4: { kind: "video", label: "MP4 video" },
  webm: { kind: "video", label: "WebM video" },
  mov: { kind: "video", label: "MOV video" },
  avi: { kind: "video", label: "Video" },
  mkv: { kind: "video", label: "Video" },
  xls: { kind: "spreadsheet", label: "Excel spreadsheet" },
  xlsx: { kind: "spreadsheet", label: "Excel spreadsheet" },
  mp3: { kind: "audio", label: "MP3 audio" },
  wav: { kind: "audio", label: "WAV audio" },
  m4a: { kind: "audio", label: "Audio" },
  aac: { kind: "audio", label: "Audio" },
  flac: { kind: "audio", label: "Audio" },
  zip: { kind: "archive", label: "ZIP archive" },
};

function typeFromMime(mime: string): DetectedFileType | undefined {
  if (mime === "application/pdf") return extensionKinds.pdf;
  if (mime === "image/svg+xml") return extensionKinds.svg;
  if (mime === "image/bmp" || mime === "image/x-ms-bmp") return extensionKinds.bmp;
  if (mime === "image/avif") return extensionKinds.avif;
  if (mime.startsWith("image/")) return { kind: "image", label: "Image" };
  if (mime.startsWith("video/")) return { kind: "video", label: "Video" };
  if (mime.startsWith("audio/")) return { kind: "audio", label: "Audio" };
  if (mime === "application/msword" || mime.includes("wordprocessingml")) return { kind: "document", label: "Word document" };
  if (mime.includes("presentation")) return { kind: "presentation", label: "PowerPoint presentation" };
  if (mime === "text/plain") return extensionKinds.txt;
  if (mime.includes("spreadsheet") || mime === "application/vnd.ms-excel") return { kind: "spreadsheet", label: "Excel spreadsheet" };
  if (mime === "application/zip" || mime === "application/x-zip-compressed") return extensionKinds.zip;
  return undefined;
}

export function detectFileType(file: File): DetectedFileType {
  if (file.type === "application/x-directory" || /[\\/]$/.test(file.name)) {
    return { kind: "folder", label: "Folder" };
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return extensionKinds[extension] ?? typeFromMime(file.type.toLowerCase()) ?? { kind: "unknown", label: "Unknown file" };
}

export function hasUnsupportedDetectedType(file: File) {
  return !["pdf", "image", "video", "audio", "unknown"].includes(detectFileType(file).kind);
}
