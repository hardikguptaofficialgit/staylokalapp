import type { PdfPage } from "./types";
import PdfPagePreview from "./PdfPagePreview";

type PdfCanvasProps = {
  page?: PdfPage;
};

export default function PdfCanvas({ page }: PdfCanvasProps) {
  return (
    <div className="pdf-canvas" aria-label={page ? `PDF page ${page.pageIndex + 1} canvas` : "PDF canvas"}>
      {page && (
        <PdfPagePreview
          previewUrl={page.previewUrl}
          title={`PDF page ${page.pageIndex + 1} preview`}
          className="pdf-canvas-document"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        />
      )}
    </div>
  );
}
