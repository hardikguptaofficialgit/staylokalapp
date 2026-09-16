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
  previewUrl: string;
};
