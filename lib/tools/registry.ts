import ffmpegProcessor from "./ffmpeg";
import imageProcessor from "./image";
import { imageFormatSelectOptions } from "./image-formats";
import pdfProcessor from "./pdf";
import documentProcessor from "./document";
import type { ToolDescriptor, ToolProcessor } from "./types";

type ToolSpec = [string, string, string, string, string[], string[]];
const mediaAccept = ["video/*", "audio/*"];
const videoTools: ToolSpec[] = [
  ["trim", "Trim video", "Keep a precise time range from a video.", "cut", ["video/*"], ["start", "duration"]],
  ["cut", "Cut out a section", "Remove a time range from a video.", "attachment", ["video/*"], ["startSeconds", "durationSeconds"]],
  ["split", "Split video", "Split a video into separately downloadable segments.", "grid", ["video/*"], ["segmentDuration"]],
  ["compress", "Compress video", "Reduce file size with adjustable quality.", "archive", ["video/*"], ["quality"]],
  ["convert", "Convert format", "Convert video to MP4, WebM, or MOV.", "view-reload", ["video/*"], ["format"]],
  ["resize", "Change resolution", "Resize video while preserving aspect ratio.", "expand", ["video/*"], ["width"]],
  ["fps", "Change FPS", "Set a new playback frame rate.", "tv", ["video/*"], ["fps"]],
  ["speed", "Change speed", "Make video faster or slower.", "timer", ["video/*"], ["speed"]],
  ["mute", "Mute video", "Remove the audio stream from a video.", "mic-off", ["video/*"], []],
  ["extract-audio", "Extract audio", "Save a video's audio track as MP3 or WAV.", "mic", ["video/*"], ["format"]],
  ["to-gif", "Video to GIF", "Turn a video clip into a shareable GIF.", "photo", ["video/*"], []],
  ["from-gif", "GIF to video", "Convert an animated GIF to MP4.", "tv", ["image/gif"], []],
  ["frames", "Extract frames", "Export individual frames as separate downloads.", "photos", ["video/*"], []],
  ["thumbnail", "Create thumbnail", "Grab a still thumbnail from a video.", "photo", ["video/*"], []],
  ["rotate", "Rotate video", "Rotate video by a fixed angle.", "3d-rotate", ["video/*"], ["angle"]],
  ["flip", "Flip video", "Flip video horizontally or vertically.", "transfer-horizontal", ["video/*"], ["direction"]],
  ["metadata", "Remove metadata", "Strip metadata while preserving media.", "privacy", mediaAccept, []],
  ["reverse", "Reverse video", "Play a clip backwards with synchronized audio.", "arrow-u-down-left", ["video/*"], []],
  ["loop", "Loop video", "Repeat the same clip end-to-end.", "repeat", ["video/*"], ["loopCount"]],
  ["crop-video", "Crop video", "Crop to an exact pixel region.", "crop", ["video/*"], ["x", "y", "width", "height"]],
  ["video-caption", "Add caption", "Burn a short text caption into the video.", "text-aa", ["video/*"], ["text", "fontSize"]],
];

const audioTools: ToolSpec[] = [
  ["audio-trim", "Trim audio", "Keep a selected range of an audio file.", "cut", ["audio/*"], ["start", "duration"]],
  ["normalize-audio", "Normalize audio", "Balance loudness using FFmpeg loudness normalization.", "waveform", ["audio/*", "video/*"], []],
  ["metadata-audio", "Remove metadata", "Strip audio metadata while preserving the track.", "privacy", ["audio/*"], []],
  ["convert-audio", "Convert audio", "Convert an audio track to MP3 or WAV.", "view-reload", ["audio/*"], ["format"]],
  ["audio-speed", "Change speed", "Speed up or slow down audio while keeping pitch natural.", "timer", ["audio/*"], ["speed"]],
  ["audio-fade", "Fade in & out", "Add smooth fade-in and fade-out.", "waveform", ["audio/*"], ["fadeIn", "fadeOut"]],
  ["audio-volume", "Adjust volume", "Boost or reduce loudness in decibels.", "speaker-high", ["audio/*"], ["gainDb"]],
  ["audio-reverse", "Reverse audio", "Play the track backwards.", "arrow-u-down-left", ["audio/*"], []],
];

