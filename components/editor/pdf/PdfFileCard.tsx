import type { PdfPage } from "./types";
import PdfPagePreview from "./PdfPagePreview";

type PdfFileCardProps = {
  page: PdfPage;
  index: number;
  selected: boolean;
  included?: boolean;
  onSelect: () => void;
};

export default function PdfFileCard({ page, index, selected, included = false, onSelect }: PdfFileCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select page ${index + 1}`}
      aria-pressed={selected}
      className={`pdf-file-card ${selected ? "is-selected" : ""} ${included ? "is-included" : ""}`}
    >
      <PdfPagePreview
        previewUrl={page.previewUrl}
        title={`Page ${index + 1} thumbnail`}
        className="pdf-file-card-preview"
      />
      <span className="pdf-file-card-label">
        <strong>Page {index + 1}</strong>
      </span>
    </button>
  );
}
