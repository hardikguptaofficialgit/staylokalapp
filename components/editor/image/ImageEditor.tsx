"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import imageProcessor from "@/lib/tools/image";

type EditorOptions = Record<string, string | number | boolean>;

type ImageEditorProps = {
  file: File;
  operation: string;
  options: EditorOptions;
  onOptionsChange: (options: EditorOptions) => void;
};

type Crop = { x: number; y: number; width: number; height: number };
type Drag = { handle: string; startX: number; startY: number; crop: Crop };

const MIN_CROP = 24;

function clampCrop(crop: Crop, imageWidth: number, imageHeight: number): Crop {
  const width = Math.max(MIN_CROP, Math.min(crop.width, imageWidth));
  const height = Math.max(MIN_CROP, Math.min(crop.height, imageHeight));
  return {
    width,
    height,
    x: Math.max(0, Math.min(crop.x, imageWidth - width)),
    y: Math.max(0, Math.min(crop.y, imageHeight - height)),
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImageEditor({ file, operation, options, onOptionsChange }: ImageEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [previewBytes, setPreviewBytes] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const initialOptions = useRef({ width: options.width, height: options.height });

  const isCrop = operation === "image-crop";
  const isResize = operation === "image-process" || operation === "image-thumbnail" || operation === "image-upscale";

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      const requestedWidth = Number(initialOptions.current.width) || nextImage.naturalWidth;
      const requestedHeight = Number(initialOptions.current.height) || nextImage.naturalHeight;
      const initialCrop = isCrop
        ? clampCrop({
          x: Math.max(0, (nextImage.naturalWidth - requestedWidth) / 2),
          y: Math.max(0, (nextImage.naturalHeight - requestedHeight) / 2),
          width: requestedWidth,
          height: requestedHeight,
        }, nextImage.naturalWidth, nextImage.naturalHeight)
        : { x: 0, y: 0, width: nextImage.naturalWidth, height: nextImage.naturalHeight };
      setImage(nextImage);
      setSourceUrl(url);
      setCrop(initialCrop);
      setError("");
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(url);
      setError("This image could not be previewed in the browser.");
    };
    nextImage.src = url;
    return () => {
      URL.revokeObjectURL(url);
      setImage(null);
      setSourceUrl(null);
      setCrop(null);
    };
  }, [file, isCrop]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const previewOptions = useMemo(() => ({ ...options, operation }), [operation, options]);

  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    const controller = new AbortController();
    void imageProcessor([file], previewOptions, {
      signal: controller.signal,
      onProgress: () => undefined,
    }).then(([result]) => {
      if (cancelled || !result) return;
      setPreviewBytes(result.blob.size);
      const url = URL.createObjectURL(result.blob);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      setError("");
    }).catch((cause: unknown) => {
      if (!cancelled && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "The image preview could not be generated.");
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [file, image, previewOptions]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const display = useMemo(() => {
    if (!image) return { scale: 1, left: 0, top: 0 };
    const scale = Math.min(stageSize.width / image.naturalWidth, stageSize.height / image.naturalHeight, 1);
    return {
      scale,
      left: (stageSize.width - image.naturalWidth * scale) / 2,
      top: (stageSize.height - image.naturalHeight * scale) / 2,
    };
  }, [image, stageSize]);

  function updateOptions(changes: EditorOptions) {
    onOptionsChange({ ...options, ...changes });
  }

  function applyCrop(next: Crop) {
    setCrop(next);
    if (isCrop) {
      updateOptions({
        width: Math.round(next.width),
        height: Math.round(next.height),
        cropX: Math.round(next.x),
        cropY: Math.round(next.y),
      });
    }
  }

  function updateCropFromPointer(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !image || !crop) return;
    const dx = (event.clientX - drag.startX) / display.scale;
    const dy = (event.clientY - drag.startY) / display.scale;
    const next = { ...drag.crop };
    if (drag.handle.includes("e")) next.width += dx;
    if (drag.handle.includes("s")) next.height += dy;
    if (drag.handle.includes("w")) {
      next.x += dx;
      next.width -= dx;
    }
    if (drag.handle.includes("n")) {
      next.y += dy;
      next.height -= dy;
    }
    applyCrop(clampCrop(next, image.naturalWidth, image.naturalHeight));
  }

  function beginCrop(event: React.PointerEvent<HTMLButtonElement>, handle: string) {
    if (!crop) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { handle, startX: event.clientX, startY: event.clientY, crop };
    const stop = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", updateCropFromPointer);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", updateCropFromPointer);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  }

  function moveCropHandle(handle: string, dx: number, dy: number) {
    if (!image || !crop) return;
    const step = 10;
    const next = { ...crop };
    if (handle.includes("e")) next.width += dx * step;
    if (handle.includes("s")) next.height += dy * step;
    if (handle.includes("w")) {
      next.x += dx * step;
      next.width -= dx * step;
    }
    if (handle.includes("n")) {
      next.y += dy * step;
      next.height -= dy * step;
    }
    applyCrop(clampCrop(next, image.naturalWidth, image.naturalHeight));
  }

  function setCropDimension(key: "width" | "height", value: number) {
    if (!image || !crop || !Number.isFinite(value)) return;
    applyCrop(clampCrop({ ...crop, [key]: value }, image.naturalWidth, image.naturalHeight));
  }

  function resetCrop() {
    if (!image) return;
    applyCrop({ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
  }

  if (error && !image) return <p className="rounded-xl border border-red-900/40 p-4 text-sm text-red-500">{error}</p>;

  const cropStyle = crop && display.scale > 0 ? {
    left: display.left + crop.x * display.scale,
    top: display.top + crop.y * display.scale,
    width: crop.width * display.scale,
    height: crop.height * display.scale,
  } : undefined;
  const displayedUrl = isCrop ? sourceUrl : previewUrl || sourceUrl;

  return (
    <section aria-label="Image editor" className="mb-10 space-y-5">
      <div ref={stageRef} className="relative h-[min(58vw,460px)] min-h-64 overflow-hidden rounded-2xl border border-line bg-black/10 touch-none">
        {displayedUrl && <img src={displayedUrl} className="absolute inset-0 m-auto max-h-full max-w-full object-contain" alt="Image preview" />} {/* eslint-disable-line @next/next/no-img-element */}
        {isCrop && cropStyle && (
          <div className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,.5)]" style={cropStyle}>
            {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
              <button
                key={handle}
                type="button"
                aria-label={`Resize crop ${handle}`}
                onPointerDown={(event) => beginCrop(event, handle)}
                onKeyDown={(event) => {
                  const deltas: Record<string, [number, number]> = {
                    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                  };
                  const delta = deltas[event.key];
                  if (delta) {
                    event.preventDefault();
                    moveCropHandle(handle, delta[0], delta[1]);
                  }
                }}
                className={`pointer-events-auto absolute size-11 -m-[1.375rem] rounded-full border-2 border-black bg-white ${handle.includes("n") ? "top-0" : handle.includes("s") ? "bottom-0" : "top-1/2 -translate-y-1/2"} ${handle.includes("w") ? "left-0" : handle.includes("e") ? "right-0" : "left-1/2 -translate-x-1/2"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {operation === "image-rotate" && (
          <label className="text-sm font-medium">Rotation
            <select className="field ml-2" value={String(options.angle || "90")} onChange={(event) => updateOptions({ angle: event.target.value })}>
              <option value="90">90°</option><option value="180">180°</option><option value="270">270°</option>
            </select>
          </label>
        )}
        {operation === "image-flip" && (
          <label className="text-sm font-medium">Direction
            <select className="field ml-2" value={String(options.flip || "hflip")} onChange={(event) => updateOptions({ flip: event.target.value })}>
              <option value="hflip">Horizontal</option><option value="vflip">Vertical</option>
            </select>
          </label>
        )}
        {isCrop && <button type="button" className="control-pill min-h-11" onClick={resetCrop}>Reset crop</button>}
      </div>

      {operation === "image-watermark" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Text
            <input className="field mt-2" value={String(options.text || "")} onChange={(event) => updateOptions({ text: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Font size
            <input className="field mt-2" type="number" min={8} max={96} value={Number(options.fontSize) || 12} onChange={(event) => updateOptions({ fontSize: Number(event.target.value) })} />
          </label>
          <label className="block text-sm font-medium">Opacity
            <input className="field mt-2" type="number" min={0} max={1} step={0.05} value={Number(options.opacity) || 0.6} onChange={(event) => updateOptions({ opacity: Number(event.target.value) })} />
          </label>
          <label className="block text-sm font-medium">Position
            <select className="field mt-2" value={String(options.position || "bottom-right")} onChange={(event) => updateOptions({ position: event.target.value })}>
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
              <option value="center">Center</option>
            </select>
          </label>
        </div>
      )}
      {operation === "image-meme" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Top text
            <input className="field mt-2" value={String(options.topText || "")} onChange={(event) => updateOptions({ topText: event.target.value })} />
          </label>
          <label className="text-sm font-medium">Bottom text
            <input className="field mt-2" value={String(options.bottomText || "")} onChange={(event) => updateOptions({ bottomText: event.target.value })} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Font size
            <input className="field mt-2 max-w-xs" type="number" min={8} max={96} value={Number(options.fontSize) || 36} onChange={(event) => updateOptions({ fontSize: Number(event.target.value) })} />
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {(isCrop || isResize) && <label className="text-sm font-medium">Width
          <input className="field mt-2" type="number" min={1} value={Math.round(crop?.width ?? 0)} onChange={(event) => setCropDimension("width", Number(event.target.value))} />
        </label>}
        {isCrop && <label className="text-sm font-medium">Height
          <input className="field mt-2" type="number" min={1} value={Math.round(crop?.height ?? 0)} onChange={(event) => setCropDimension("height", Number(event.target.value))} />
        </label>}
        {operation === "image-process" && <label className="text-sm font-medium">Quality
          <input className="field mt-2" type="number" min={0.1} max={1} step={0.05} value={Math.min(1, Number(options.quality) || 0.85)} onChange={(event) => updateOptions({ quality: Number(event.target.value) })} />
        </label>}
      </div>
      <label className="block max-w-xs text-sm font-medium">Output format
        <select className="field mt-2" value={String(options.format || "image/jpeg")} onChange={(event) => updateOptions({ format: event.target.value })}>
          <option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>
        </select>
      </label>
      {isCrop && previewUrl && <div className="rounded-xl border border-line bg-background p-3">
        <p className="mb-2 text-xs font-medium text-muted">Processed output preview</p>
        <img src={previewUrl} className="max-h-48 max-w-full rounded-lg object-contain" alt="Processed crop preview" /> {/* eslint-disable-line @next/next/no-img-element */}
      </div>}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted" aria-live="polite">
        <span>{crop ? `${Math.round(crop.width)} × ${Math.round(crop.height)} px` : "Loading preview…"}</span>
        <span>Preview: {previewBytes === null ? "…" : formatBytes(previewBytes)}{previewUrl ? " · local" : ""}</span>
      </div>
      {(isResize || isCrop) && <p className="text-xs text-muted">Drag the crop handles for a precise region. Arrow keys move focused handles by 10 pixels.</p>}
    </section>
  );
}
