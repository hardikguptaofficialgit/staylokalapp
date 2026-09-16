import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField, StandardFonts, degrees, rgb } from "pdf-lib";
import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";
import { runPdfWorker } from "./pdf-worker-client";

function blobFromBytes(bytes: Uint8Array, type: string) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type });
}

async function renderPdfPages(file: File, context: Parameters<ToolProcessor>[2], format: "image/png" | "image/jpeg" = "image/png", pageNumbers?: number[], redact?: { pageNumber: number; x: number; y: number; width: number; height: number }) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: { bytes: Uint8Array; index: number; width: number; height: number; blank: boolean }[] = [];
  const requestedPages = pageNumbers ?? Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1);
  for (const index of requestedPages) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    if (index < 1 || index > pdfDocument.numPages) throw new ProcessingError(`Page ${index} does not exist. This PDF has ${pdfDocument.numPages} page${pdfDocument.numPages === 1 ? "" : "s"}.`, "invalid");
    const page = await pdfDocument.getPage(index);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const canvasContext = canvas.getContext("2d")!;
    await page.render({ canvas, canvasContext, viewport }).promise;
    const pixels = canvasContext.getImageData(0, 0, canvas.width, canvas.height).data;
    let blank = true;
    for (let offset = 0; offset < pixels.length; offset += 16) {
      if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) {
        blank = false;
        break;
      }
    }
    if (redact && (redact.pageNumber === 0 || redact.pageNumber === index)) {
      canvasContext.fillStyle = "#000";
      canvasContext.fillRect(
        canvas.width * Math.max(0, Math.min(100, redact.x)) / 100,
        canvas.height * Math.max(0, Math.min(100, redact.y)) / 100,
        canvas.width * Math.max(0, Math.min(100, redact.width)) / 100,
        canvas.height * Math.max(0, Math.min(100, redact.height)) / 100,
      );
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Canvas export failed")), format, 0.92));
    pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), index, width: viewport.width, height: viewport.height, blank });
    context.onProgress({ ratio: pages.length / requestedPages.length, label: `Rendered page ${index} of ${pdfDocument.numPages}` });
  }
  return pages;
}

