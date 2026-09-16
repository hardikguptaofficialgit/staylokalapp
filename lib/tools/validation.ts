import { ProcessingError, type ToolDescriptor } from "./types";
import { detectFileType } from "./file-types";

const maxInputBytes = 512 * 1024 * 1024;

export function matchesAcceptedFile(file: File, accept: string[]) {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const extensionTypes: Record<string, string[]> = {
    pdf: ["application/pdf"],
    jpg: ["image/*"], jpeg: ["image/*"], png: ["image/*"], webp: ["image/*"], gif: ["image/*"], svg: ["image/*"], bmp: ["image/*"], avif: ["image/*"],
    mp4: ["video/*"], mov: ["video/*"], webm: ["video/*"], avi: ["video/*"], mkv: ["video/*"],
    mp3: ["audio/*"], wav: ["audio/*"], m4a: ["audio/*"], aac: ["audio/*"], flac: ["audio/*"],
    pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ppt: ["application/vnd.ms-powerpoint"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    doc: ["application/msword"],
    txt: ["text/plain"],
    xls: ["application/vnd.ms-excel"],
    xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  };
  const detected = detectFileType(file);
  return accept.some((rule) => {
    const typeMatch = rule.endsWith("/*") ? file.type.startsWith(rule.slice(0, -1)) : file.type === rule;
    const extensionMatch = extensionTypes[extension]?.some((type) => type === rule);
    const detectedTypeMatch = rule === "application/pdf"
      ? detected.kind === "pdf"
      : rule === "image/*"
        ? detected.kind === "image"
        : rule === "video/*"
          ? detected.kind === "video"
          : rule === "audio/*"
            ? detected.kind === "audio"
            : rule === "text/plain"
              ? detected.kind === "text"
              : rule.includes("spreadsheet")
                ? detected.kind === "spreadsheet"
                : rule === "application/zip" && detected.kind === "archive";
    return typeMatch || extensionMatch || detectedTypeMatch;
  });
}

export function validateToolInput(files: File[], tool: ToolDescriptor, options: Record<string, string | number | boolean>) {
  if (!files.length) throw new ProcessingError("Add at least one file first.", "invalid");
  if (!tool.batch && files.length > 1) throw new ProcessingError(`${tool.name} accepts one file at a time.`, "invalid");
  if (files.some((file) => file.size === 0)) throw new ProcessingError("Empty files cannot be processed.", "invalid");
  if (files.reduce((total, file) => total + file.size, 0) > maxInputBytes) {
    throw new ProcessingError("This batch is larger than the 512 MB local processing limit.", "memory");
  }
  if (files.some((file) => !matchesAcceptedFile(file, tool.accept))) {
    throw new ProcessingError(`This tool accepts ${tool.accept.join(", ")} files.`, "invalid");
  }
  for (const option of tool.options) {
    const value = options[option.id];
    if (option.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new ProcessingError(`${option.label} must be a valid number.`, "invalid");
    }
    if (option.type === "select" && option.options && !option.options.some((item) => item.value === String(value))) {
      throw new ProcessingError(`Choose a valid ${option.label.toLowerCase()}.`, "invalid");
    }
    if (typeof value === "number" && option.min !== undefined && value < option.min) {
      throw new ProcessingError(`${option.label} must be at least ${option.min}.`, "invalid");
    }
    if (typeof value === "number" && option.max !== undefined && value > option.max) {
      throw new ProcessingError(`${option.label} must be at most ${option.max}.`, "invalid");
    }
  }
}

export { maxInputBytes };
