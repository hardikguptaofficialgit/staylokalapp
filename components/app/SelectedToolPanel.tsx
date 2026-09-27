import { ArrowLeft, ArrowUp, CloudArrowDown, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";
import PdfEditor from "@/components/editor/pdf/pdf-editor";
import ImageToPdfEditor from "@/components/editor/pdf/ImageToPdfEditor";
import PdfMetadataEditor from "@/components/editor/pdf/PdfMetadataEditor";
import PdfAdvancedEditor from "@/components/editor/pdf/PdfAdvancedEditor";
import PdfFormEditor from "@/components/editor/pdf/PdfFormEditor";
import PdfImageAnnotationEditor from "@/components/editor/pdf/PdfImageAnnotationEditor";
import ImageEditor from "@/components/editor/image/ImageEditor";
import BackgroundRemovalEditor from "@/components/editor/image/BackgroundRemovalEditor";
import DocumentEditor from "@/components/editor/document/DocumentEditor";
import SpreadsheetEditor from "@/components/editor/spreadsheet/SpreadsheetEditor";
import ArchiveEditor from "@/components/editor/archive/ArchiveEditor";
import { AudioEditor, VideoEditor, type VideoEditorAction, type VideoEditorToolId } from "@/components/editor/media";
import type { AppWorkflow } from "./types";
import { matchesAcceptedFile } from "@/lib/tools/validation";
import WorkspaceSidebar from "./WorkspaceSidebar";
import ArchiveCreateEditor from "@/components/editor/archive/ArchiveCreateEditor";

const videoEditorToolIds = ["trim", "cut", "speed", "frames"] as const;
const genericFfmpegVideoToolIds = [
  "split", "compress", "convert", "resize", "fps", "mute", "extract-audio", "to-gif", "from-gif", "thumbnail", "rotate", "flip", "metadata",
] as const;
const audioEditorToolIds = ["audio-trim", "normalize-audio", "metadata-audio", "convert-audio"] as const;

function usesInlineMediaProgress(toolId: string) {
  return (videoEditorToolIds as readonly string[]).includes(toolId) || (audioEditorToolIds as readonly string[]).includes(toolId);
}

function FfmpegSourcePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  if (file.type.startsWith("video/")) {
    return <video src={url} controls className="max-h-52 w-full rounded-lg border border-line bg-black/80" />;
  }
  if (file.type.startsWith("audio/")) {
    return <audio src={url} controls className="w-full" />;
  }
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) {
    return <img src={url} alt="" className="mx-auto max-h-52 rounded-lg border border-line object-contain" />; // eslint-disable-line @next/next/no-img-element
  }
  return <p className="text-sm text-muted">Preview is not available for this file type, but local processing is still supported.</p>;
}

function primaryRunToolLabel(toolId: string, processing: boolean) {
  if (processing) return "Processing File...";
  const labels: Record<string, string> = {
    "spreadsheet-csv": "Export CSV",
    "spreadsheet-preview": "Download preview",
    "archive-list": "Download listing",
    "archive-create": "Create ZIP",
    "archive-extract": "Extract File",
    "json-format": "Format JSON",
    "base64-encode": "Encode Base64",
    "base64-decode": "Decode Base64",
    "file-hash": "Compute hash",
    split: "Split video",
    compress: "Compress video",
    convert: "Convert video",
    resize: "Resize video",
    fps: "Change FPS",
    mute: "Mute video",
    "extract-audio": "Extract audio",
    "to-gif": "Create GIF",
    "from-gif": "Convert to MP4",
    thumbnail: "Grab thumbnail",
    rotate: "Rotate video",
    flip: "Flip video",
    metadata: "Remove metadata",
  };
  return labels[toolId] ?? "Run Tool";
}

