"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type PdfPagePreviewProps = {
  previewUrl: string;
  title: string;
  className: string;
  style?: CSSProperties;
};

export default function PdfPagePreview({ previewUrl, title, className, style }: PdfPagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const document = await pdfjs.getDocument({ url: previewUrl }).promise;
        const page = await document.getPage(1);
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) return;
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
        if (cancelled) renderTask.cancel();
      } catch {
        if (!cancelled && canvasRef.current) {
          const context = canvasRef.current.getContext("2d");
          if (context) {
            context.fillStyle = "#f4f4f4";
            context.fillRect(0, 0, canvasRef.current.width || 1, canvasRef.current.height || 1);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [previewUrl]);

  return <canvas ref={canvasRef} aria-label={title} className={className} style={style} />;
}
