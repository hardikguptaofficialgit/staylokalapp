import { describe, expect, it } from "vitest";
import { mediaArgs, mediaOutput } from "../lib/tools/ffmpeg-commands";
import { deferredToolIds, tools } from "../lib/tools/registry";
import { matchesAcceptedFile, validateToolInput } from "../lib/tools/validation";
import { ProcessingError } from "../lib/tools/types";
import { detectFileType, hasUnsupportedDetectedType } from "../lib/tools/file-types";

const context = { onProgress: () => undefined, signal: new AbortController().signal };

describe("tool registry", () => {
  it("detects files selected from a folder by their file type", () => {
    const file = new File(["image"], "banner.png", { type: "image/png" });
    Object.defineProperty(file, "webkitRelativePath", { value: "brand-assets/banner.png" });
    expect(detectFileType(file)).toEqual({ kind: "image", label: "PNG image" });
  });

  it("detects native browser image formats", () => {
    expect(detectFileType(new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" }))).toEqual({ kind: "image", label: "SVG image" });
    expect(detectFileType(new File(["bmp"], "photo.bmp", { type: "" }))).toEqual({ kind: "image", label: "BMP image" });
    expect(detectFileType(new File(["avif"], "photo.avif", { type: "image/avif" }))).toEqual({ kind: "image", label: "AVIF image" });
    expect(matchesAcceptedFile(new File(["avif"], "photo.avif", { type: "" }), ["image/*"])).toBe(true);
  });

  it("matches legacy DOC files by MIME type and extension", () => {
    expect(matchesAcceptedFile(new File(["doc"], "letter.doc", { type: "application/msword" }), ["application/msword"])).toBe(true);
    expect(matchesAcceptedFile(new File(["doc"], "letter.doc", { type: "" }), ["application/msword"])).toBe(true);
  });

  it("exposes the full local media and document tool registry", () => {
    expect(tools.map((tool) => tool.id)).toEqual([
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
      "pdf-fill-form",
      "pdf-ocr",
      "trim",
      "cut",
      "split",
      "compress",
      "convert",
      "resize",
      "fps",
      "speed",
      "mute",
      "extract-audio",
      "to-gif",
      "from-gif",
      "frames",
      "thumbnail",
      "rotate",
      "flip",
      "metadata",
      "reverse",
      "loop",
      "crop-video",
      "video-caption",
      "audio-trim",
      "normalize-audio",
      "metadata-audio",
      "convert-audio",
      "audio-speed",
      "audio-fade",
      "audio-volume",
      "audio-reverse",
    ]);
    expect(deferredToolIds).toEqual([]);
    expect(tools).toHaveLength(84);
  });

  it("treats office, archive, and text files as supported types", () => {
    expect(hasUnsupportedDetectedType(new File(["doc"], "letter.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).toBe(false);
    expect(hasUnsupportedDetectedType(new File(["#"], "notes.md", { type: "text/markdown" }))).toBe(false);
    expect(hasUnsupportedDetectedType(new File(["x"], "mystery.bin", { type: "application/octet-stream" }))).toBe(true);
  });

  it("registers every processor with a usable descriptor", () => {
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.id).toBeTruthy();
      expect(tool.accept.length).toBeGreaterThan(0);
      expect(tool.available).toBe(true);
      expect(tool.kind).toMatch(/image|pdf|ffmpeg|document/);
    }
  });

  it("marks recently added tools as new without marking the original tools", () => {
    expect(tools.find((tool) => tool.id === "image-background-remove")?.isNew).toBe(true);
    expect(tools.find((tool) => tool.id === "docx-text")?.isNew).toBe(true);
    expect(tools.find((tool) => tool.id === "image-process")?.isNew).toBe(false);
  });
});

describe("file validation", () => {
  it("matches extensions when browsers provide an empty MIME type", () => {
    expect(matchesAcceptedFile(new File(["image"], "photo.jpeg", { type: "" }), ["image/*"])).toBe(true);
    expect(matchesAcceptedFile(new File(["pdf"], "document.pdf", { type: "" }), ["application/pdf"])).toBe(true);
    expect(matchesAcceptedFile(new File(["data"], "unknown.bin", { type: "" }), ["image/*"])).toBe(false);
    expect(matchesAcceptedFile(new File(["image"], "photo.webp", { type: "image/webp" }), ["image/jpeg", "image/png"])).toBe(false);
  });

  it("rejects empty files and oversized values before processing", () => {
    const tool = tools.find((item) => item.id === "image-process")!;
    expect(() => validateToolInput([new File([], "empty.jpg", { type: "image/jpeg" })], tool, { width: 1280, quality: 28, format: "image/jpeg" })).toThrow(ProcessingError);
  });

  it("requires at least two images for animated GIF export", () => {
    const tool = tools.find((item) => item.id === "image-gif")!;
    const image = new File(["png"], "frame.png", { type: "image/png" });
    expect(() => validateToolInput([image], tool, { operation: "image-gif" })).toThrow(ProcessingError);
    expect(() => validateToolInput([image, image], tool, { operation: "image-gif" })).not.toThrow();
  });
});

describe("FFmpeg command coverage", () => {
  const operations = tools.filter((tool) => tool.kind === "ffmpeg").map((tool) => tool.id);
  it.each(operations)("builds a command for %s", (operation) => {
    const tool = tools.find((item) => item.id === operation)!;
    const options = Object.fromEntries(tool.options.map((option) => [option.id, option.defaultValue ?? option.options?.[0]?.value ?? ""]));
    const output = mediaOutput(operation, options, "fixture.mp4");
    const args = operation === "merge"
      ? ["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", output.pattern]
      : mediaArgs(operation, options, "fixture.mp4", output);
    expect(args.length).toBeGreaterThan(0);
    expect(output.pattern).toBeTruthy();
  });

  it("keeps cut and split semantics distinct from trim", () => {
    const trim = mediaArgs("trim", { start: "00:00:01", duration: "00:00:02" }, "fixture.mp4", mediaOutput("trim", {}, "fixture.mp4"));
    const cut = mediaArgs("cut", { startSeconds: 1, durationSeconds: 2 }, "fixture.mp4", mediaOutput("cut", {}, "fixture.mp4"));
    const split = mediaArgs("split", { segmentDuration: 10 }, "fixture.mp4", mediaOutput("split", {}, "fixture.mp4"));
    expect(cut).not.toEqual(trim);
    expect(split).toContain("-f");
    expect(mediaOutput("frames", {}, "fixture.mp4").multiple).toBe(true);
  });

  it("maps common containers to matching codecs", () => {
    const output = mediaOutput("convert", { format: "webm" }, "fixture.mp4");
    expect(mediaArgs("convert", { format: "webm" }, "fixture.mp4", output)).toContain("libvpx-vp9");
    expect(mediaOutput("from-gif", {}, "fixture.gif").mime).toBe("video/mp4");
  });
});

void context;