const orderMattersToolIds = new Set([
  "pdf-image-to-pdf",
  "pdf-merge",
  "image-gif",
  "image-contact-sheet",
  "archive-create",
]);

const recentToolIds = new Set([
  "image-background-remove",
  "image-upscale",
  "image-contact-sheet",
  "ppt-text",
  "pptx-text",
  "pptx-pdf",
  "pptx-png",
  "pptx-jpg",
  "docx-text",
  "spreadsheet-preview",
  "spreadsheet-csv",
  "archive-list",
  "archive-extract",
  "archive-create",
  "json-format",
  "base64-encode",
  "base64-decode",
  "file-hash",
  "pdf-redact",
  "pdf-highlight",
  "pdf-shape",
  "pdf-remove-blank",
  "pdf-duplicate-page",
  "pdf-add-image",
  "pdf-sign",
  "pdf-fill-form",
  "pdf-ocr",
  "pdf-contact-sheet",
  "pdf-crop",
  "pdf-page-size",
  "normalize-audio",
  "metadata-audio",
  "convert-audio",
  "split",
  "compress",
  "convert",
  "resize",
  "fps",
  "mute",
  "extract-audio",
  "to-gif",
  "from-gif",
  "thumbnail",
  "rotate",
  "flip",
  "metadata",
  "reverse",
  "loop",
  "crop-video",
  "video-caption",
  "audio-speed",
  "audio-fade",
  "audio-volume",
  "audio-reverse",
]);

