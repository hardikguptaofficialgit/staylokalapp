import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import documentProcessor from "../lib/tools/document";
import { ProcessingError } from "../lib/tools/types";

const context = { onProgress: () => undefined, signal: new AbortController().signal };

describe("document processor", () => {
  it("extracts DOCX paragraphs in order", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Hello &amp; goodbye</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p></w:body></w:document>");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const file = new File([buffer], "notes.docx");
    const [result] = await documentProcessor([file], { operation: "docx-text" }, context);
    await expect(result.blob.text()).resolves.toBe("Hello & goodbye\n\nSecond");
    expect(result.name).toBe("notes-text.txt");
  });

  it("rejects malformed DOCX files", async () => {
    const file = new File(["not a zip"], "broken.docx");
    await expect(documentProcessor([file], { operation: "docx-text" }, context)).rejects.toMatchObject({
      name: "ProcessingError",
      code: "invalid",
    } satisfies Partial<ProcessingError>);
  });

  it("reads TXT files locally", async () => {
    const file = new File(["local text"], "readme.txt", { type: "text/plain" });
    const [result] = await documentProcessor([file], { operation: "txt-preview" }, context);
    await expect(result.blob.text()).resolves.toBe("local text");
    expect(result.name).toBe("readme-text.txt");
  });

  it("honors cancellation before reading", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File(["local text"], "readme.txt");
    await expect(documentProcessor([file], { operation: "txt-preview" }, { ...context, signal: controller.signal })).rejects.toMatchObject({
      code: "cancelled",
    });
  });

  it("extracts legacy DOC text locally", async () => {
    const file = new File([readFileSync(resolve(process.cwd(), "tests/fixtures/legacy-word.doc"))], "legacy-word.doc");
    const [result] = await documentProcessor([file], { operation: "docx-text" }, context);
    const text = await result.blob.text();
    expect(text.length).toBeGreaterThan(0);
    expect(result.name).toBe("legacy-word-text.txt");
  });

  it("rejects malformed legacy DOC files", async () => {
    const file = new File(["not an OLE document"], "broken.doc");
    await expect(documentProcessor([file], { operation: "docx-text" }, context)).rejects.toMatchObject({
      name: "ProcessingError",
      code: "invalid",
    } satisfies Partial<ProcessingError>);
  });

  it("honors cancellation before parsing legacy DOC files", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = new File(["not an OLE document"], "broken.doc");
    await expect(documentProcessor([file], { operation: "docx-text" }, { ...context, signal: controller.signal })).rejects.toMatchObject({
      code: "cancelled",
    });
  });
});
