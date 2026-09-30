export type PdfWorkflow =
  | "pdf-merge"
  | "pdf-rotate"
  | "pdf-split"
  | "pdf-extract"
  | "pdf-delete-pages"
  | "pdf-reorder";

export type PdfPage = {
  id: string;
  sourceIndex: number;
  pageIndex: number;
  label: string;
  rotation: number;
  /** Object URL for the source PDF file (shared across pages from the same upload). */
  documentUrl: string;
};
