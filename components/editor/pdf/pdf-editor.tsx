"use client";

import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProcessedFile } from "@/lib/tools/types";
import PdfWorkspace from "./PdfWorkspace";
import type { PdfPage, PdfWorkflow } from "./types";

type PdfEditorProps = {
  files: File[];
  workflow: PdfWorkflow;
  onComplete: (files: ProcessedFile[]) => void;
  onError: (message: string) => void;
  onProgress: (event: { ratio: number; label: string }) => void;
  onProcessingChange: (processing: boolean) => void;
};

function pdfBlob(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
}

async function pagePreview(source: PDFDocument, pageIndex: number) {
  const preview = await PDFDocument.create();
  const [page] = await preview.copyPages(source, [pageIndex]);
  page.setRotation(degrees(0));
  preview.addPage(page);
  return URL.createObjectURL(pdfBlob(Uint8Array.from(await preview.save())));
}

export default function PdfEditor({
  files,
  workflow,
  onComplete,
  onError,
  onProgress,
  onProcessingChange,
}: PdfEditorProps) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [selected, setSelected] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([0]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState<"individual" | "zip">("individual");
  const [splitRange, setSplitRange] = useState("");
  const loadGeneration = useRef(0);
  const exportController = useRef<AbortController | null>(null);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    const controller = new AbortController();
    const createdUrls: string[] = [];
    queueMicrotask(() => {
      if (generation !== loadGeneration.current) return;
      setLoading(true);
      setMessage("");
      setSelected(0);
      setSelectedPages([0]);
      setPages([]);
    });

    void (async () => {
      const next: PdfPage[] = [];
      try {
        for (let sourceIndex = 0; sourceIndex < files.length; sourceIndex += 1) {
          const source = await PDFDocument.load(await files[sourceIndex].arrayBuffer());
          for (let pageIndex = 0; pageIndex < source.getPageCount(); pageIndex += 1) {
            if (controller.signal.aborted || generation !== loadGeneration.current) return;
            const previewUrl = await pagePreview(source, pageIndex);
            createdUrls.push(previewUrl);
            next.push({
              id: `${sourceIndex}:${pageIndex}`,
              sourceIndex,
              pageIndex,
              label: files.length > 1 ? `${sourceIndex + 1} · ${pageIndex + 1}` : `${pageIndex + 1}`,
              rotation: 0,
              previewUrl,
            });
          }
        }
        if (!controller.signal.aborted && generation === loadGeneration.current) setPages(next);
      } catch {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        setMessage("This PDF could not be rendered locally.");
      } finally {
        if (generation === loadGeneration.current) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    if (!processing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exportController.current?.abort();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [processing]);

  const visiblePages = useMemo(() => pages.filter(Boolean), [pages]);

  function updatePage(update: (page: PdfPage) => PdfPage) {
    setPages((currentPages) => currentPages.map((page, index) => index === selected ? update(page) : page));
  }

  function rotatePage() {
    updatePage((page) => ({ ...page, rotation: (page.rotation + 90) % 360 }));
  }

  function deletePage() {
    if (pages.length <= 1) {
      setMessage("Keep at least one page in the document.");
      return;
    }
    URL.revokeObjectURL(pages[selected].previewUrl);
    setPages((currentPages) => currentPages.filter((_, index) => index !== selected));
    setSelected((index) => Math.min(index, pages.length - 2));
    setSelectedPages((current) => current.filter((index) => index !== selected).map((index) => index > selected ? index - 1 : index));
  }

  function movePage(direction: -1 | 1) {
    const target = selected + direction;
    if (target < 0 || target >= pages.length) return;
    setPages((currentPages) => {
      const next = [...currentPages];
      [next[selected], next[target]] = [next[target], next[selected]];
      return next;
    });
    setSelected(target);
  }

  function parseSplitRange(value: string) {
    if (!value.trim()) return pages.map((_, index) => index);
    const indices = new Set<number>();
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Math.min(Number(range[1]), Number(range[2]));
        const end = Math.max(Number(range[1]), Number(range[2]));
        for (let page = start; page <= end; page += 1) indices.add(page - 1);
      } else if (/^\d+$/.test(trimmed)) {
        indices.add(Number(trimmed) - 1);
      }
    }
    return [...indices].filter((index) => index >= 0 && index < pages.length).sort((a, b) => a - b);
  }

  async function exportDocument(splitAsZip = false) {
    if (!pages.length) return;
    const controller = new AbortController();
    exportController.current = controller;
    setProcessing(true);
    onProcessingChange(true);
    setMessage("");
    try {
      const output = await PDFDocument.create();
      const sourceDocuments: PDFDocument[] = [];
      for (let sourceIndex = 0; sourceIndex < files.length; sourceIndex += 1) {
        if (controller.signal.aborted) throw new Error("cancelled");
        sourceDocuments.push(await PDFDocument.load(await files[sourceIndex].arrayBuffer()));
      }
      const split = workflow === "pdf-split";
      const outputs: ProcessedFile[] = [];
      const exportPages = workflow === "pdf-split"
        ? pages.filter((_, index) => parseSplitRange(splitRange).includes(index))
        : workflow === "pdf-extract"
        ? pages.filter((_, index) => selectedPages.includes(index))
        : pages;
      if ((workflow === "pdf-extract" || workflow === "pdf-split") && exportPages.length === 0) {
        throw new Error(workflow === "pdf-split" ? "Enter at least one valid page or range." : "Select at least one page to extract.");
      }
      for (let index = 0; index < exportPages.length; index += 1) {
        if (controller.signal.aborted) throw new Error("cancelled");
        const descriptor = exportPages[index];
        const destination = split ? await PDFDocument.create() : output;
        const [page] = await destination.copyPages(sourceDocuments[descriptor.sourceIndex], [descriptor.pageIndex]);
        page.setRotation(degrees(descriptor.rotation));
        destination.addPage(page);
        if (split) {
          outputs.push({
            blob: pdfBlob(Uint8Array.from(await destination.save())),
            type: "application/pdf",
            name: `page-${index + 1}.pdf`,
          });
        }
        onProgress({ ratio: (index + 1) / exportPages.length, label: `Prepared page ${index + 1} of ${exportPages.length}` });
      }
      if (split && splitAsZip) {
        const zip = new JSZip();
        outputs.forEach((output) => zip.file(output.name, output.blob));
        onComplete([{
          blob: await zip.generateAsync({ type: "blob" }),
          type: "application/zip",
          name: `${files[0].name.replace(/\.pdf$/i, "")}-split.zip`,
        }]);
      } else if (!split) {
        outputs.push({
          blob: pdfBlob(Uint8Array.from(await output.save())),
          type: "application/pdf",
          name: workflow === "pdf-rotate" ? "rotated-pdf.pdf" : workflow === "pdf-extract" ? "extracted-pages.pdf" : workflow === "pdf-delete-pages" ? "pages-removed.pdf" : workflow === "pdf-reorder" ? "reordered-pages.pdf" : "merged-pdf.pdf",
        });
      }
      onComplete(outputs);
    } catch (error) {
      onError(error instanceof Error && error.message === "cancelled" ? "Processing cancelled." : "The PDF could not be exported locally.");
    } finally {
      exportController.current = null;
      setProcessing(false);
      onProcessingChange(false);
    }
  }

  if (loading) return <div className="pdf-editor-loading" role="status">Rendering PDF pages locally…</div>;
  if (message && !pages.length) return <div className="pdf-editor-error" role="alert">{message}</div>;

  return (
    <PdfWorkspace
      workflow={workflow}
      pages={visiblePages}
      selected={selected}
      processing={processing}
      message={message}
      onSelect={setSelected}
      selectedPages={selectedPages}
      onTogglePage={(index) => setSelectedPages((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}
      onMove={movePage}
      onRotate={rotatePage}
      onDelete={deletePage}
      onCancel={() => exportController.current?.abort()}
      onExport={(splitAsZip) => void exportDocument(splitAsZip)}
      splitMode={splitMode}
      splitRange={splitRange}
      onSplitModeChange={setSplitMode}
      onSplitRangeChange={setSplitRange}
    />
  );
}