export default function SelectedToolPanel({ workflow, inputRef }: { workflow: AppWorkflow; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const selected = workflow.selected;
  if (!selected) return null;
  const inlineMediaProgress = usesInlineMediaProgress(selected.id);

  return (
    <div className="selected-tool-panel animate-fade-in mx-auto w-full max-w-[1000px] rounded-xl border border-line bg-panel p-3 sm:p-4">
      <button type="button" onClick={workflow.clearSelectedTool} className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-muted transition hover:border-foreground hover:text-foreground shadow-sm" aria-label="Back to compatible tools">
        <ArrowLeft size={16} /> Back to tools
      </button>
      <div>
        <p className="eyebrow !text-[10px] text-foreground/70">{selected.category}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{selected.name}</h3>
      </div>
      <div className="mt-5 mb-5 h-px w-full bg-line" />

      {selected.kind === "pdf" && (
        <div className="pdf-editor-layout">
          <WorkspaceSidebar workflow={workflow} inputRef={inputRef} compact />
          <div className="pdf-editor-main">
            {selected.id === "pdf-fill-form" && !workflow.oversizedInput ? (
              <PdfFormEditor
                file={workflow.activeFile}
                processing={workflow.status === "processing"}
                onProcess={(options) => void workflow.processWithOptions(options)}
              />
            ) : selected.id === "pdf-add-image" && !workflow.oversizedInput ? (
              <PdfImageAnnotationEditor
                file={workflow.activeFile}
                processing={workflow.status === "processing"}
                onProcess={(options) => void workflow.processWithOptions(options)}
              />
            ) : ["pdf-to-image", "pdf-contact-sheet", "pdf-crop", "pdf-page-size", "pdf-ocr", "pdf-compress", "pdf-watermark", "pdf-page-numbers", "pdf-add-text", "pdf-header-footer", "pdf-flatten", "pdf-privacy", "pdf-redact", "pdf-highlight", "pdf-shape", "pdf-remove-blank", "pdf-duplicate-page"].includes(selected.id) && !workflow.oversizedInput ? (
              <PdfAdvancedEditor
                operation={selected.id as "pdf-to-image" | "pdf-contact-sheet" | "pdf-crop" | "pdf-page-size" | "pdf-ocr" | "pdf-compress" | "pdf-watermark" | "pdf-page-numbers" | "pdf-add-text" | "pdf-header-footer" | "pdf-flatten" | "pdf-privacy" | "pdf-redact" | "pdf-highlight" | "pdf-shape" | "pdf-remove-blank" | "pdf-duplicate-page"}
                file={workflow.activeFile}
                processing={workflow.status === "processing"}
                onProcess={(options) => void workflow.processWithOptions(options)}
              />
            ) : selected.id === "pdf-image-to-pdf" && !workflow.oversizedInput ? (
              <ImageToPdfEditor
                files={workflow.files.filter((file) => matchesAcceptedFile(file, selected.accept))}
                processing={workflow.status === "processing"}
                onProcess={() => void workflow.processWithOptions()}
              />
            ) : selected.id === "pdf-metadata" && !workflow.oversizedInput ? (
              <PdfMetadataEditor
                file={workflow.activeFile}
                processing={workflow.status === "processing"}
                onRemove={() => void workflow.processWithOptions({ removeMetadata: true })}
              />
            ) : !workflow.oversizedInput ? (
              <PdfEditor
                files={workflow.files.filter((file) => matchesAcceptedFile(file, selected.accept))}
                workflow={selected.id as "pdf-merge" | "pdf-rotate" | "pdf-split" | "pdf-extract" | "pdf-delete-pages" | "pdf-reorder"}
                onComplete={workflow.completeResult}
                onError={workflow.reportError}
                onProgress={workflow.setProgress}
                onProcessingChange={workflow.setProcessingState}
              />
            ) : (
              <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 text-sm text-red-500" role="alert">
                <p className="font-semibold">Input is too large for local processing</p>
                <p className="mt-1">{workflow.inputSizeError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selected.kind === "image" && workflow.activeFile && !workflow.oversizedInput && (
        selected.id === "image-background-remove" ? (
          <BackgroundRemovalEditor file={workflow.activeFile} />
        ) : <ImageEditor
          key={selected.id}
          file={workflow.activeFile}
          operation={selected.id}
          options={workflow.options}
          onOptionsChange={workflow.setOptions}
        />
      )}

      {selected.id === "archive-create" && !workflow.oversizedInput && (
        <ArchiveCreateEditor
          files={workflow.files}
          tool={selected}
          archiveName={String(workflow.options.archiveName ?? "archive.zip")}
          onArchiveNameChange={(value) => workflow.setOptions({ ...workflow.options, archiveName: value })}
        />
      )}

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && !selected.id.startsWith("spreadsheet-") && !selected.id.startsWith("archive-") && selected.id !== "json-format" && !selected.id.startsWith("base64-") && selected.id !== "file-hash" && (
        <DocumentEditor file={workflow.activeFile} />
      )}

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && selected.id.startsWith("spreadsheet-") && (
        <SpreadsheetEditor
          file={workflow.activeFile}
          options={workflow.options}
          onOptionsChange={workflow.setOptions}
        />
      )}

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && selected.id.startsWith("archive-") && selected.id !== "archive-create" && (
        <ArchiveEditor
          file={workflow.activeFile}
          options={workflow.options}
          onOptionsChange={workflow.setOptions}
        />
      )}

      {(audioEditorToolIds as readonly string[]).includes(selected.id) && workflow.activeFile && !workflow.oversizedInput && (
        <AudioEditor
          key={selected.id}
          source={workflow.activeFile}
          fileName={workflow.activeFile.name}
          mode={selected.id === "audio-trim" ? "trim" : "preview"}
          onAction={selected.id === "audio-trim"
            ? (action) => workflow.processWithOptions({ start: action.start, duration: action.duration, operation: "audio-trim" })
            : undefined}
          onReplace={workflow.replaceActiveFile}
          progress={workflow.status === "processing" ? { ...workflow.progress, operation: selected.id } : undefined}
          onCancel={workflow.cancelProcessing}
          disabled={workflow.status === "processing"}
        />
      )}

      {(genericFfmpegVideoToolIds as readonly string[]).includes(selected.id) && workflow.activeFile && !workflow.oversizedInput && (
        <div className="mb-8 rounded-xl border border-line bg-background p-4">
          <p className="eyebrow !text-[10px] text-muted">Local source preview</p>
          <div className="mt-3">
            <FfmpegSourcePreview file={workflow.activeFile} />
          </div>
          <p className="mt-2 text-xs text-muted">Set options below, then run the tool. Your file never leaves this device.</p>
        </div>
      )}

      {(videoEditorToolIds as readonly string[]).includes(selected.id) && workflow.activeFile && !workflow.oversizedInput && (
        <VideoEditor
          key={selected.id}
          source={workflow.activeFile}
          fileName={workflow.activeFile.name}
          activeTool={selected.id as VideoEditorToolId}
          onAction={(action: VideoEditorAction) => workflow.processVideoAction(action)}
          onReplace={workflow.replaceActiveFile}
          progress={workflow.status === "processing" ? { ...workflow.progress, operation: selected.id as VideoEditorAction["operation"] } : undefined}
          onCancel={workflow.cancelProcessing}
          disabled={workflow.status === "processing"}
        />
      )}

      {selected.kind !== "pdf" && workflow.oversizedInput && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 text-sm text-red-500" role="alert">
          <p className="font-semibold">Input is too large for local processing</p>
          <p className="mt-1">{workflow.inputSizeError}</p>
        </div>
      )}

      {!workflow.oversizedInput && selected.kind !== "image" && selected.kind !== "pdf" && !(audioEditorToolIds as readonly string[]).includes(selected.id) && !(videoEditorToolIds as readonly string[]).includes(selected.id) && selected.options.length > 0 && (
        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          {selected.options.map((option) => (
            <label key={option.id} className="block text-sm font-medium text-foreground">
              {option.label}
              <div className="mt-2.5">
                {option.type === "checkbox" ? (
                  <input type="checkbox" checked={Boolean(workflow.options[option.id])} onChange={(event) => workflow.setOptions({ ...workflow.options, [option.id]: event.target.checked })} className="size-5 accent-foreground" />
                ) : option.type === "select" ? (
                  <select value={String(workflow.options[option.id] ?? option.options?.[0]?.value ?? "")} onChange={(event) => workflow.setOptions({ ...workflow.options, [option.id]: event.target.value })} className="field cursor-pointer">
                    {option.options?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                ) : (
                  <input type={option.type === "number" ? "number" : "text"} value={String(workflow.options[option.id] ?? "")} placeholder={option.placeholder} min={option.min} max={option.max} step={option.step} onChange={(event) => workflow.setOptions({ ...workflow.options, [option.id]: option.type === "number" ? Number(event.target.value) : event.target.value })} className="field" />
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {selected.kind !== "pdf" && !inlineMediaProgress && <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => void workflow.processWithOptions()} disabled={workflow.status === "processing"} className="action-button flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50">
          {primaryRunToolLabel(selected.id, workflow.status === "processing")}
          {workflow.status !== "processing" && <ArrowUp size={18} weight="bold" />}
        </button>
        {workflow.status === "processing" && <button type="button" onClick={workflow.cancelProcessing} className="control-pill justify-center sm:w-32" aria-label="Cancel processing">Cancel</button>}
      </div>}

      {(audioEditorToolIds as readonly string[]).includes(selected.id) && selected.id !== "audio-trim" && !workflow.oversizedInput && selected.options.length > 0 && (
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          {selected.options.map((option) => (
            <label key={option.id} className="block text-sm font-medium text-foreground">
              {option.label}
              <div className="mt-2.5">
                {option.type === "select" ? (
                  <select value={String(workflow.options[option.id] ?? option.options?.[0]?.value ?? "")} onChange={(event) => workflow.setOptions({ ...workflow.options, [option.id]: event.target.value })} className="field cursor-pointer">
                    {option.options?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                ) : (
                  <input type={option.type === "number" ? "number" : "text"} value={String(workflow.options[option.id] ?? "")} placeholder={option.placeholder} min={option.min} max={option.max} step={option.step} onChange={(event) => workflow.setOptions({ ...workflow.options, [option.id]: option.type === "number" ? Number(event.target.value) : event.target.value })} className="field" />
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {selected.kind !== "pdf" && (audioEditorToolIds as readonly string[]).includes(selected.id) && selected.id !== "audio-trim" && !workflow.oversizedInput && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => void workflow.processWithOptions()} disabled={workflow.status === "processing"} className="action-button flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {workflow.status === "processing" ? "Processing File..." : selected.id === "normalize-audio" ? "Normalize audio" : selected.id === "metadata-audio" ? "Remove metadata" : "Convert audio"}
            {workflow.status !== "processing" && <ArrowUp size={18} weight="bold" />}
          </button>
          {workflow.status === "processing" && <button type="button" onClick={workflow.cancelProcessing} className="control-pill justify-center sm:w-32" aria-label="Cancel processing">Cancel</button>}
        </div>
      )}

      {workflow.status === "processing" && !inlineMediaProgress && (
        <div className="mt-6 animate-fade-in rounded-xl border border-line bg-background p-4" role="status">
          <div className="mb-3 flex justify-between text-sm font-medium text-foreground">
            <span>{workflow.progress.label || "Preparing media engine…"}</span>
            <span>{Math.round(workflow.progress.ratio * 100)}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(workflow.progress.ratio * 100)} aria-label="Processing progress">
            <div className="progress-bar" style={{ width: `${Math.max(2, Math.min(100, workflow.progress.ratio * 100))}%` }} />
          </div>
        </div>
      )}

      {workflow.error && <div className="mt-6 animate-fade-in rounded-xl border border-red-900/40 bg-red-950/10 p-4 text-sm text-red-500" role="alert"><div className="font-semibold mb-1">Processing Failed</div>{workflow.error}</div>}

      {workflow.result.length > 0 && (
        <div className="mt-6 animate-fade-in rounded-xl border border-line bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3"><Sparkle size={14} weight="fill" /> Completed Locally</div>
          <div className="flex flex-col gap-2">
            {workflow.resultUrls.map((item) => (
              <a key={item.name} download={item.name} href={item.url} className="group flex items-center justify-between rounded-lg border border-line bg-panel p-3 transition-colors hover:border-foreground hover:bg-foreground hover:text-background text-sm font-medium">
                <span className="truncate pr-4">{item.name}</span>
                <CloudArrowDown size={20} className="shrink-0 text-muted group-hover:text-background" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
