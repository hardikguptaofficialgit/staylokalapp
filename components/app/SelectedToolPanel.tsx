import { ArrowLeft, ArrowUp, CloudArrowDown, Sparkle } from "@phosphor-icons/react";
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
import { AudioEditor, VideoEditor, type VideoEditorAction } from "@/components/editor/media";
import type { AppWorkflow } from "./types";
import { matchesAcceptedFile } from "@/lib/tools/validation";
import WorkspaceSidebar from "./WorkspaceSidebar";

export default function SelectedToolPanel({ workflow, inputRef }: { workflow: AppWorkflow; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const selected = workflow.selected;
  if (!selected) return null;

  return (
    <div className="selected-tool-panel mx-auto w-full max-w-[1000px] rounded-xl border border-line bg-panel p-3 sm:p-4">
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
            ) : ["pdf-to-jpg", "pdf-to-png", "pdf-ocr", "pdf-compress", "pdf-watermark", "pdf-page-numbers", "pdf-add-text", "pdf-header-footer", "pdf-flatten", "pdf-privacy", "pdf-redact", "pdf-highlight", "pdf-shape", "pdf-remove-blank", "pdf-duplicate-page"].includes(selected.id) && !workflow.oversizedInput ? (
              <PdfAdvancedEditor
                operation={selected.id as "pdf-to-jpg" | "pdf-to-png" | "pdf-ocr" | "pdf-compress" | "pdf-watermark" | "pdf-page-numbers" | "pdf-add-text" | "pdf-header-footer" | "pdf-flatten" | "pdf-privacy" | "pdf-redact" | "pdf-highlight" | "pdf-shape" | "pdf-remove-blank" | "pdf-duplicate-page"}
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

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && !selected.id.startsWith("spreadsheet-") && !selected.id.startsWith("archive-") && (
        <DocumentEditor file={workflow.activeFile} />
      )}

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && selected.id.startsWith("spreadsheet-") && (
        <SpreadsheetEditor
          file={workflow.activeFile}
          options={workflow.options}
          onOptionsChange={workflow.setOptions}
        />
      )}

      {selected.kind === "document" && workflow.activeFile && !workflow.oversizedInput && selected.id.startsWith("archive-") && (
        <ArchiveEditor
          file={workflow.activeFile}
          options={workflow.options}
          onOptionsChange={workflow.setOptions}
        />
      )}

      {selected.id === "audio-trim" && workflow.activeFile && !workflow.oversizedInput && (
        <AudioEditor
          key={selected.id}
          source={workflow.activeFile}
          fileName={workflow.activeFile.name}
          onAction={(action) => workflow.processWithOptions({ start: action.start, duration: action.duration })}
          onReplace={workflow.replaceActiveFile}
          progress={workflow.status === "processing" ? { ...workflow.progress, operation: "audio-trim" } : undefined}
          onCancel={workflow.cancelProcessing}
          disabled={workflow.status === "processing"}
        />
      )}

      {["trim", "cut", "split", "speed", "frames"].includes(selected.id) && workflow.activeFile && !workflow.oversizedInput && (
        <VideoEditor
          key={selected.id}
          source={workflow.activeFile}
          fileName={workflow.activeFile.name}
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

      {!workflow.oversizedInput && selected.kind !== "image" && selected.kind !== "pdf" && selected.id !== "audio-trim" && !["trim", "cut", "split", "speed", "frames"].includes(selected.id) && selected.options.length > 0 && (
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

      {selected.kind !== "pdf" && !["audio-trim", "trim", "cut", "split", "speed", "frames"].includes(selected.id) && <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => void workflow.processWithOptions()} disabled={workflow.status === "processing"} className="action-button flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50">
          {workflow.status === "processing"
            ? "Processing File..."
            : selected.id === "spreadsheet-csv"
              ? "Export CSV"
              : selected.id === "archive-extract"
                ? "Extract File"
                : "Run Tool"}
          {workflow.status !== "processing" && <ArrowUp size={18} weight="bold" />}
        </button>
        {workflow.status === "processing" && <button type="button" onClick={workflow.cancelProcessing} className="control-pill justify-center sm:w-32" aria-label="Cancel processing">Cancel</button>}
      </div>}

      {workflow.status === "processing" && (
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
