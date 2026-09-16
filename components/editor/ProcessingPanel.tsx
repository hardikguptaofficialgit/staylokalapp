"use client";

export interface ProcessingPanelProps {
  progress: number;
  label?: string;
  error?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function ProcessingPanel({
  progress,
  label = "Processing locally",
  error,
  onCancel,
  cancelLabel = "Cancel",
}: ProcessingPanelProps) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <section className={`editor-panel editor-processing-panel ${error ? "has-error" : ""}`} aria-live="polite">
      <div className="editor-panel-heading">
        <div>
          <h3 className="editor-panel-title">{error ? "Processing failed" : label}</h3>
          <p className="editor-panel-description">{error ?? `${percentage}% complete`}</p>
        </div>
        {!error && onCancel && (
          <button type="button" className="editor-text-button" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
      </div>
      {!error && (
        <div className="editor-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
          <span style={{ width: `${Math.max(2, percentage)}%` }} />
        </div>
      )}
    </section>
  );
}
