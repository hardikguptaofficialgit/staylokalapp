import type { PdfPage, PdfWorkflow } from "./types";
import PdfCanvas from "./PdfCanvas";
import PdfEditorFooter from "./PdfEditorFooter";
import PdfPageControls from "./PdfPageControls";
import PdfToolbar from "./PdfToolbar";

type PdfWorkspaceProps = {
  workflow: PdfWorkflow;
  pages: PdfPage[];
  selected: number;
  processing: boolean;
  message: string;
  onSelect: (index: number) => void;
  onMove: (direction: -1 | 1) => void;
  onRotate: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onExport: (splitAsZip?: boolean) => void;
  splitMode?: "individual" | "zip";
  splitRange?: string;
  onSplitModeChange?: (mode: "individual" | "zip") => void;
  onSplitRangeChange?: (range: string) => void;
  selectedPages: number[];
  onTogglePage: (index: number) => void;
};

export default function PdfWorkspace({
  workflow,
  pages,
  selected,
  processing,
  message,
  onSelect,
  onMove,
  onRotate,
  onDelete,
  onCancel,
  onExport,
  splitMode,
  splitRange,
  onSplitModeChange,
  onSplitRangeChange,
  selectedPages,
  onTogglePage,
}: PdfWorkspaceProps) {
  return (
    <section className="pdf-workspace" aria-label="PDF page editor">
      <PdfToolbar
        workflow={workflow}
        selected={selected}
        pageCount={pages.length}
        onMove={onMove}
        onRotate={onRotate}
        onDelete={onDelete}
      />
      <div className={`pdf-workspace-body ${pages.length <= 1 ? "is-single-page" : ""}`}>
        <PdfPageControls
          pages={pages}
          selected={selected}
          onSelect={onSelect}
          selectionMode={workflow === "pdf-extract"}
          selectedPages={selectedPages}
          onToggle={onTogglePage}
        />
        <PdfCanvas page={pages[selected]} />
      </div>
      <PdfEditorFooter
        workflow={workflow}
        page={selected}
        pageCount={pages.length}
        processing={processing}
        message={message}
        splitMode={splitMode}
        splitRange={splitRange}
        onSplitModeChange={onSplitModeChange}
        onSplitRangeChange={onSplitRangeChange}
        onCancel={onCancel}
        onExport={onExport}
      />
    </section>
  );
}
