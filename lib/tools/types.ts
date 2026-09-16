export type ToolCategory = "PDF" | "Image" | "Video" | "Audio" | "Other";

export type ToolOption = {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox";
  defaultValue?: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
};

export type ToolDescriptor = {
  id: string;
  category: ToolCategory;
  name: string;
  description: string;
  icon: string;
  accept: string[];
  batch: boolean;
  options: ToolOption[];
  kind: "image" | "pdf" | "ffmpeg" | "document";
  outputExtension?: string;
  available: boolean;
  isNew?: boolean;
};

export type ProgressEvent = {
  ratio: number;
  label: string;
};

export type ProcessorContext = {
  onProgress: (event: ProgressEvent) => void;
  signal: AbortSignal;
};

export type ProcessedFile = {
  blob: Blob;
  name: string;
  type: string;
};

export type ToolProcessor = (
  files: File[],
  options: Record<string, string | number | boolean>,
  context: ProcessorContext,
) => Promise<ProcessedFile[]>;

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unsupported"
      | "cancelled"
      | "invalid"
      | "runtime"
      | "memory" = "runtime",
  ) {
    super(message);
    this.name = "ProcessingError";
  }
}
