import type { PdfPage } from "./types";

type PdfCanvasProps = {
  page?: PdfPage;
};

export default function PdfCanvas({ page }: PdfCanvasProps) {
  return (
    <div className="pdf-canvas" aria-label={page ? `PDF page ${page.pageIndex + 1} canvas` : "PDF canvas"}>
      {page && (
        <iframe
          src={`${page.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
          title={`PDF page ${page.pageIndex + 1} preview`}
          className="pdf-canvas-document"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        />
      )}
    </div>
  );
}
