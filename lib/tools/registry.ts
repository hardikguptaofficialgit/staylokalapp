import ffmpegProcessor from "./ffmpeg";
import imageProcessor from "./image";
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
  ["extract-audio", "Extract audio", "Save a video's audio as an MP3.", "mic", ["video/*"], []],
  ["to-gif", "Video to GIF", "Turn a video clip into a shareable GIF.", "photo", ["video/*"], []],
  ["from-gif", "GIF to video", "Convert an animated GIF to MP4.", "tv", ["image/gif"], []],
  ["frames", "Extract frames", "Export individual frames as separate downloads.", "photos", ["video/*"], []],
  ["thumbnail", "Create thumbnail", "Grab a still thumbnail from a video.", "photo", ["video/*"], []],
  ["rotate", "Rotate video", "Rotate video by a fixed angle.", "3d-rotate", ["video/*"], ["angle"]],
  ["flip", "Flip video", "Flip video horizontally or vertically.", "transfer-horizontal", ["video/*"], ["direction"]],
  ["metadata", "Remove metadata", "Strip metadata while preserving media.", "privacy", mediaAccept, []],
];

const audioTools: ToolSpec[] = [
  ["audio-trim", "Trim audio", "Keep a selected range of an audio file.", "cut", ["audio/*"], ["start", "duration"]],
  ["normalize-audio", "Normalize audio", "Balance loudness using FFmpeg loudness normalization.", "waveform", ["audio/*", "video/*"], []],
  ["metadata-audio", "Remove metadata", "Strip audio metadata while preserving the track.", "privacy", ["audio/*"], []],
  ["convert-audio", "Convert audio", "Convert an audio track to MP3.", "view-reload", ["audio/*"], ["format"]],
];

const recentToolIds = new Set([
  "image-background-remove",
  "image-upscale",
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
  "pdf-redact",
  "pdf-highlight",
  "pdf-shape",
  "pdf-remove-blank",
  "pdf-duplicate-page",
  "pdf-add-image",
  "pdf-fill-form",
  "pdf-ocr",
  "normalize-audio",
  "metadata-audio",
  "convert-audio",
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
    label: option === "start" ? "Start time" : option === "duration" ? "Duration" : option === "startSeconds" ? "Start (seconds)" : option === "durationSeconds" ? "Remove (seconds)" : option === "segmentDuration" ? "Segment length (seconds)" : option === "topText" ? "Top text" : option === "bottomText" ? "Bottom text" : option === "fontSize" ? "Font size" : option[0].toUpperCase() + option.slice(1),
    type: (["format", "direction", "angle", "speed", "position"].includes(option) ? "select" : ["quality", "width", "height", "fps", "fontSize", "opacity", "pageNumber", "x", "y"].includes(option) ? "number" : option === "removeMetadata" ? "checkbox" : "text") as "text" | "number" | "select" | "checkbox",
    defaultValue: option === "quality" ? 28 : option === "speed" ? "1" : option === "angle" ? "90" : option === "direction" ? "hflip" : option === "format" ? (category === "Image" ? "image/jpeg" : category === "Audio" ? "mp3" : "mp4") : option === "width" ? (id === "pdf-redact" ? 20 : id === "image-thumbnail" ? 320 : id === "image-crop" ? 800 : 1280) : option === "height" ? (id === "pdf-redact" ? 20 : 600) : option === "x" || option === "y" ? 0 : option === "fps" ? 30 : option === "fontSize" ? (id === "image-watermark" || id === "image-meme" ? 36 : 12) : option === "opacity" ? 0.6 : option === "position" ? "bottom-right" : option === "pageNumber" ? 1 : option === "startSeconds" ? 0 : option === "durationSeconds" || option === "segmentDuration" ? 10 : option === "removeMetadata" ? false : undefined,
    min: ["quality", "width", "height", "fps", "fontSize", "opacity", "pageNumber", "x", "y", "startSeconds", "durationSeconds", "segmentDuration"].includes(option) ? (option === "quality" ? 18 : option === "width" && !["pdf-redact", "pdf-highlight", "pdf-shape"].includes(id) ? 160 : option === "fontSize" ? 8 : option === "pageNumber" ? 1 : 0) : undefined,
    max: option === "quality" ? 40 : option === "width" && id !== "pdf-redact" ? 7680 : ["height", "x", "y", "width"].includes(option) && id === "pdf-redact" ? 100 : option === "fps" ? 120 : option === "fontSize" ? 96 : option === "opacity" ? 1 : undefined,
    step: option === "quality" || option === "fps" ? 1 : undefined,
    placeholder: option === "start" || option === "duration" ? "00:00:00" : undefined,
    options: option === "angle"
      ? [{ label: "90° clockwise", value: "90" }, { label: "180°", value: "180" }, { label: "270° clockwise", value: "270" }]
      : option === "speed"
        ? [{ label: "0.5× slower", value: "0.5" }, { label: "0.75×", value: "0.75" }, { label: "Normal", value: "1" }, { label: "1.5× faster", value: "1.5" }, { label: "2× faster", value: "2" }]
        : option === "format"
      ? category === "Image"
        ? [{ label: "JPEG", value: "image/jpeg" }, { label: "PNG", value: "image/png" }, { label: "WebP", value: "image/webp" }]
        : category === "Audio"
          ? [{ label: "MP3", value: "mp3" }, { label: "WAV", value: "wav" }]
          : [{ label: "MP4", value: "mp4" }, { label: "WebM", value: "webm" }, { label: "MOV", value: "mov" }]
      : option === "direction" ? [{ label: "Horizontal", value: "hflip" }, { label: "Vertical", value: "vflip" }]
      : option === "position" ? [{ label: "Top left", value: "top-left" }, { label: "Top right", value: "top-right" }, { label: "Bottom left", value: "bottom-left" }, { label: "Bottom right", value: "bottom-right" }, { label: "Center", value: "center" }] : undefined,
  }));
  return { id, category, name, description, icon, accept, batch: kind === "image" || id === "merge" || id === "pdf-merge" || id === "pdf-rotate" || id === "pdf-image-to-pdf", options, kind, available: true, isNew: recentToolIds.has(id) };
}