function descriptor(
  id: string,
  name: string,
  description: string,
  icon: string,
  category: ToolDescriptor["category"],
  accept: string[],
  optionIds: string[],
  kind: ToolDescriptor["kind"],
): ToolDescriptor {
  const options = optionIds.map((option) => ({
    id: option,
    label: option === "start" ? "Start time" : option === "duration" ? "Duration" : option === "startSeconds" ? "Start (seconds)" : option === "durationSeconds" ? "Remove (seconds)" : option === "segmentDuration" ? "Segment length (seconds)" : option === "fadeIn" ? "Fade in (seconds)" : option === "fadeOut" ? "Fade out (seconds)" : option === "gainDb" ? "Gain (dB)" : option === "loopCount" ? "Loop count" : option === "topText" ? "Top text" : option === "bottomText" ? "Bottom text" : option === "fontSize" ? "Font size" : option === "archiveName" ? "ZIP file name" : option === "mode" ? "Output style" : option === "algorithm" ? "Algorithm" : option === "compressProfile" ? "Compression strength" : option === "removeMetadata" ? "Remove metadata before compressing" : option[0].toUpperCase() + option.slice(1),
    type: (["format", "direction", "angle", "speed", "position", "mode", "algorithm", "compressProfile"].includes(option) ? "select" : ["quality", "width", "height", "fps", "fontSize", "opacity", "pageNumber", "x", "y"].includes(option) ? "number" : option === "removeMetadata" ? "checkbox" : "text") as "text" | "number" | "select" | "checkbox",
    defaultValue: option === "quality" ? 28 : option === "speed" ? "1" : option === "angle" ? "90" : option === "direction" ? "hflip" : option === "mode" ? "prettify" : option === "algorithm" ? "sha256" : option === "compressProfile" ? "balanced" : option === "archiveName" ? "archive.zip" : option === "format" ? (id === "pdf-to-image" ? "image/png" : id === "extract-audio" ? "mp3" : category === "Image" ? "image/jpeg" : category === "Audio" ? "mp3" : "mp4") : option === "width" ? (id === "pdf-redact" ? 20 : id === "image-thumbnail" ? 320 : id === "image-crop" ? 800 : id === "crop-video" ? 1280 : 1280) : option === "height" ? (id === "pdf-redact" ? 20 : id === "crop-video" ? 720 : 600) : option === "x" || option === "y" ? 0 : option === "fps" ? 30 : option === "fontSize" ? (id === "image-watermark" || id === "image-meme" || id === "video-caption" ? 36 : 12) : option === "opacity" ? 0.6 : option === "position" ? "bottom-right" : option === "pageNumber" ? 1 : option === "startSeconds" ? 0 : option === "durationSeconds" || option === "segmentDuration" ? 10 : option === "fadeIn" || option === "fadeOut" ? 2 : option === "gainDb" ? 0 : option === "loopCount" ? 2 : option === "removeMetadata" ? false : undefined,
    min: ["quality", "width", "height", "fps", "fontSize", "opacity", "pageNumber", "x", "y", "startSeconds", "durationSeconds", "segmentDuration", "fadeIn", "fadeOut", "gainDb", "loopCount"].includes(option) ? (option === "quality" ? 18 : option === "width" && !["pdf-redact", "pdf-highlight", "pdf-shape"].includes(id) ? 160 : option === "fontSize" ? 8 : option === "pageNumber" ? 1 : option === "gainDb" ? -40 : option === "loopCount" ? 2 : 0) : undefined,
    max: option === "quality" ? 40 : option === "width" && id !== "pdf-redact" ? 7680 : ["height", "x", "y", "width"].includes(option) && id === "pdf-redact" ? 100 : option === "fps" ? 120 : option === "fontSize" ? 96 : option === "opacity" ? 1 : option === "gainDb" ? 40 : option === "loopCount" ? 20 : undefined,
    step: option === "quality" || option === "fps" ? 1 : undefined,
    placeholder: option === "start" || option === "duration" ? "00:00:00" : undefined,
    options: option === "angle"
      ? [{ label: "90° clockwise", value: "90" }, { label: "180°", value: "180" }, { label: "270° clockwise", value: "270" }]
      : option === "speed"
        ? [{ label: "0.5× slower", value: "0.5" }, { label: "0.75×", value: "0.75" }, { label: "Normal", value: "1" }, { label: "1.5× faster", value: "1.5" }, { label: "2× faster", value: "2" }]
        : option === "format"
      ? category === "Image" || id === "pdf-to-image"
        ? imageFormatSelectOptions()
        : category === "Audio" || id === "extract-audio"
          ? [{ label: "MP3", value: "mp3" }, { label: "WAV", value: "wav" }]
          : [{ label: "MP4", value: "mp4" }, { label: "WebM", value: "webm" }, { label: "MOV", value: "mov" }]
      : option === "direction" ? [{ label: "Horizontal", value: "hflip" }, { label: "Vertical", value: "vflip" }]
      : option === "position" ? [{ label: "Top left", value: "top-left" }, { label: "Top right", value: "top-right" }, { label: "Bottom left", value: "bottom-left" }, { label: "Bottom right", value: "bottom-right" }, { label: "Center", value: "center" }]
        : option === "mode" ? [{ label: "Prettify", value: "prettify" }, { label: "Minify", value: "minify" }]
          : option === "algorithm" ? [{ label: "SHA-256", value: "sha256" }, { label: "SHA-1", value: "sha1" }]
            : option === "compressProfile" ? [{ label: "Balanced (faster)", value: "balanced" }, { label: "Maximum (multi-pass)", value: "maximum" }] : undefined,
  }));
  return {
    id,
    category,
    name,
    description,
    icon,
    accept,
    batch: kind === "image" || id === "archive-create" || id === "merge" || id === "pdf-merge" || id === "pdf-rotate" || id === "pdf-image-to-pdf",
    orderMatters: orderMattersToolIds.has(id),
    options,
    kind,
    available: true,
    isNew: recentToolIds.has(id),
  };
}

