"use client";

import { useEffect, useRef, useState } from "react";

type Region = { pageNumber: number; x: number; y: number; width: number; height: number };

type PdfAnnotationEditorProps = {
  file?: File;
  region: Region;
  disabled: boolean;
  onRegionChange: (region: Region) => void;
  overlayText?: string;
  headerText?: string;
  footerText?: string;
  imageOverlay?: string;
};

function clampRegion(region: Region): Region {
  const width = Math.max(4, Math.min(100, region.width));
  const height = Math.max(3, Math.min(100, region.height));
  return {
    ...region,
    width,
    height,
    x: Math.max(0, Math.min(100 - width, region.x)),
    y: Math.max(0, Math.min(100 - height, region.y)),
  };
}

export default function PdfAnnotationEditor({ file, region, disabled, onRegionChange, overlayText, headerText, footerText, imageOverlay }: PdfAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef(region);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const dragRef = useRef<null | {
    mode: "draw" | "move" | "resize";
    startX: number;
    startY: number;
    origin: Region;
  }>(null);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

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
        const viewport = page.getViewport({ scale: 1.2 });
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

  function pointFromEvent(event: React.PointerEvent | PointerEvent) {
    const page = pageRef.current;
    if (!page) return null;
    const bounds = page.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, mode: "draw" | "move" | "resize") {
    if (disabled || rendering) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: point.x,
      startY: point.y,
      origin: regionRef.current,
    };
    if (mode === "draw") {
      onRegionChange({ ...regionRef.current, x: point.x, y: point.y, width: 0, height: 0 });
    }
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const point = pointFromEvent(event);
    if (!drag || !point) return;
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (drag.mode === "move") {
      onRegionChange(clampRegion({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy }));
      return;
    }
    if (drag.mode === "resize") {
      onRegionChange(clampRegion({
        ...drag.origin,
        width: drag.origin.width + dx,
        height: drag.origin.height + dy,
      }));
      return;
    }
    onRegionChange({
      ...drag.origin,
      x: Math.min(drag.startX, point.x),
      y: Math.min(drag.startY, point.y),
      width: Math.abs(point.x - drag.startX),
      height: Math.abs(point.y - drag.startY),
    });
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.mode !== "draw") return;
    const point = pointFromEvent(event);
    if (!point) return;
    onRegionChange(clampRegion({
      ...regionRef.current,
      x: Math.min(drag.startX, point.x),
      y: Math.min(drag.startY, point.y),
      width: Math.max(Math.abs(point.x - drag.startX), 8),
      height: Math.max(Math.abs(point.y - drag.startY), 5),
    }));
  }

  return (
    <div className="pdf-annotation-editor" aria-label="PDF annotation canvas">
      <div className="pdf-annotation-canvas">
        <div
          ref={pageRef}
          className="pdf-annotation-page"
        >
          <canvas ref={canvasRef} aria-label={`PDF page ${region.pageNumber} preview`} />
          {!rendering && !error && (
            <div
              className="pdf-annotation-interaction"
              onPointerDown={(event) => beginDrag(event, "draw")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          )}
          {!rendering && !error && region.width > 1 && region.height > 1 && (
            <div
              className="pdf-annotation-selection"
              style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}
              onPointerDown={(event) => beginDrag(event, "move")}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span
                className="pdf-annotation-handle"
                aria-hidden="true"
                onPointerDown={(event) => beginDrag(event, "resize")}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </div>
          )}
          {overlayText && <span className="pdf-watermark-preview" aria-hidden="true">{overlayText}</span>}
          {headerText && <span className="pdf-header-preview" aria-hidden="true">{headerText}</span>}
          {footerText && <span className="pdf-footer-preview" aria-hidden="true">{footerText}</span>}
          {imageOverlay ? (
            <img
              className="pdf-image-overlay"
              src={imageOverlay}
              alt=""
              style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}
            />
          ) : null}
          {rendering && <span className="pdf-annotation-status">Rendering page…</span>}
          {error && <span className="pdf-annotation-status" role="alert">{error}</span>}
        </div>
      </div>
      <p className="pdf-annotation-hint">
        {disabled
          ? "Full page preview. Scroll the page to see the bottom."
          : "Drag empty page to draw a box. Drag the red box to move it anywhere, including the bottom. Pull the corner to resize."}
      </p>
    </div>
  );
}
