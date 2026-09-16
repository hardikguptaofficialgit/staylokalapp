export type MediaEditorOperation = "trim" | "cut" | "split";

export type MediaEditorAction = {
  operation: MediaEditorOperation;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  segmentDuration: number;
  start: string;
  duration: string;
};

export type MediaEditorProgress = {
  operation: string;
  ratio: number;
  label: string;
};

export type MediaSource = Blob | string;

export type MediaEditorProps = {
  source: MediaSource;
  fileName?: string;
  /** Connect this to the existing processor with `{ operation, ...action }`. */
  onAction?: (action: MediaEditorAction) => void | Promise<unknown>;
  /** Set while the parent calls `processors.ffmpeg`; the editor only displays it. */
  progress?: MediaEditorProgress;
  /** Abort the parent AbortController and restore the idle editor state. */
  onCancel?: () => void;
  onReplace?: () => void;
  disabled?: boolean;
};

export function formatMediaTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = (safe % 60).toFixed(3).padStart(6, "0");
  return `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`;
}

export function rangeAction(operation: MediaEditorOperation, startSeconds: number, endSeconds: number): MediaEditorAction {
  const start = Math.max(0, startSeconds);
  const end = Math.max(start, endSeconds);
  return {
    operation,
    startSeconds: start,
    endSeconds: end,
    durationSeconds: end - start,
    segmentDuration: end - start,
    start: formatMediaTime(start),
    duration: formatMediaTime(end - start),
  };
}