export const tools: ToolDescriptor[] = [
  descriptor("image-process", "Resize & compress", "Resize and re-encode an image locally.", "image", "Image", ["image/*"], ["width", "quality", "format"], "image"),
  descriptor("image-crop", "Crop image", "Crop to a centered rectangle locally.", "image", "Image", ["image/*"], ["width", "height", "format"], "image"),
  descriptor("image-rotate", "Rotate image", "Rotate an image locally.", "rotate", "Image", ["image/*"], ["angle"], "image"),
  descriptor("image-flip", "Flip image", "Flip an image horizontally or vertically locally.", "transfer-horizontal", "Image", ["image/*"], [], "image"),
  descriptor("image-thumbnail", "Create thumbnail", "Create a smaller thumbnail image locally.", "photo", "Image", ["image/*"], ["width", "format"], "image"),
  descriptor("image-gif", "Create animated GIF", "Turn multiple local images into an animated GIF.", "photo", "Image", ["image/*"], [], "image"),
  descriptor("image-background-remove", "Remove background", "Cut out the foreground locally with an in-browser segmentation model.", "scissors", "Image", ["image/*"], [], "image"),
  descriptor("image-convert", "Convert image", "Convert images between JPEG, PNG, and WebP locally.", "view-reload", "Image", ["image/*"], ["format"], "image"),
  descriptor("image-upscale", "Upscale image", "Enlarge an image locally with a 2× ESRGAN super-resolution model.", "expand", "Image", ["image/*"], [], "image"),
  descriptor("image-watermark", "Watermark image", "Place local text over an image with adjustable opacity and position.", "text-aa", "Image", ["image/*"], ["text", "fontSize", "opacity", "position", "format"], "image"),
  descriptor("image-meme", "Meme generator", "Add classic top and bottom captions to an image locally.", "text-aa", "Image", ["image/*"], ["topText", "bottomText", "fontSize", "format"], "image"),
  descriptor("ppt-text", "Extract PPT text", "Extract text from legacy PowerPoint files locally.", "text-aa", "Other", ["application/vnd.ms-powerpoint"], [], "document"),
  descriptor("pptx-text", "Extract PPTX text", "Extract slide text from a PowerPoint file locally.", "text-aa", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-pdf", "PPTX → PDF", "Render PowerPoint slides into a local PDF copy.", "pdf", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-png", "PPTX → PNG", "Export PowerPoint slides as local PNG images.", "image", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("pptx-jpg", "PPTX → JPG", "Export PowerPoint slides as local JPG images.", "image", "Other", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], [], "document"),
  descriptor("docx-text", "Extract document text", "Extract readable text from DOC or DOCX files locally.", "text-aa", "Other", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"], [], "document"),
  descriptor("txt-preview", "Preview text file", "Read and download a text file locally.", "text-aa", "Other", ["text/plain"], [], "document"),
  descriptor("spreadsheet-preview", "Preview spreadsheet", "Inspect workbook sheets and cell values locally.", "table", "Other", ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], [], "document"),
  descriptor("spreadsheet-csv", "Export CSV", "Export a selected worksheet as CSV locally.", "table", "Other", ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], [], "document"),
  descriptor("archive-list", "Inspect ZIP", "List ZIP contents locally.", "archive", "Other", ["application/zip"], [], "document"),
  descriptor("archive-extract", "Extract ZIP file", "Extract one file from a ZIP archive locally.", "archive", "Other", ["application/zip"], [], "document"),
  descriptor("pdf-merge", "Merge PDFs", "Combine PDFs into one document.", "pdf", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-rotate", "Rotate PDFs", "Rotate every page in a PDF.", "rotate", "PDF", ["application/pdf"], ["angle"], "pdf"),
  descriptor("pdf-split", "Split PDF", "Export each page as a separate PDF.", "grid", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-extract", "Extract selected pages", "Export selected pages as a new PDF.", "grid", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-delete-pages", "Delete pages", "Remove selected pages from a PDF.", "cut", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-reorder", "Reorder pages", "Arrange PDF pages in a new order.", "transfer-horizontal", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-image-to-pdf", "JPG/PNG → PDF", "Combine JPG or PNG images into a PDF.", "image", "PDF", ["image/jpeg", "image/png"], [], "pdf"),
  descriptor("pdf-metadata", "PDF metadata viewer/remover", "Inspect or remove PDF document metadata.", "privacy", "PDF", ["application/pdf"], ["removeMetadata"], "pdf"),
  descriptor("pdf-to-jpg", "PDF → JPG", "Render each PDF page as a JPG image locally.", "image", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-to-png", "PDF → PNG", "Render each PDF page as a PNG image locally.", "image", "PDF", ["application/pdf"], [], "pdf"),
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
  descriptor("pdf-fill-form", "Fill PDF form", "Fill editable PDF text fields locally.", "textbox", "PDF", ["application/pdf"], [], "pdf"),
  descriptor("pdf-ocr", "OCR searchable PDF", "Extract text and create a searchable PDF locally.", "scan", "PDF", ["application/pdf"], [], "pdf"),
  ...videoTools
    .filter(([id]) => ["trim", "cut", "speed", "frames"].includes(id))
    .map(([id, name, description, icon, accept, optionIds]) => descriptor(id, name, description, icon, "Video", accept, optionIds, "ffmpeg")),
  ...audioTools
    .filter(([id]) => ["audio-trim", "normalize-audio", "metadata-audio", "convert-audio"].includes(id))
    .map(([id, name, description, icon, accept, optionIds]) => descriptor(id, name, description, icon, "Audio", accept, optionIds, "ffmpeg")),
];

export const deferredToolIds = [
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
] as const;

export const processors: Record<ToolDescriptor["kind"], ToolProcessor> = {
  image: imageProcessor,
  pdf: pdfProcessor,
  ffmpeg: ffmpegProcessor,
  document: documentProcessor,
};

export function getTool(id: string) {
  return tools.find((tool) => tool.id === id);
}
