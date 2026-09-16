"use client";

import { useEffect, useRef, useState } from "react";

type PdfAnnotationEditorProps = {
  file?: File;
  region: { pageNumber: number; x: number; y: number; width: number; height: number };
  disabled: boolean;
  onRegionChange: (region: PdfAnnotationEditorProps["region"]) => void;
  overlayText?: string;
  headerText?: string;
  footerText?: string;
  imageOverlay?: string;
};

export default function PdfAnnotationEditor({ file, region, disabled, onRegionChange, overlayText, headerText, footerText, imageOverlay }: PdfAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!file || !canvasRef.current) return;
      setRendering(true);
      setError("");
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await document.getPage(Math.min(region.pageNumber || 1, document.numPages));
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        if (!active || !canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      } catch {
        if (active) setError("This PDF page could not be rendered locally.");
      } finally {
        if (active) setRendering(false);
      }
    })();
    return () => { active = false; };
  }, [file, region.pageNumber]);

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return null;
    const bounds = frame.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  }

  function startSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const point = pointFromEvent(event);
    if (!point) return;
    startRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    onRegionChange({ ...region, x: point.x, y: point.y, width: 0, height: 0 });
  }

  function updateSelection(event: React.PointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    const point = pointFromEvent(event);
    if (!start || !point) return;
    onRegionChange({
      ...region,
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function finishSelection(event: React.PointerEvent<HTMLDivElement>) {
    updateSelection(event);
    startRef.current = null;
  }

  return (
    <div className="pdf-annotation-editor" aria-label="PDF annotation canvas">
      <div
        ref={frameRef}
        className="pdf-annotation-canvas"
        onPointerDown={startSelection}
        onPointerMove={updateSelection}
        onPointerUp={finishSelection}
        onPointerCancel={finishSelection}
      >
        <canvas ref={canvasRef} aria-label={`PDF page ${region.pageNumber} preview`} />
        <div
          className="pdf-annotation-selection"
          style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}
          aria-hidden="true"
        />
        {overlayText && <span className="pdf-watermark-preview" aria-hidden="true">{overlayText}</span>}
        {headerText && <span className="pdf-header-preview" aria-hidden="true">{headerText}</span>}
        {footerText && <span className="pdf-footer-preview" aria-hidden="true">{footerText}</span>}
        {imageOverlay && <img className="pdf-image-overlay" src={imageOverlay} alt="" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }} />}
        {rendering && <span className="pdf-annotation-status">Rendering page…</span>}
        {error && <span className="pdf-annotation-status" role="alert">{error}</span>}
      </div>
      <p className="pdf-annotation-hint">Drag on the page to select the region. Coordinates below remain available for precise adjustment.</p>
    </div>
  );
}
