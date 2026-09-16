"use client";

import { ArrowLeft, ArrowRight, ArrowsClockwise, CornersIn, CornersOut, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { PdfWorkflow } from "./types";

type PdfToolbarProps = {
  workflow: PdfWorkflow;
  selected: number;
  pageCount: number;
  onMove: (direction: -1 | 1) => void;
  onRotate: () => void;
  onDelete: () => void;
};

export default function PdfToolbar({ workflow, selected, pageCount, onMove, onRotate, onDelete }: PdfToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement?.classList.contains("pdf-workspace") ?? false);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen(event: React.MouseEvent<HTMLButtonElement>) {
    const workspace = event.currentTarget.closest(".pdf-workspace");
    if (!workspace) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await workspace.requestFullscreen();
    }
  }

  return (
    <div className="pdf-toolbar" aria-label="PDF editor toolbar">
      <div>
        <p className="pdf-toolbar-meta">{pageCount} page{pageCount === 1 ? "" : "s"} · page {selected + 1} selected</p>
      </div>
      <div className="pdf-toolbar-actions">
        {(workflow === "pdf-merge" || workflow === "pdf-reorder") && (
          <>
            <button type="button" onClick={() => onMove(-1)} disabled={selected === 0} className="editor-toolbar-item" aria-label="Move page left"><ArrowLeft size={15} /> Move left</button>
            <button type="button" onClick={() => onMove(1)} disabled={selected === pageCount - 1} className="editor-toolbar-item" aria-label="Move page right"><ArrowRight size={15} /> Move right</button>
            <button type="button" onClick={onDelete} className="editor-toolbar-item editor-action-danger" aria-label="Delete selected page"><Trash size={15} /> Delete</button>
          </>
        )}
        {workflow === "pdf-delete-pages" && <button type="button" onClick={onDelete} className="editor-toolbar-item editor-action-danger" aria-label="Delete selected page"><Trash size={15} /> Delete page</button>}
        {workflow === "pdf-rotate" && <button type="button" onClick={onRotate} className="editor-toolbar-item editor-action-default" aria-label="Rotate selected page"><ArrowsClockwise size={15} /> Rotate page</button>}
        <button type="button" onClick={(event) => void toggleFullscreen(event)} className="editor-toolbar-item pdf-fullscreen-button" aria-label={isFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"}>
          {isFullscreen ? <CornersIn size={15} /> : <CornersOut size={15} />}
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}
