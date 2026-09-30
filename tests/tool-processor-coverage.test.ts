import { describe, expect, it } from "vitest";
import { mediaArgs, mediaOutput } from "../lib/tools/ffmpeg-commands";
import { resolvePdfRasterExportFormat } from "../lib/tools/image-formats";
import { tools } from "../lib/tools/registry";

const IMAGE_OPS = new Set([
  "image-process",
  "image-crop",
  "image-rotate",
  "image-flip",
  "image-thumbnail",
  "image-gif",
  "image-background-remove",
  "image-convert",
  "image-upscale",
  "image-watermark",
  "image-meme",
  "image-contact-sheet",
]);

const PDF_OPS = new Set([
  "pdf-merge",
  "pdf-rotate",
  "pdf-split",
  "pdf-extract",
  "pdf-delete-pages",
  "pdf-reorder",
  "pdf-image-to-pdf",
  "pdf-metadata",
  "pdf-compress",
  "pdf-to-image",
  "pdf-contact-sheet",
  "pdf-crop",
  "pdf-page-size",
  "pdf-watermark",
  "pdf-page-numbers",
  "pdf-add-text",
  "pdf-header-footer",
  "pdf-flatten",
  "pdf-privacy",
  "pdf-redact",
  "pdf-highlight",
  "pdf-shape",
  "pdf-remove-blank",
  "pdf-duplicate-page",
  "pdf-add-image",
  "pdf-sign",
  "pdf-fill-form",
  "pdf-ocr",
]);

const DOCUMENT_OPS = new Set([
  "ppt-text",
  "pptx-text",
  "pptx-pdf",
  "pptx-png",
  "pptx-jpg",
  "docx-text",
  "txt-preview",
  "json-format",
  "base64-encode",
  "base64-decode",
  "file-hash",
  "spreadsheet-preview",
  "spreadsheet-csv",
  "archive-list",
  "archive-extract",
  "archive-create",
]);

function ffmpegArgsFor(operation: string) {
  const tool = tools.find((item) => item.id === operation)!;
  const options = Object.fromEntries(tool.options.map((option) => [option.id, option.defaultValue ?? option.options?.[0]?.value ?? ""]));
  const input = operation === "from-gif"
    ? "fixture.gif"
    : tool.accept.includes("audio/*") && !tool.accept.includes("video/*")
      ? "fixture.wav"
      : "fixture.mp4";
  const extension = input.split(".").pop() ?? "mp4";
  const audioOnly = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "oga"].includes(extension);
  const output = mediaOutput(operation, options, input);
  return mediaArgs(operation, { ...options, audioOnly, videoOnly: false }, input, output);
}

describe("all exposed tools have processor paths", () => {
  it("covers exactly 85 registry tools", () => {
    expect(tools).toHaveLength(85);
  });

  it("maps every tool id to a known processor operation", () => {
    const missing: string[] = [];
    for (const tool of tools) {
      if (tool.kind === "image") {
        if (!IMAGE_OPS.has(tool.id)) missing.push(tool.id);
        continue;
      }
      if (tool.kind === "pdf") {
        if (PDF_OPS.has(tool.id)) continue;
        if (resolvePdfRasterExportFormat(tool.id, {})) continue;
        missing.push(tool.id);
        continue;
      }
      if (tool.kind === "document") {
        if (!DOCUMENT_OPS.has(tool.id)) missing.push(tool.id);
        continue;
      }
      if (tool.kind === "ffmpeg") {
        try {
          ffmpegArgsFor(tool.id);
        } catch {
          missing.push(tool.id);
        }
      }
    }
    expect(missing, missing.join(", ")).toEqual([]);
  });
});
