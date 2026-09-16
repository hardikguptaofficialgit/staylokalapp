import { X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AppWorkflow } from "./types";
import FileTypeIcon from "./FileTypeIcon";
import { detectFileType } from "@/lib/tools/file-types";

export default function SelectedFileCard({ workflow, file, index }: { workflow: AppWorkflow; file: File; index: number }) {
  const detected = detectFileType(file);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [textPreview, setTextPreview] = useState("");

  useEffect(() => {
    if (!previewOpen) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    if (detected.kind === "text") {
      void file.text().then(setTextPreview);
    }
    return () => URL.revokeObjectURL(url);
  }, [detected.kind, file, previewOpen]);

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  return (
    <>
      <div className={`selected-file-card ${workflow.selectedFileIndex === index ? "is-selected" : ""}`}>
        <button type="button" onClick={() => { workflow.selectFile(index); setPreviewOpen(true); }} aria-pressed={workflow.selectedFileIndex === index} className="selected-file-main">
        <FileTypeIcon kind={detected.kind} size={22} />
        <span className="selected-file-copy">
          <strong>{file.name}</strong>
          <small>{detected.label} · {workflow.formatBytes(file.size)}</small>
        </span>
        </button>
        <button type="button" onClick={() => workflow.removeFile(index)} aria-label={`Remove ${file.name}`} className="selected-file-remove">
          <X size={14} />
        </button>
      </div>
      {previewOpen && typeof document !== "undefined" && createPortal(
        <div className="file-preview-backdrop" role="presentation" onClick={() => setPreviewOpen(false)}>
          <section className="file-preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`} onClick={(event) => event.stopPropagation()}>
            <header className="file-preview-header">
              <div>
                <p className="eyebrow">{detected.label}</p>
                <h2>{file.name}</h2>
              </div>
              <button type="button" className="control-pill" onClick={() => setPreviewOpen(false)} aria-label="Close preview"><X size={16} /> Close</button>
            </header>
            <div className="file-preview-body">
              {previewUrl && detected.kind === "image" && <img src={previewUrl} alt={`Preview of ${file.name}`} className="file-preview-image" />}
              {previewUrl && detected.kind === "pdf" && <iframe src={previewUrl} title={`Preview of ${file.name}`} className="file-preview-frame" />}
              {previewUrl && detected.kind === "video" && <video src={previewUrl} controls className="file-preview-media" />}
              {previewUrl && detected.kind === "audio" && <audio src={previewUrl} controls className="file-preview-audio" />}
              {detected.kind === "text" && <pre className="file-preview-text">{textPreview}</pre>}
              {!["image", "pdf", "video", "audio", "text"].includes(detected.kind) && (
                <p className="file-preview-unavailable">This file type is detected locally, but the browser cannot render an in-app preview for it.</p>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
