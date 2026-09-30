import { describe, expect, it } from "vitest";
import { processors, tools } from "../lib/tools/registry";

const pdfAdvancedTools = new Set([
  "pdf-to-image",
  "pdf-contact-sheet",
  "pdf-crop",
  "pdf-page-size",
  "pdf-ocr",
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
  "pdf-compress",
]);

const pdfVisualEditorTools = new Set([
  "pdf-merge",
  "pdf-rotate",
  "pdf-split",
  "pdf-extract",
  "pdf-delete-pages",
  "pdf-reorder",
]);

describe("exposed tool wiring", () => {
  it("maps every exposed tool to a processor kind", () => {
    for (const tool of tools) {
      expect(processors[tool.kind]).toBeTypeOf("function");
    }
  });

  it("keeps PDF tools on the visual or advanced editor paths", () => {
    for (const tool of tools.filter((item) => item.kind === "pdf")) {
      const routed = pdfAdvancedTools.has(tool.id)
        || pdfVisualEditorTools.has(tool.id)
        || tool.id === "pdf-fill-form"
        || tool.id === "pdf-add-image"
        || tool.id === "pdf-sign"
        || tool.id === "pdf-image-to-pdf"
        || tool.id === "pdf-metadata";
      expect(routed, tool.id).toBe(true);
    }
  });

  it("uses document routing for presentation, spreadsheet, and archive tools", () => {
    const documentIds = tools.filter((tool) => tool.kind === "document").map((tool) => tool.id);
    expect(documentIds).toEqual([
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
  });
});
