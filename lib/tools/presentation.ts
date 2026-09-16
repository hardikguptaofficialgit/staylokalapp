import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";

const slidePattern = /^ppt\/slides\/slide(\d+)\.xml$/;

const presentationProcessor: ToolProcessor = async (files, _options, context) => {
  const outputs: ProcessedFile[] = [];
  for (const [index, file] of files.entries()) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
    if (_options.operation === "ppt-text" && (/\.ppt$/i.test(file.name) || file.type === "application/vnd.ms-powerpoint")) {
      try {
            const cfbImport = await import("cfb");
            const cfb = (cfbImport.default ?? cfbImport) as unknown as {
              read: (data: Uint8Array, options: { type: string }) => unknown;
              find?: (container: unknown, path: string) => unknown;
            };
            const runtime = globalThis as typeof globalThis & {
              CFB?: typeof cfb;
              cptable?: unknown;
            };
            runtime.CFB = cfb;
            runtime.cptable = (await import("codepage")).default ?? await import("codepage");
            const pptImport = await import("ppt");
        const ppt = (pptImport.default ?? pptImport) as {
          parse_pptcfb: (container: unknown) => unknown;
          utils: { to_text: (presentation: unknown) => string[] };
        };
            const container = cfb.read(new Uint8Array(await file.arrayBuffer()), { type: "buffer" }) as {
              find?: (path: string) => unknown;
            };
            if (cfb.find) container.find = (path) => cfb.find?.(container, path);
            const presentation = ppt.parse_pptcfb(container);
        const strings = ppt.utils.to_text(presentation).filter(Boolean);
        outputs.push({
          blob: new Blob([`${file.name}\n\n${strings.join("\n\n")}\n`], { type: "text/plain" }),
          type: "text/plain",
          name: `${file.name.replace(/\.ppt$/i, "")}-text.txt`,
        });
        context.onProgress({ ratio: (index + 1) / files.length, label: `Extracted legacy PowerPoint text from ${file.name}` });
        continue;
          } catch {
            throw new ProcessingError("This legacy PowerPoint file could not be read locally.", "invalid");
      }
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch {
      throw new ProcessingError("This PowerPoint file could not be opened locally.", "invalid");
    }
    const slides = Object.keys(zip.files)
      .map((name) => ({ name, number: Number(name.match(slidePattern)?.[1] ?? 0) }))
      .filter((slide) => slide.number > 0)
      .sort((a, b) => a.number - b.number);
    if (!slides.length) throw new ProcessingError("No PowerPoint slides were found in this file.", "invalid");

    if (_options.operation === "pptx-pdf") {
      const { PptxRenderer } = await import("pptx-browser");
      const renderer = new PptxRenderer();
      try {
        await renderer.load(file, (progress: number, message: string) => {
          context.onProgress({
            ratio: (index + progress * 0.9) / files.length,
            label: `Rendering ${file.name} · ${message}`,
          });
        });
        const pdf = await PDFDocument.create();
        for (let slideIndex = 0; slideIndex < renderer.slideCount; slideIndex += 1) {
          if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
          const canvas = document.createElement("canvas");
          await renderer.renderSlide(slideIndex, canvas, 1600);
          const image = await pdf.embedPng(canvas.toDataURL("image/png"));
          const width = 960;
          const height = width * canvas.height / canvas.width;
          const page = pdf.addPage([width, height]);
          page.drawImage(image, { x: 0, y: 0, width, height });
          context.onProgress({
            ratio: (index + 0.9 + ((slideIndex + 1) / renderer.slideCount) * 0.1) / files.length,
            label: `Exported slide ${slideIndex + 1} of ${renderer.slideCount}`,
          });
        }
        const pdfBytes = await pdf.save();
        const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
        outputs.push({
          blob: new Blob([pdfBuffer], { type: "application/pdf" }),
          type: "application/pdf",
          name: `${file.name.replace(/\.pptx?$/i, "")}.pdf`,
        });
      } finally {
        renderer.destroy();
      }
      continue;
    }

    if (_options.operation === "pptx-png" || _options.operation === "pptx-jpg") {
      const { PptxRenderer } = await import("pptx-browser");
      const renderer = new PptxRenderer();
      const format = _options.operation === "pptx-jpg" ? "image/jpeg" : "image/png";
      const extension = _options.operation === "pptx-jpg" ? "jpg" : "png";
      try {
        await renderer.load(file, (progress: number, message: string) => {
          context.onProgress({
            ratio: (index + progress * 0.9) / files.length,
            label: `Loading ${file.name} · ${message}`,
          });
        });
        for (let slideIndex = 0; slideIndex < renderer.slideCount; slideIndex += 1) {
          if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
          const canvas = document.createElement("canvas");
          await renderer.renderSlide(slideIndex, canvas, 1600);
          const blob = await fetch(canvas.toDataURL(format, 0.92)).then((response) => response.blob());
          outputs.push({
            blob,
            type: format,
            name: `${file.name.replace(/\.pptx?$/i, "")}-slide-${String(slideIndex + 1).padStart(2, "0")}.${extension}`,
          });
          context.onProgress({
            ratio: (index + 0.9 + ((slideIndex + 1) / renderer.slideCount) * 0.1) / files.length,
            label: `Exported slide ${slideIndex + 1} of ${renderer.slideCount}`,
          });
        }
      } finally {
        renderer.destroy();
      }
      continue;
    }

    const text: string[] = [`${file.name}`, `${slides.length} slides`, ""];
    for (const slide of slides) {
      if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
      const xml = await zip.files[slide.name].async("text");
      const document = new DOMParser().parseFromString(xml, "application/xml");
      const strings = Array.from(document.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean);
      text.push(`Slide ${slide.number}`, strings.join(" "), "");
      context.onProgress({
        ratio: (index + (slide.number / slides.length)) / files.length,
        label: `Extracted slide ${slide.number} of ${slides.length}`,
      });
    }
    outputs.push({
      blob: new Blob([text.join("\n")], { type: "text/plain" }),
      type: "text/plain",
      name: `${file.name.replace(/\.pptx?$/i, "")}-text.txt`,
    });
  }
  return outputs;
};

export default presentationProcessor;
