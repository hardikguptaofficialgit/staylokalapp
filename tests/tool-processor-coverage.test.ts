import { describe, expect, it } from "vitest";
import { mediaArgs, mediaOutput } from "../lib/tools/ffmpeg-commands";
import { resolvePdfRasterExportFormat } from "../lib/tools/image-formats";
import { tools } from "../lib/tools/registry";

const PDF_PROCESSOR_IDS = new Set([
  "pdf-page-size",
  "pdf-crop",
  "pdf-contact-sheet",
  "pdf-flatten",
  "pdf-redact",
  "pdf-remove-blank",
  "pdf-duplicate-page",
  "pdf-add-image",
  "pdf-sign",
  "pdf-fill-form",
  "pdf-privacy",
  "pdf-watermark",
  "pdf-page-numbers",
  "pdf-add-text",
  "pdf-header-footer",
  "pdf-highlight",
  "pdf-shape",
  "pdf-ocr",
  "pdf-compress",
  "pdf-image-to-pdf",
  "pdf-metadata",
  "pdf-extract",
  "pdf-delete-pages",
  "pdf-reorder",
  "pdf-split",
  "pdf-merge",
  "pdf-rotate",
  "pdf-to-image",
]);

const IMAGE_PROCESSOR_IDS = new Set([
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

const DOCUMENT_PROCESSOR_IDS = new Set([
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

describe("all exposed tools have processor paths", () => {
  it("covers every registry tool id", () => {
    expect(tools).toHaveLength(85);
    for (const tool of tools) {
      if (tool.kind === "pdf") {
        expect(PDF_PROCESSOR_IDS.has(tool.id), tool.id).toBe(true);
        if (tool.id === "pdf-to-image") {
          expect(resolvePdfRasterExportFormat(tool.id, { format: "image/png" })).toBe("image/png");
        }
      } else if (tool.kind === "image") {
        expect(IMAGE_PROCESSOR_IDS.has(tool.id), tool.id).toBe(true);
      } else if (tool.kind === "document") {
        expect(DOCUMENT_PROCESSOR_IDS.has(tool.id), tool.id).toBe(true);
      } else if (tool.kind === "ffmpeg") {
        const options = Object.fromEntries(
          tool.options.map((option) => [option.id, option.defaultValue ?? option.options?.[0]?.value ?? ""]),
        );
        const input = tool.id === "from-gif"
          ? "fixture.gif"
          : tool.accept.includes("audio/*") && !tool.accept.includes("video/*")
            ? "fixture.wav"
            : "fixture.mp4";
        const output = mediaOutput(tool.id, options, input);
        expect(mediaArgs(tool.id, { ...options, audioOnly: input.endsWith(".wav"), videoOnly: false }, input, output).length).toBeGreaterThan(0);
      }
    }
  });
});
