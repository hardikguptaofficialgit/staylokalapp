import type { PdfPage } from "./types";
import PdfFileCard from "./PdfFileCard";

type PdfPageControlsProps = {
  pages: PdfPage[];
  selected: number;
  onSelect: (index: number) => void;
  selectionMode?: boolean;
  selectedPages?: number[];
  onToggle?: (index: number) => void;
};

export default function PdfPageControls({ pages, selected, onSelect, selectionMode = false, selectedPages = [], onToggle }: PdfPageControlsProps) {
  if (pages.length <= 1) return null;
  return (
    <aside className="pdf-page-controls" aria-label="PDF pages">
      <div className="pdf-page-controls-heading">
        <span>Pages</span>
        <small>{pages.length}</small>
      </div>
      <div className="pdf-page-list">
        {pages.map((page, index) => (
          <PdfFileCard
            key={page.id}
            page={page}
            index={index}
            selected={selected === index}
            included={selectedPages.includes(index)}
            onSelect={() => {
              onSelect(index);
              if (selectionMode) onToggle?.(index);
            }}
          />
        ))}
      </div>
    </aside>
  );
}
