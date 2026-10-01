import type { ToolDescriptor } from "../tools/types";
import { getTool, tools } from "../tools/registry";

const PRIVACY_TAIL = "Private, offline-friendly—files stay on your device, never uploaded.";

/** Search-oriented title leads; each tool id has a distinct phrase. */
const TITLE_LEADS: Record<string, string> = {
  "image-process": "Resize & compress images offline",
  "image-crop": "Crop images online with privacy",
  "image-rotate": "Rotate images in your browser",
  "image-flip": "Flip images locally",
  "image-thumbnail": "Create image thumbnails offline",
  "image-gif": "Make animated GIFs in browser",
  "image-background-remove": "Remove image background offline",
  "image-convert": "Convert images privately in browser",
  "image-upscale": "Upscale images with AI offline",
  "image-watermark": "Watermark images without upload",
  "image-meme": "Meme maker online, privacy-first",
  "image-contact-sheet": "Image contact sheet in browser",
  "ppt-text": "Extract PPT text offline",
  "pptx-text": "Extract PPTX text in browser",
  "pptx-pdf": "Convert PPTX to PDF offline",
  "pptx-png": "Export PPTX slides to PNG",
  "pptx-jpg": "Export PPTX slides to JPG",
  "docx-text": "Extract Word text in browser",
  "txt-preview": "Preview text files offline",
  "json-format": "Format JSON locally",
  "base64-encode": "Encode Base64 without upload",
  "base64-decode": "Decode Base64 in browser",
  "file-hash": "Hash files offline (SHA-256)",
  "spreadsheet-preview": "Preview Excel sheets in browser",
  "spreadsheet-csv": "Export spreadsheet to CSV offline",
  "archive-list": "List ZIP contents locally",
  "archive-extract": "Extract ZIP files in browser",
  "archive-create": "Create ZIP archives offline",
  "pdf-merge": "Merge PDFs offline",
  "pdf-rotate": "Rotate PDF pages in browser",
  "pdf-split": "Split PDF offline",
  "pdf-extract": "Extract PDF pages privately",
  "pdf-delete-pages": "Delete PDF pages in browser",
  "pdf-reorder": "Reorder PDF pages offline",
  "pdf-image-to-pdf": "Convert images to PDF offline",
  "pdf-metadata": "View or remove PDF metadata",
  "pdf-compress": "Compress PDF offline",
  "pdf-to-image": "Convert PDF to images in browser",
  "pdf-contact-sheet": "PDF contact sheet offline",
  "pdf-crop": "Crop PDF pages in browser",
  "pdf-page-size": "Resize PDF pages offline",
  "pdf-watermark": "Add PDF watermark privately",
  "pdf-page-numbers": "Add PDF page numbers offline",
  "pdf-add-text": "Add text to PDF in browser",
  "pdf-header-footer": "PDF headers and footers offline",
  "pdf-flatten": "Flatten PDF in browser",
  "pdf-privacy": "PDF privacy report offline",
  "pdf-redact": "Redact PDF regions in browser",
  "pdf-highlight": "Highlight PDF offline",
  "pdf-shape": "Annotate PDF rectangles privately",
  "pdf-remove-blank": "Remove blank PDF pages offline",
  "pdf-duplicate-page": "Duplicate a PDF page in browser",
  "pdf-add-image": "Add images to PDF offline",
  "pdf-sign": "Sign PDF in browser",
  "pdf-fill-form": "Fill PDF forms offline",
  "pdf-ocr": "OCR PDF to searchable text offline",
  trim: "Trim video offline in browser",
  cut: "Cut video sections privately",
  split: "Split video offline",
  compress: "Compress video in browser",
  convert: "Convert video format offline",
  resize: "Resize video in browser",
  fps: "Change video FPS offline",
  speed: "Change video speed in browser",
  mute: "Mute video offline",
  "extract-audio": "Extract audio from video in browser",
  "to-gif": "Convert video to GIF offline",
  "from-gif": "GIF to video in browser",
  frames: "Extract video frames offline",
  thumbnail: "Video thumbnail in browser",
  rotate: "Rotate video offline",
  flip: "Flip video in browser",
  metadata: "Remove video metadata offline",
  reverse: "Reverse video in browser",
  loop: "Loop video offline",
  "crop-video": "Crop video in browser",
  "video-caption": "Add video captions offline",
  "audio-trim": "Trim audio offline",
  "normalize-audio": "Normalize audio in browser",
  "metadata-audio": "Remove audio metadata offline",
  "convert-audio": "Convert audio in browser",
  "audio-speed": "Change audio speed offline",
  "audio-fade": "Fade audio in browser",
  "audio-volume": "Adjust audio volume offline",
  "audio-reverse": "Reverse audio in browser",
};

function trimDescription(text: string, max = 160): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

function titleLead(tool: ToolDescriptor): string {
  return TITLE_LEADS[tool.id] ?? `${tool.name} — private ${tool.category} tool`;
}

function descriptionBody(tool: ToolDescriptor): string {
  const lead = tool.description.replace(/\s+/g, " ").trim();
  const withPrivacy = `${lead} ${PRIVACY_TAIL}`;
  return trimDescription(withPrivacy);
}

export type ToolSeo = {
  title: string;
  description: string;
};

export function getToolSeo(toolId: string): ToolSeo | undefined {
  const tool = getTool(toolId);
  if (!tool) return undefined;
  return {
    title: `${titleLead(tool)} · StayLokal`,
    description: descriptionBody(tool),
  };
}

export function getAllToolSeo(): Array<{ id: string; seo: ToolSeo }> {
  return tools.map((tool) => ({ id: tool.id, seo: { title: `${titleLead(tool)} · StayLokal`, description: descriptionBody(tool) } }));
}

export function assertToolSeoCoverage(): void {
  for (const tool of tools) {
    if (!TITLE_LEADS[tool.id]) {
      throw new Error(`Missing SEO title lead for tool: ${tool.id}`);
    }
    const description = descriptionBody(tool);
    if (description.length > 160) {
      throw new Error(`SEO description too long for ${tool.id}: ${description.length}`);
    }
  }
}
