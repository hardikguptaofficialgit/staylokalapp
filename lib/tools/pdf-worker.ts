import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

type WorkerRequest = {
  id: number;
  operation: "pdf-watermark" | "pdf-page-numbers" | "pdf-add-text" | "pdf-header-footer" | "pdf-highlight" | "pdf-shape";
  bytes: ArrayBuffer;
  text?: string;
  fontSize?: number;
  pageNumber?: number;
  header?: string;
  footer?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type WorkerResponse =
  | { id: number; type: "progress"; ratio: number; label: string }
  | { id: number; type: "result"; bytes: ArrayBuffer }
  | { id: number; type: "error"; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const document = await PDFDocument.load(data.bytes);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const pages = document.getPages();
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      if (data.operation === "pdf-watermark") {
        const text = data.text?.trim();
        if (!text) throw new Error("Enter watermark text first.");
        const size = Math.max(8, Math.min(96, data.fontSize ?? 32));
        const width = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: Math.max(12, (page.getWidth() - width) / 2),
          y: page.getHeight() / 2,
          size,
          font,
          color: rgb(0.45, 0.45, 0.45),
          opacity: 0.35,
          rotate: degrees(45),
        });
      } else if (data.operation === "pdf-add-text") {
        const text = data.text?.trim();
        if (!text) throw new Error("Enter text first.");
        const targetPage = Number(data.pageNumber || 1);
        if (targetPage < 1 || targetPage > pages.length) throw new Error(`Page ${targetPage} does not exist.`);
        if (index !== targetPage - 1) continue;
        const size = Math.max(8, Math.min(96, data.fontSize ?? 16));
        page.drawText(text, {
          x: data.x === undefined ? 36 : page.getWidth() * Math.max(0, Math.min(100, data.x)) / 100,
          y: data.y === undefined ? Math.max(36, page.getHeight() - 72) : page.getHeight() * (100 - Math.max(0, Math.min(100, data.y))) / 100,
          size,
          font,
          color: rgb(0.08, 0.08, 0.08),
        });
      } else if (data.operation === "pdf-highlight" || data.operation === "pdf-shape") {
        const targetPage = Math.max(0, Number(data.pageNumber) || 0);
        if (targetPage !== 0 && targetPage !== index + 1) continue;
        const x = Math.max(0, Math.min(100, Number(data.x) || 0));
        const y = Math.max(0, Math.min(100, Number(data.y) || 0));
        const width = Math.max(0, Math.min(100, Number(data.width) || 0));
        const height = Math.max(0, Math.min(100, Number(data.height) || 0));
        if (width <= 0 || height <= 0) throw new Error("Highlight width and height must be greater than zero.");
        const xPoints = page.getWidth() * x / 100;
        const yPoints = page.getHeight() * (100 - y - height) / 100;
        const rectangleWidth = Math.max(1, Math.min(page.getWidth() - xPoints, page.getWidth() * width / 100));
        const rectangleHeight = Math.max(1, Math.min(page.getHeight() - yPoints, page.getHeight() * height / 100));
        page.drawRectangle({
          x: xPoints,
          y: yPoints,
          width: rectangleWidth,
          height: rectangleHeight,
          color: data.operation === "pdf-highlight" ? rgb(1, 0.86, 0.15) : rgb(0.2, 0.45, 0.9),
          opacity: data.operation === "pdf-highlight" ? 0.32 : 0.08,
          borderColor: data.operation === "pdf-highlight" ? rgb(1, 0.7, 0) : rgb(0.2, 0.45, 0.9),
          borderWidth: 1.5,
          borderOpacity: 0.85,
        });
      } else if (data.operation === "pdf-header-footer") {
        const size = Math.max(8, Math.min(48, data.fontSize ?? 12));
        const header = data.header?.trim();
        const footer = data.footer?.trim();
        if (!header && !footer) throw new Error("Enter a header or footer first.");
        if (header) {
          const width = font.widthOfTextAtSize(header, size);
          page.drawText(header, { x: Math.max(18, (page.getWidth() - width) / 2), y: page.getHeight() - 28, size, font, color: rgb(0.25, 0.25, 0.25) });
        }
        if (footer) {
          const width = font.widthOfTextAtSize(footer, size);
          page.drawText(footer, { x: Math.max(18, (page.getWidth() - width) / 2), y: 18, size, font, color: rgb(0.25, 0.25, 0.25) });
        }
      } else {
        const label = `${index + 1}`;
        const size = Math.max(8, Math.min(32, data.fontSize ?? 12));
        const width = font.widthOfTextAtSize(label, size);
        page.drawText(label, {
          x: Math.max(12, (page.getWidth() - width) / 2),
          y: 18,
          size,
          font,
          color: rgb(0.25, 0.25, 0.25),
        });
      }
      workerScope.postMessage({ id: data.id, type: "progress", ratio: (index + 1) / pages.length, label: `Updated page ${index + 1} of ${pages.length}` });
    }
    const output = Uint8Array.from(await document.save());
    workerScope.postMessage({ id: data.id, type: "result", bytes: output.buffer }, [output.buffer]);
  } catch (error) {
    workerScope.postMessage({ id: data.id, type: "error", message: error instanceof Error ? error.message : "PDF worker failed." });
  }
};
