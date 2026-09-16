import { DownloadSimple, Trash } from "@phosphor-icons/react";
import type { PdfWorkflow } from "./types";

type PdfEditorFooterProps = {
  workflow: PdfWorkflow;
  page: number;
  pageCount: number;
  processing: boolean;
  message: string;
  splitMode?: "individual" | "zip";
  splitRange?: string;
  onSplitModeChange?: (mode: "individual" | "zip") => void;
  onSplitRangeChange?: (range: string) => void;
  onCancel: () => void;
  onExport: (splitAsZip?: boolean) => void;
};

export default function PdfEditorFooter({ workflow, page, pageCount, processing, message, splitMode = "individual", splitRange = "", onSplitModeChange, onSplitRangeChange, onCancel, onExport }: PdfEditorFooterProps) {
  return (
    <footer className="pdf-editor-footer">
      <p className="pdf-editor-status" role="status">{message || `Page ${page + 1} of ${pageCount}`}</p>
      {processing ? (
        <button type="button" onClick={onCancel} className="control-pill" aria-label="Cancel PDF export"><Trash size={15} /> Cancel export</button>
      ) : (
        <>
          {workflow === "pdf-split" && (
            <div className="pdf-split-options">
              <label>
                <span>Pages</span>
                <input value={splitRange} onChange={(event) => onSplitRangeChange?.(event.target.value)} placeholder={`All ${pageCount} pages`} aria-label="Pages or ranges to split" />
              </label>
              <label>
                <span>Download</span>
                <select value={splitMode} onChange={(event) => onSplitModeChange?.(event.target.value as "individual" | "zip")} aria-label="Split download format">
                  <option value="individual">Individual PDFs</option>
                  <option value="zip">ZIP archive</option>
                </select>
              </label>
            </div>
          )}
          <button type="button" onClick={() => onExport(workflow === "pdf-split" && splitMode === "zip")} className="action-button min-h-11 justify-center">
            <DownloadSimple size={16} /> {workflow === "pdf-split" ? "Split PDF" : "Export PDF"}
          </button>
        </>
      )}
    </footer>
  );
}
