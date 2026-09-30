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
          documentUrl={page.documentUrl}
          pageNumber={page.pageIndex + 1}
          rotation={page.rotation}
          title={`PDF page ${page.pageIndex + 1} preview`}
          className="pdf-canvas-document"
        />
      )}
    </div>
  );
}