const pdfProcessor: ToolProcessor = async (files, options, context) => {
  if (!files.length) throw new ProcessingError("Add at least one PDF first.", "invalid");
  const operation = String(options.operation || options.mode || "merge");
  if (operation === "pdf-flatten") {
    const pages = await renderPdfPages(files[0], context);
    const output = await PDFDocument.create();
    for (const page of pages) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const image = await output.embedPng(page.bytes);
      const target = output.addPage([page.width / 1.5, page.height / 1.5]);
      target.drawImage(image, { x: 0, y: 0, width: target.getWidth(), height: target.getHeight() });
    }
    return [{ blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }), type: "application/pdf", name: "flattened.pdf" }];
  }
  if (operation === "pdf-redact") {
    const redactWidth = Number(options.width) || 0;
    const redactHeight = Number(options.height) || 0;
    if (redactWidth <= 0 || redactHeight <= 0) throw new ProcessingError("Redaction width and height must be greater than zero.", "invalid");
    const pages = await renderPdfPages(files[0], context, "image/png", undefined, {
      pageNumber: Math.max(0, Number(options.pageNumber) || 0),
      x: Number(options.x) || 0,
      y: Number(options.y) || 0,
      width: redactWidth,
      height: redactHeight,
    });
    const output = await PDFDocument.create();
    for (const page of pages) {
      const image = await output.embedPng(page.bytes);
      const target = output.addPage([page.width / 1.5, page.height / 1.5]);
      target.drawImage(image, { x: 0, y: 0, width: target.getWidth(), height: target.getHeight() });
    }
    return [{ blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }), type: "application/pdf", name: "redacted.pdf" }];
  }
  if (operation === "pdf-remove-blank") {
    const rendered = await renderPdfPages(files[0], context);
    const keep = rendered.filter((page) => !page.blank);
    if (!keep.length) throw new ProcessingError("Every page appears blank; no output was created.", "invalid");
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, keep.map((page) => page.index - 1));
    pages.forEach((page) => output.addPage(page));
    return [{ blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }), type: "application/pdf", name: "blank-pages-removed.pdf" }];
  }
  if (operation === "pdf-duplicate-page") {
    const pageNumber = Number(options.pageNumber) || 0;
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    if (pageNumber < 1 || pageNumber > source.getPageCount()) throw new ProcessingError(`Page ${pageNumber} does not exist.`, "invalid");
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    const [duplicate] = await output.copyPages(source, [pageNumber - 1]);
    output.addPage(duplicate);
    return [{ blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }), type: "application/pdf", name: "page-duplicated.pdf" }];
  }
  if (operation === "pdf-add-image") {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const imageData = typeof options.imageData === "string" ? options.imageData : "";
    const encoded = imageData.split(",")[1];
    if (!encoded) throw new ProcessingError("Choose a JPG or PNG image first.", "invalid");
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const image = imageData.startsWith("data:image/png") ? await source.embedPng(bytes) : await source.embedJpg(bytes);
    const pageNumber = Math.max(1, Number(options.pageNumber) || 1);
    if (pageNumber > source.getPageCount()) throw new ProcessingError(`Page ${pageNumber} does not exist.`, "invalid");
    const page = source.getPage(pageNumber - 1);
    const x = Math.max(0, Math.min(100, Number(options.x) || 10));
    const y = Math.max(0, Math.min(100, Number(options.y) || 10));
    const width = Math.max(1, Math.min(100, Number(options.width) || 30));
    const height = Math.max(1, Math.min(100, Number(options.height) || 30));
    const drawWidth = page.getWidth() * width / 100;
    const drawHeight = page.getHeight() * height / 100;
    page.drawImage(image, {
      x: page.getWidth() * x / 100,
      y: page.getHeight() * (100 - y - height) / 100,
      width: drawWidth,
      height: drawHeight,
    });
    return [{ blob: new Blob([Uint8Array.from(await source.save())], { type: "application/pdf" }), type: "application/pdf", name: "image-annotated.pdf" }];
  }
  if (operation === "pdf-fill-form") {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const formValues = typeof options.formValues === "string" ? JSON.parse(options.formValues) as Record<string, unknown> : {};
    const form = source.getForm();
    for (const field of form.getFields()) {
      const value = formValues[field.getName()];
      if (field instanceof PDFTextField && typeof value === "string") field.setText(value);
      else if (field instanceof PDFCheckBox && value === true) field.check();
      else if (field instanceof PDFCheckBox && value === false) field.uncheck();
      else if (field instanceof PDFDropdown && typeof value === "string") field.select(value);
      else if (field instanceof PDFOptionList && Array.isArray(value)) field.select(value.filter((item): item is string => typeof item === "string"));
      else if (field instanceof PDFRadioGroup && typeof value === "string") field.select(value);
    }
    return [{ blob: new Blob([Uint8Array.from(await source.save())], { type: "application/pdf" }), type: "application/pdf", name: "filled-form.pdf" }];
  }
  if (operation === "pdf-privacy") {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const report = {
      file: files[0].name,
      pageCount: source.getPageCount(),
      metadata: {
        title: source.getTitle() || null,
        author: source.getAuthor() || null,
        subject: source.getSubject() || null,
        keywords: source.getKeywords() || null,
        creator: source.getCreator() || null,
        producer: source.getProducer() || null,
        creationDate: source.getCreationDate()?.toISOString() ?? null,
        modificationDate: source.getModificationDate()?.toISOString() ?? null,
      },
      note: "This report covers metadata exposed by pdf-lib. It does not claim to detect every embedded file, script, annotation, or revision object.",
    };
    return [{
      blob: new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
      type: "application/json",
      name: `${files[0].name.replace(/\.pdf$/i, "")}-privacy-report.json`,
    }];
  }
  if (operation === "pdf-watermark" || operation === "pdf-page-numbers" || operation === "pdf-add-text" || operation === "pdf-header-footer" || operation === "pdf-highlight" || operation === "pdf-shape") {
    if (operation === "pdf-highlight" || operation === "pdf-shape") {
      const document = await PDFDocument.load(await files[0].arrayBuffer());
      const targetPage = Math.max(0, Number(options.pageNumber) || 0);
      const x = Math.max(0, Math.min(100, Number(options.x) || 0));
      const y = Math.max(0, Math.min(100, Number(options.y) || 0));
      const width = Math.max(0.5, Math.min(100, Number(options.width) || 0.5));
      const height = Math.max(0.5, Math.min(100, Number(options.height) || 0.5));
      document.getPages().forEach((page, index) => {
        if (targetPage !== 0 && targetPage !== index + 1) return;
        const xPoints = page.getWidth() * x / 100;
        const yPoints = page.getHeight() * (100 - y - height) / 100;
        page.drawRectangle({
          x: xPoints,
          y: yPoints,
          width: Math.max(1, Math.min(page.getWidth() - xPoints, page.getWidth() * width / 100)),
          height: Math.max(1, Math.min(page.getHeight() - yPoints, page.getHeight() * height / 100)),
          color: operation === "pdf-highlight" ? rgb(1, 0.86, 0.15) : rgb(0.2, 0.45, 0.9),
          opacity: operation === "pdf-highlight" ? 0.32 : 0.08,
          borderColor: operation === "pdf-highlight" ? rgb(1, 0.7, 0) : rgb(0.2, 0.45, 0.9),
          borderWidth: 1.5,
          borderOpacity: 0.85,
        });
      });
      return [{ blob: blobFromBytes(Uint8Array.from(await document.save()), "application/pdf"), type: "application/pdf", name: operation === "pdf-highlight" ? "highlighted.pdf" : "shape-added.pdf" }];
    }
    const bytes = await runPdfWorker(files[0], operation, {
      text: typeof options.text === "string" ? options.text : undefined,
      fontSize: typeof options.fontSize === "number" ? options.fontSize : undefined,
      pageNumber: typeof options.pageNumber === "number" ? options.pageNumber : undefined,
      header: typeof options.header === "string" ? options.header : undefined,
      footer: typeof options.footer === "string" ? options.footer : undefined,
      x: typeof options.x === "number" ? options.x : undefined,
      y: typeof options.y === "number" ? options.y : undefined,
      width: typeof options.width === "number" ? options.width : undefined,
      height: typeof options.height === "number" ? options.height : undefined,
    }, context);
    return [{
      blob: blobFromBytes(bytes, "application/pdf"),
      type: "application/pdf",
      name: operation === "pdf-watermark" ? "watermarked.pdf" : operation === "pdf-add-text" ? "text-added.pdf" : operation === "pdf-header-footer" ? "header-footer-added.pdf" : "numbered-pages.pdf",
    }];
  }
  if (operation === "pdf-to-png" || operation === "pdf-to-jpg") {
    const format = operation === "pdf-to-jpg" ? "image/jpeg" : "image/png";
    const mode = String(options.exportMode || "individual");
    const pageNumber = Number(options.pageNumber || 1);
    const requestedPages = mode === "single" ? [pageNumber] : undefined;
    const pages = await renderPdfPages(files[0], context, format, requestedPages);
    const baseName = files[0].name.replace(/\.pdf$/i, "").replace(/[<>:"/\\|?*]+/g, "-").trim() || "document";
    const extension = format === "image/jpeg" ? "jpg" : "png";
    const outputs = pages.map((page) => ({
      blob: blobFromBytes(page.bytes, format),
      type: format,
      name: `${baseName}-page-${page.index}.${extension}`,
    }));
    if (mode !== "zip") return outputs;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    outputs.forEach((output) => zip.file(output.name, output.blob));
    return [{
      blob: await zip.generateAsync({ type: "blob" }),
      type: "application/zip",
      name: `${baseName}-pages.zip`,
    }];
  }
  if (operation === "pdf-ocr") {
    const pages = await renderPdfPages(files[0], context);
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      workerPath: "/tesseract/worker.min.js",
      langPath: "/tesseract/data",
      corePath: "/tesseract/core",
      workerBlobURL: false,
      logger: (event) => context.onProgress({ ratio: Math.min(0.99, event.progress / 2), label: event.status }),
    });
    try {
      const texts: string[] = [];
      const searchable = await PDFDocument.create();
      const font = await searchable.embedFont(StandardFonts.Helvetica);
      for (const [index, page] of pages.entries()) {
        if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
        const result = await worker.recognize(blobFromBytes(page.bytes, "image/png"));
        texts.push(`Page ${index + 1}\n\n${result.data.text.trim()}`);
        const image = await searchable.embedPng(page.bytes);
        const outputPage = searchable.addPage([page.width / 1.5, page.height / 1.5]);
        outputPage.drawImage(image, { x: 0, y: 0, width: outputPage.getWidth(), height: outputPage.getHeight() });
        const words = (result.data as typeof result.data & {
          words?: Array<{ text: string; bbox: { x0: number; y0: number; y1: number } }>;
        }).words ?? [];
        for (const word of words) {
          const scale = outputPage.getWidth() / image.width;
          const size = Math.max(4, (word.bbox.y1 - word.bbox.y0) * scale);
          outputPage.drawText(word.text, {
            x: word.bbox.x0 * scale,
            y: outputPage.getHeight() - word.bbox.y1 * scale,
            size,
            font,
            opacity: 0,
          });
        }
      }
      const baseName = files[0].name.replace(/\.pdf$/i, "");
      return [
        { blob: new Blob([texts.join("\n\n")], { type: "text/plain;charset=utf-8" }), type: "text/plain", name: `${baseName}.txt` },
        { blob: blobFromBytes(Uint8Array.from(await searchable.save()), "application/pdf"), type: "application/pdf", name: `${baseName}-searchable.pdf` },
      ];
    } finally {
      await worker.terminate();
    }
  }
  if (operation === "pdf-compress") {
    const { createQpdfRunner } = await import("qpdf-run");
    const runner = await createQpdfRunner({
      workerUrl: new URL("qpdf-run/worker", import.meta.url).toString(),
      qpdfJsUrl: new URL("qpdf-run/qpdf.js", import.meta.url).toString(),
      wasmUrl: new URL("qpdf-run/qpdf.wasm", import.meta.url).toString(),
    });
    try {
      const input = new Uint8Array(await files[0].arrayBuffer());
      const result = await runner.runOne({
        input,
        inputName: "input.pdf",
        outputName: "compressed.pdf",
        args: ["--stream-data=compress", "--object-streams=generate", "--compress-streams=y", "--recompress-flate", "--compression-level=9", "--", "input.pdf", "compressed.pdf"],
      });
      if (result.byteLength >= input.byteLength) throw new ProcessingError("Compression did not reduce this PDF. The original file is already efficiently encoded.", "invalid");
      return [{ blob: blobFromBytes(result, "application/pdf"), type: "application/pdf", name: "compressed.pdf" }];
    } finally {
      await runner.destroy();
    }
  }
  if (operation === "pdf-image-to-pdf") {
    const output = await PDFDocument.create();
    for (const [index, file] of files.entries()) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const bytes = await file.arrayBuffer();
      const image = file.type === "image/png" || /\.png$/i.test(file.name)
        ? await output.embedPng(bytes)
        : file.type === "image/jpeg" || /\.(jpe?g)$/i.test(file.name)
          ? await output.embedJpg(bytes)
          : null;
      if (!image) throw new ProcessingError("JPG and PNG images are supported for PDF conversion.", "unsupported");
      const page = output.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      context.onProgress({ ratio: (index + 1) / files.length, label: `Added image ${index + 1} of ${files.length}` });
    }
    return [{
      blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }),
      type: "application/pdf",
      name: "images.pdf",
    }];
  }
  if (operation === "pdf-metadata") {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    if (options.removeMetadata) {
      source.setTitle("");
      source.setAuthor("");
      source.setSubject("");
      source.setKeywords([]);
      source.setCreator("");
      source.setProducer("");
      source.setCreationDate(new Date(0));
      source.setModificationDate(new Date(0));
    }
    return [{
      blob: new Blob([Uint8Array.from(await source.save())], { type: "application/pdf" }),
      type: "application/pdf",
      name: options.removeMetadata ? "metadata-removed.pdf" : "metadata-copy.pdf",
    }];
  }
  if (["pdf-extract", "pdf-delete-pages", "pdf-reorder"].includes(operation)) {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const pageCount = source.getPageCount();
    const allPages = source.getPageIndices();
    const parseIndices = (value: string | number | boolean | undefined) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed.map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < pageCount) : [];
      } catch {
        return [];
      }
    };
    const requested = options.pageIndices
      ? parseIndices(options.pageIndices)
      : allPages;
    const deleted = options.deletePageIndices
      ? new Set(parseIndices(options.deletePageIndices))
      : new Set<number>();
    const order = operation === "pdf-reorder" && options.pageOrder
      ? parseIndices(options.pageOrder).filter((index) => allPages.includes(index))
      : requested;
    const indices = (operation === "pdf-delete-pages" ? allPages.filter((index) => !deleted.has(index)) : order);
    if (!indices.length) throw new ProcessingError("Keep at least one page in the PDF.", "invalid");
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach((page) => output.addPage(page));
    return [{
      blob: new Blob([Uint8Array.from(await output.save())], { type: "application/pdf" }),
      type: "application/pdf",
      name: operation === "pdf-extract" ? "extracted-pages.pdf" : operation === "pdf-delete-pages" ? "pages-removed.pdf" : "reordered-pages.pdf",
    }];
  }
  if (String(options.operation) === "pdf-split" && files.length !== 1) {
    throw new ProcessingError("Split PDF accepts one document at a time.", "invalid");
  }
  const mode = operation.includes("rotate") ? "rotate" : "merge";
  if (String(options.operation) === "pdf-split") {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const outputs: ProcessedFile[] = [];
    for (const [index, pageIndex] of source.getPageIndices().entries()) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const single = await PDFDocument.create();
      const [page] = await single.copyPages(source, [pageIndex]);
      single.addPage(page);
      outputs.push({
        blob: new Blob([Uint8Array.from(await single.save())], { type: "application/pdf" }),
        type: "application/pdf",
        name: `${files[0].name.replace(/\.pdf$/i, "")}-page-${index + 1}.pdf`,
      });
      context.onProgress({ ratio: (index + 1) / source.getPageCount(), label: `Exported page ${index + 1} of ${source.getPageCount()}` });
    }
    return outputs;
  }
  const output = await PDFDocument.create();
  for (const [index, file] of files.entries()) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    const source = await PDFDocument.load(await file.arrayBuffer());
    if (mode === "rotate") {
      source.getPages().forEach((page) => page.setRotation(degrees(Number(options.angle) || 90)));
    }
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
    context.onProgress({ ratio: (index + 1) / files.length, label: `Read ${index + 1} of ${files.length} PDFs` });
  }
  const bytes = await output.save({ updateFieldAppearances: false });
  return [{
    blob: new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
    type: "application/pdf",
    name: mode === "rotate" ? "rotated-files.pdf" : "merged-files.pdf",
  }];
};

export default pdfProcessor;