const archiveCreateAccept = [
  "application/pdf",
  "image/*",
  "video/*",
  "audio/*",
  "text/*",
  "text/plain",
  "application/json",
  "application/xml",
  "text/xml",
  "application/zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const tools: ToolDescriptor[] = [
  descriptor("image-process", "Resize & compress", "Resize and re-encode an image locally.", "image", "Image", ["image/*"], ["width", "quality", "format"], "image"),
  descriptor("image-crop", "Crop image", "Crop to a centered rectangle locally.", "image", "Image", ["image/*"], ["width", "height", "format"], "image"),
  descriptor("image-rotate", "Rotate image", "Rotate an image locally.", "rotate", "Image", ["image/*"], ["angle"], "image"),
  descriptor("image-flip", "Flip image", "Flip an image horizontally or vertically locally.", "transfer-horizontal", "Image", ["image/*"], [], "image"),
  descriptor("image-thumbnail", "Create thumbnail", "Create a smaller thumbnail image locally.", "photo", "Image", ["image/*"], ["width", "format"], "image"),
  descriptor("image-gif", "Create animated GIF", "Turn multiple local images into an animated GIF.", "photo", "Image", ["image/*"], [], "image"),
  descriptor("image-background-remove", "Remove background", "Cut out the foreground locally with an in-browser segmentation model.", "scissors", "Image", ["image/*"], [], "image"),
  descriptor("image-convert", "Convert image", "Convert images between common raster formats (JPEG, PNG, WebP, GIF, BMP, AVIF, ICO, TIFF) locally.", "view-reload", "Image", ["image/*"], ["format"], "image"),
  descriptor("image-upscale", "Upscale image", "Enlarge an image locally with a 2× ESRGAN super-resolution model.", "expand", "Image", ["image/*"], [], "image"),
  descriptor("image-watermark", "Watermark image", "Place local text over an image with adjustable opacity and position.", "text-aa", "Image", ["image/*"], ["text", "fontSize", "opacity", "position", "format"], "image"),
  descriptor("image-meme", "Meme generator", "Add classic top and bottom captions to an image locally.", "text-aa", "Image", ["image/*"], ["topText", "bottomText", "fontSize", "format"], "image"),
  descriptor("image-contact-sheet", "Image contact sheet", "Arrange multiple images into one visual overview locally.", "grid", "Image", ["image/*"], ["format"], "image"),
  descriptor("ppt-text", "Extract PPT text", "Extract text from legacy PowerPoint files locally.", "text-aa", "Other", ["application/vnd.ms-powerpoint"], [], "document"),
  descriptor("pptx-text", "Extract PPTX text", "Extract slide text from a PowerPoint file locally.", "text-aa", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-pdf", "PPTX → PDF", "Render PowerPoint slides into a local PDF copy.", "pdf", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-png", "PPTX → PNG", "Export PowerPoint slides as local PNG images.", "image", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-jpg", "PPTX → JPG", "Export PowerPoint slides as local JPG images.", "image", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("docx-text", "Extract document text", "Extract readable text from DOC or DOCX files locally.", "text-aa", "Other", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"], [], "document"),
  descriptor("txt-preview", "Preview text file", "Read and download plain text, Markdown, CSV, JSON, logs, and similar text files locally.", "text-aa", "Other", ["text/*", "text/plain", "application/json", "application/xml", "text/xml"], [], "document"),
  descriptor("json-format", "Format JSON", "Prettify or minify a JSON file locally.", "brackets-curly", "Other", ["application/json", "text/plain", "text/*"], ["mode"], "document"),
  descriptor("base64-encode", "Encode Base64", "Encode any local file as a Base64 text file.", "binary", "Other", archiveCreateAccept, [], "document"),
  descriptor("base64-decode", "Decode Base64", "Decode a Base64 text file back into binary locally.", "binary", "Other", ["text/plain", "text/*", "application/json"], [], "document"),
  descriptor("file-hash", "File hash", "Compute a SHA-256 or SHA-1 checksum of any local file.", "fingerprint", "Other", archiveCreateAccept, ["algorithm"], "document"),
  descriptor("spreadsheet-preview", "Preview spreadsheet", "Inspect workbook sheets and cell values locally.", "table", "Other", ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], [], "document"),
  descriptor("spreadsheet-csv", "Export CSV", "Export a selected worksheet as CSV locally.", "table", "Other", ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], [], "document"),
  descriptor("archive-list", "Inspect ZIP", "List ZIP contents locally.", "archive", "Other", ["application/zip"], [], "document"),
  descriptor("archive-extract", "Extract ZIP file", "Extract one file from a ZIP archive locally.", "archive", "Other", ["application/zip"], [], "document"),
  descriptor("archive-create", "Create ZIP", "Bundle every compatible queued file into one ZIP archive locally.", "archive", "Other", archiveCreateAccept, ["archiveName"], "document"),
  descriptor("pdf-merge", "Merge PDFs", "Combine PDFs in workspace order, then fine-tune pages in the editor.", "pdf", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-rotate", "Rotate PDFs", "Rotate every page in a PDF.", "rotate", "PDF", ["application/pdf"], ["angle"], "pdf"),
  descriptor("pdf-split", "Split PDF", "Export each page as a separate PDF.", "grid", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-extract", "Extract selected pages", "Export selected pages as a new PDF.", "grid", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-delete-pages", "Delete pages", "Remove selected pages from a PDF.", "cut", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-reorder", "Reorder pages", "Arrange PDF pages in a new order.", "transfer-horizontal", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-image-to-pdf", "Images → PDF", "Combine images into one PDF in your chosen order.", "image", "PDF", ["image/*"], [], "pdf"),
  descriptor("pdf-metadata", "PDF metadata viewer/remover", "Inspect or remove PDF document metadata.", "privacy", "PDF", ["application/pdf"], ["removeMetadata"], "pdf"),
  descriptor("pdf-compress", "Compress PDF", "Multi-pass local qpdf optimization with a clear before/after size report.", "archive", "PDF", ["application/pdf"], ["compressProfile", "removeMetadata"], "pdf"),
  descriptor("pdf-to-image", "PDF → images", "Render PDF pages to JPEG, PNG, WebP, GIF, BMP, AVIF, ICO, or TIFF locally.", "image", "PDF", ["application/pdf"], ["format"], "pdf"),
  descriptor("pdf-contact-sheet", "PDF contact sheet", "Arrange every PDF page into a visual contact sheet locally.", "image", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-crop", "Crop PDF pages", "Crop every PDF page to a selected region locally.", "crop", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-page-size", "Resize PDF pages", "Fit every PDF page to A4, Letter, or its original size locally.", "resize", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-watermark", "Add watermark", "Stamp every page with local watermark text.", "text-aa", "PDF", ["application/pdf"], ["text", "fontSize"], "pdf"),
  descriptor("pdf-page-numbers", "Add page numbers", "Add page numbers to every PDF page locally.", "list-numbers", "PDF", ["application/pdf"], ["fontSize"], "pdf"),
  descriptor("pdf-add-text", "Add text", "Place text on a selected PDF page locally.", "text-aa", "PDF", ["application/pdf"], ["text", "pageNumber", "fontSize"], "pdf"),
  descriptor("pdf-header-footer", "Headers & footers", "Add header and footer text to every PDF page locally.", "text-aa", "PDF", ["application/pdf"], ["text", "fontSize"], "pdf"),
  descriptor("pdf-flatten", "Flatten PDF", "Create a non-editable rasterized PDF copy locally.", "layers", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-privacy", "PDF privacy report", "Inspect locally readable metadata and document structure.", "privacy", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-redact", "Redact a region", "Permanently black out a selected page region locally.", "prohibit", "PDF", ["application/pdf"], ["pageNumber", "x", "y", "width", "height"], "pdf"),
  descriptor("pdf-highlight", "Highlight a region", "Add a translucent highlight to a selected page region locally.", "highlighter-circle", "PDF", ["application/pdf"], ["pageNumber", "x", "y", "width", "height"], "pdf"),
  descriptor("pdf-shape", "Add rectangle", "Add a restrained rectangle annotation to a selected page region locally.", "square", "PDF", ["application/pdf"], ["pageNumber", "x", "y", "width", "height"], "pdf"),
  descriptor("pdf-remove-blank", "Remove blank pages", "Detect and remove blank PDF pages locally.", "minus-square", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-duplicate-page", "Duplicate a page", "Append a duplicate of one selected PDF page locally.", "copy", "PDF", ["application/pdf"], ["pageNumber"], "pdf"),
  descriptor("pdf-add-image", "Add image annotation", "Place a JPG or PNG image on a PDF page locally.", "image", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-sign", "Sign PDF", "Draw or upload a signature and place it on a PDF page locally.", "pen-nib", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-fill-form", "Fill PDF form", "Fill editable PDF text fields locally.", "textbox", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-ocr", "OCR searchable PDF", "Extract text and create a searchable PDF locally.", "scan", "PDF", ["application/pdf"], [], "pdf"),
  ...videoTools.map(([id, name, description, icon, accept, optionIds]) => descriptor(id, name, description, icon, "Video", accept, optionIds, "ffmpeg")),
  ...audioTools.map(([id, name, description, icon, accept, optionIds]) => descriptor(id, name, description, icon, "Audio", accept, optionIds, "ffmpeg")),
];

/** Video merge remains unexposed until browser execution is reliable. */
export const deferredToolIds = [] as const;

export const processors: Record<ToolDescriptor["kind"], ToolProcessor> = {
  image: imageProcessor,
  pdf: pdfProcessor,
  ffmpeg: ffmpegProcessor,
  document: documentProcessor,
};

export function getTool(id: string) {
  return tools.find((tool) => tool.id === id);
}
