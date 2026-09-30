"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getTool, processors, tools } from "@/lib/tools/registry";
import { ProcessingError, type ProcessedFile, type ToolDescriptor } from "@/lib/tools/types";
import { matchesAcceptedFile, maxInputBytes, validateToolInput } from "@/lib/tools/validation";
import { detectFileType, hasUnsupportedDetectedType } from "@/lib/tools/file-types";
import type { VideoEditorAction } from "@/components/editor/media";
import { moveItemInArray, remapSelectedIndex } from "@/lib/app/move-file-order";
import { applyTheme, resolveTheme, subscribeTheme, type Theme } from "@/lib/app/theme";

export type Category = "All" | "PDF" | "Image" | "Video" | "Audio" | "Other";
export type { Theme };
export type ViewMode = "smart" | "all";

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function useFileWorkflow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacePickerRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const pendingToolId = useRef<string | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, resolveTheme, () => "dark" as Theme);
  const [viewMode, setViewMode] = useState<ViewMode>("smart");
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, string | number | boolean>>({});
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ ratio: 0, label: "" });
  const [result, setResult] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState("");
  const [panelSplit, setPanelSplit] = useState(24);

  const selected = selectedId ? getTool(selectedId) : undefined;
  const activeFile = files[selectedFileIndex] ?? files[0];
  const oversizedInput = files.some((file) => file.size > maxInputBytes)
    || files.reduce((total, file) => total + file.size, 0) > maxInputBytes;
  const inputSizeError = files.some((file) => file.size > maxInputBytes)
    ? "Files larger than 512 MB cannot be processed locally."
    : "This batch is larger than the 512 MB local processing limit.";
  const detectedTypes = useMemo(() => Array.from(new Set(files.map((file) => detectFileType(file).label))), [files]);
  const unsupportedTypes = useMemo(() => Array.from(new Set(files.filter(hasUnsupportedDetectedType).map((file) => detectFileType(file).label))), [files]);
  const compatibleTools = useMemo(() => tools.filter((tool) => files.length > 0 && files.every((file) => matchesAcceptedFile(file, tool.accept))), [files]);
  const browseTools = viewMode === "all" ? tools : compatibleTools;
  const availableCategories = useMemo(() => ["All", ...Array.from(new Set(browseTools.map((tool) => tool.category)))], [browseTools]);
  const visibleTools = useMemo(() => browseTools.filter((tool) => {
    const categoryMatch = category === "All" || tool.category === category;
    const searchMatch = !query || `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && searchMatch;
  }), [browseTools, category, query]);
  const resultUrls = useMemo(() => result.map((item) => ({ ...item, url: URL.createObjectURL(item.blob) })), [result]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => () => {
    resultUrls.forEach((item) => URL.revokeObjectURL(item.url));
  }, [resultUrls]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status === "processing") controller.current?.abort();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedFiles = Array.from(event.clipboardData?.files ?? []);
      const itemFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
      const files = pastedFiles.length ? pastedFiles : itemFiles;
      if (!files.length) return;
      event.preventDefault();
      addFiles(files);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "file") return;
      const dropped = Array.from(event.dataTransfer?.files ?? []);
      if (!dropped.length) return;
      event.preventDefault();
      addFiles(dropped);
    };
    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  // addFiles is stable enough for paste; listing it re-subscribes every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- paste handler only needs latest addFiles behavior via closure refresh on mount
  }, []);

  function clearWorkspace() {
    setFiles([]);
    setSelectedFileIndex(0);
    setSelectedId(null);
    setResult([]);
    setCategory("All");
    setQuery("");
    setError("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming);
    if (!next.length) return;
    const hasOversizedFile = next.some((file) => file.size > maxInputBytes);
    if (replacePickerRef.current && next[0]) {
      replacePickerRef.current = false;
      setFiles((current) => current.map((file, index) => index === selectedFileIndex ? next[0] : file));
    } else {
      setFiles((current) => [...current, ...next]);
    }
    setSelectedFileIndex(0);
    setError(hasOversizedFile ? "Files larger than 512 MB cannot be processed locally." : "");
    setStatus(hasOversizedFile ? "error" : "idle");
    if (inputRef.current) inputRef.current.value = "";
    const nextToolId = pendingToolId.current;
    pendingToolId.current = null;
    setSelectedId(nextToolId);
    const nextTool = nextToolId ? getTool(nextToolId) : undefined;
    if (nextTool) setOptions(Object.fromEntries(nextTool.options.map((option) => [option.id, option.defaultValue ?? ""])));
    setResult([]);
    setCategory("All");
    setQuery("");
  }

  function replaceActiveFile() {
    replacePickerRef.current = true;
    inputRef.current?.click();
  }

  function selectTool(tool: ToolDescriptor) {
    if (!files.length) {
      pendingToolId.current = tool.id;
      inputRef.current?.click();
      return;
    }
    setSelectedId(tool.id);
    setResult([]);
    setError(
      oversizedInput
        ? inputSizeError
        : files.some((file) => matchesAcceptedFile(file, tool.accept))
          ? ""
          : `This tool accepts ${tool.accept.join(", ")} files. Choose a matching file.`,
    );
    setStatus("idle");
    setOptions(Object.fromEntries(tool.options.map((option) => [option.id, option.defaultValue ?? ""])));
  }

  function clearSelectedTool() {
    setSelectedId(null);
    setError("");
    setStatus("idle");
  }

  function moveFile(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= files.length || toIndex >= files.length) {
      return;
    }
    setFiles((current) => moveItemInArray(current, fromIndex, toIndex));
    setSelectedFileIndex((current) => remapSelectedIndex(current, fromIndex, toIndex));
    setResult([]);
    setError("");
    setStatus("idle");
  }

  function removeFile(index: number) {
    const newFiles = files.filter((_, position) => position !== index);
    setFiles(newFiles);
    setSelectedFileIndex((current) => Math.max(0, Math.min(current, newFiles.length - 1)));
    setSelectedId(null);
    setResult([]);
    setCategory("All");
    setQuery("");
    setError("");
    setStatus("idle");
  }

  async function processWithOptions(nextOptions = options) {
    if (!selected) return;
    if (oversizedInput) {
      setError(inputSizeError);
      setStatus("error");
      return;
    }
    const accepted = files.filter((file) => matchesAcceptedFile(file, selected.accept));
    try {
      validateToolInput(accepted, selected, nextOptions);
    } catch (cause) {
      setError(cause instanceof ProcessingError ? cause.message : "These inputs are not valid for this tool.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    setError("");
    setResult([]);
    setProgress({ ratio: 0, label: "Starting…" });
    controller.current = new AbortController();
    let peakProgress = 0;
    const onProgress = (update: { ratio: number; label: string }) => {
      const ratio = Math.min(1, Math.max(0, update.ratio));
      peakProgress = Math.max(peakProgress, ratio);
      setProgress({ ratio: peakProgress, label: update.label });
    };
    try {
      const operation = String((nextOptions as Record<string, unknown>).operation ?? selected.id);
      const output = await processors[selected.kind](selected.batch ? accepted : accepted.slice(0, 1), { ...nextOptions, operation }, {
        signal: controller.current.signal,
        onProgress,
      });
      setResult(output);
      setStatus("done");
      setProgress({ ratio: 1, label: "Ready to download" });
    } catch (cause) {
      if (cause instanceof ProcessingError && cause.code === "cancelled") {
        setStatus("idle");
        setProgress({ ratio: 0, label: "" });
        return;
      }
      setError(cause instanceof ProcessingError ? cause.message : "Something went wrong while processing.");
      setStatus("error");
    } finally {
      controller.current = null;
    }
  }

  function selectFile(index: number) {
    setSelectedFileIndex(index);
    setResult([]);
    setError(files[index]?.size > maxInputBytes ? "Files larger than 512 MB cannot be processed locally." : "");
    setStatus("idle");
    if (selected && !matchesAcceptedFile(files[index], selected.accept)) setSelectedId(null);
  }

  function processVideoAction(action: VideoEditorAction) {
    const actionOptions: Record<string, string | number | boolean> = action.operation === "trim"
      ? { start: action.start, duration: action.duration, operation: action.operation }
      : action.operation === "cut"
        ? { startSeconds: action.startSeconds, durationSeconds: action.durationSeconds, operation: action.operation }
        : action.operation === "split"
          ? { segmentDuration: action.segmentDuration, operation: action.operation }
          : action.operation === "speed"
            ? { speed: action.speed ?? 1, operation: action.operation }
            : action.operation === "frames"
              ? {
                  startSeconds: action.startSeconds,
                  durationSeconds: action.durationSeconds,
                  fps: action.fps ?? 1,
                  operation: action.operation,
                }
              : { operation: action.operation };
    return processWithOptions(actionOptions);
  }

  function completeResult(output: ProcessedFile[]) {
    setResult(output);
    setStatus("done");
    setProgress({ ratio: 1, label: "Ready to download" });
  }

  function reportError(message: string) {
    setError(message);
    setStatus("error");
  }

  function setProcessingState(processing: boolean) {
    if (!processing) return;
    setStatus("processing");
    setError("");
    setResult([]);
  }

  function startDividerDrag(event: React.PointerEvent<HTMLDivElement>) {
    const grid = event.currentTarget.parentElement;
    if (!grid) return;
    const bounds = grid.getBoundingClientRect();
    const update = (moveEvent: PointerEvent) => {
      const next = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setPanelSplit(Math.min(50, Math.max(20, next)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", update);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return {
    inputRef, theme, viewMode, setViewMode, category, query, files, selectedFileIndex, selectedId, options, status,
    progress, result, resultUrls, error, panelSplit, selected, activeFile,
    oversizedInput, inputSizeError, detectedTypes, unsupportedTypes, compatibleTools,
    availableCategories, visibleTools, setCategory, setQuery, setOptions, clearWorkspace,
    addFiles, replaceActiveFile, selectTool, clearSelectedTool, removeFile, moveFile, processWithOptions, selectFile, processVideoAction,
    completeResult, reportError, setProcessingState, startDividerDrag, formatBytes,
    setPanelSplit, setProgress, cancelProcessing: () => controller.current?.abort(),
  };
}

export type FileWorkflow = ReturnType<typeof useFileWorkflow>;
