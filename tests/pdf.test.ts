import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import pdfProcessor from "../lib/tools/pdf";

const context = { onProgress: () => undefined, signal: new AbortController().signal };

async function fixture() {
  const document = await PDFDocument.create();
  document.addPage([320, 240]);
  document.addPage([320, 240]);
  return new File([Uint8Array.from(await document.save())], "fixture.pdf", { type: "application/pdf" });
}

function pngFixture() {
  const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (char) => char.charCodeAt(0));
  return new File([bytes], "pixel.png", { type: "image/png" });
}

describe("PDF processor", () => {
  it("merges real PDF fixture files", async () => {
    const first = await fixture();
    const second = await fixture();
    const result = await pdfProcessor([first, second], { operation: "pdf-merge" }, {
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    const output = await PDFDocument.load(await result[0].blob.arrayBuffer());
    expect(output.getPageCount()).toBe(4);
  });

  it("rotates a real PDF fixture", async () => {
    const result = await pdfProcessor([await fixture()], { operation: "pdf-rotate", angle: "90" }, {
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    const output = await PDFDocument.load(await result[0].blob.arrayBuffer());
    expect(output.getPage(0).getRotation().angle).toBe(90);
  });

  it("splits a real PDF fixture into one output per page", async () => {
    const result = await pdfProcessor([await fixture()], { operation: "pdf-split" }, {
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    expect(result).toHaveLength(2);
    expect((await PDFDocument.load(await result[1].blob.arrayBuffer())).getPageCount()).toBe(1);
  });

  it("extracts, deletes, and reorders selected pages", async () => {
    const file = await fixture();
    const extract = await pdfProcessor([file], { operation: "pdf-extract", pageIndices: JSON.stringify([1]) }, context);
    expect((await PDFDocument.load(await extract[0].blob.arrayBuffer())).getPageCount()).toBe(1);
    const remove = await pdfProcessor([file], { operation: "pdf-delete-pages", deletePageIndices: JSON.stringify([0]) }, context);
    expect((await PDFDocument.load(await remove[0].blob.arrayBuffer())).getPageCount()).toBe(1);
    const reorder = await pdfProcessor([file], { operation: "pdf-reorder", pageOrder: JSON.stringify([1, 0]) }, context);
    expect((await PDFDocument.load(await reorder[0].blob.arrayBuffer())).getPageCount()).toBe(2);
  });

  it("converts PNG images to a PDF", async () => {
    const result = await pdfProcessor([pngFixture()], { operation: "pdf-image-to-pdf" }, context);
    expect((await PDFDocument.load(await result[0].blob.arrayBuffer())).getPageCount()).toBe(1);
  });

  it("adds a small highlight region without rejecting the PDF", async () => {
    const result = await pdfProcessor([await fixture()], { operation: "pdf-highlight", pageNumber: 1, x: 0, y: 0, width: 20, height: 20 }, context);
    expect((await PDFDocument.load(await result[0].blob.arrayBuffer())).getPageCount()).toBe(2);
  });

  it("removes PDF metadata", async () => {
    const document = await PDFDocument.create();
    document.setTitle("Private title");
    document.addPage();
    const file = new File([Uint8Array.from(await document.save())], "metadata.pdf", { type: "application/pdf" });
    const result = await pdfProcessor([file], { operation: "pdf-metadata", removeMetadata: true }, context);
    const output = await PDFDocument.load(await result[0].blob.arrayBuffer());
    expect(output.getTitle()).toBe("");
  });

  it("creates a local privacy report from readable PDF metadata", async () => {
    const document = await PDFDocument.create();
    document.setAuthor("Private author");
    document.addPage();
    const file = new File([Uint8Array.from(await document.save())], "report.pdf", { type: "application/pdf" });
    const result = await pdfProcessor([file], { operation: "pdf-privacy" }, context);
    const report = JSON.parse(await result[0].blob.text()) as { pageCount: number; metadata: { author: string | null } };
    expect(report.pageCount).toBe(1);
    expect(report.metadata.author).toBe("Private author");
  });

  it("crops PDF page boxes without rasterizing the document", async () => {
    const result = await pdfProcessor([await fixture()], { operation: "pdf-crop", x: 10, y: 20, width: 60, height: 50 }, context);
    const output = await PDFDocument.load(await result[0].blob.arrayBuffer());
    expect(output.getPage(0).getCropBox()).toMatchObject({ width: 192, height: 120 });
    expect(result[0].name).toBe("fixture-cropped.pdf");
  });

  it("fits PDF pages to A4 while preserving content", async () => {
    const result = await pdfProcessor([await fixture()], { operation: "pdf-page-size", size: "a4" }, context);
    const output = await PDFDocument.load(await result[0].blob.arrayBuffer());
    expect(output.getPage(0).getWidth()).toBeCloseTo(595.28);
    expect(output.getPage(0).getHeight()).toBeCloseTo(841.89);
    expect(result[0].name).toBe("fixture-a4.pdf");
  });
});
