"use client";

import { PenNib, UploadSimple, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PdfAnnotationEditor from "./PdfAnnotationEditor";

type PdfSignatureEditorProps = {
  file?: File;
  processing: boolean;
  onProcess: (options: Record<string, string | number | boolean>) => void;
};

function pointerPosition(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function SignatureDrawModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  function resetPad() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  useEffect(() => {
    if (!open) return;
    resetPad();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    lastPoint.current = pointerPosition(canvas, event.nativeEvent);
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !lastPoint.current) return;
    const next = pointerPosition(canvas, event.nativeEvent);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 3.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPoint.current = next;
    setHasInk(true);
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function clearPad() {
    resetPad();
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    onSave(canvas.toDataURL("image/png"));
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="pdf-signature-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="pdf-signature-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-signature-draw-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="pdf-signature-modal-header">
          <h2 id="pdf-signature-draw-title">Draw your signature</h2>
          <button type="button" className="pdf-signature-modal-close" onClick={onClose} aria-label="Close signature pad">
            <X size={18} />
          </button>
        </header>
        <p className="pdf-signature-modal-hint">Sign on the white pad with dark ink. Stays on this device only.</p>
        <div className="pdf-signature-pad-shell">
          <canvas
            ref={canvasRef}
            width={720}
            height={240}
            className="pdf-signature-pad"
            aria-label="Signature drawing pad"
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
          />
        </div>
        <footer className="pdf-signature-modal-footer">
          <button type="button" className="control-pill" onClick={clearPad} disabled={!hasInk}>
            Clear
          </button>
          <button type="button" className="control-pill" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="action-button pdf-signature-modal-save" onClick={save} disabled={!hasInk}>
            Use signature
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default function PdfSignatureEditor({ file, processing, onProcess }: PdfSignatureEditorProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState("");
  const [imageType, setImageType] = useState("image/png");
  const [region, setRegion] = useState({ pageNumber: 1, x: 52, y: 72, width: 30, height: 14 });
  const [drawOpen, setDrawOpen] = useState(false);

  const setSignatureFromDataUrl = useCallback((dataUrl: string, type = "image/png") => {
    setImageData(dataUrl);
    setImageType(type);
  }, []);

  async function chooseImage(selected?: File) {
    if (!selected || !/^image\/(png|jpeg)$/.test(selected.type)) return;
    setSignatureFromDataUrl(await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(selected);
    }), selected.type);
  }

  return (
    <section className="pdf-advanced-editor pdf-signature-editor" aria-label="Sign PDF">
      <div className="pdf-advanced-icon"><PenNib size={26} aria-hidden="true" /></div>
      <div className="pdf-signature-editor-body">
        <p className="eyebrow">PDF tool</p>
        <h4>Sign PDF</h4>
        <p>Place a visual signature on the page. Drag the red box to size and position it — same as highlight and redact tools. Not a cryptographic certificate.</p>
        {file && <small>{file.name}</small>}

        <div className="pdf-export-options" aria-label="Signature placement">
          <div className="pdf-signature-actions">
            <button type="button" className="control-pill pdf-signature-draw-trigger" onClick={() => setDrawOpen(true)} disabled={processing}>
              <PenNib size={16} weight="duotone" /> Draw signature
            </button>
            <button type="button" className="control-pill" onClick={() => uploadRef.current?.click()} disabled={processing}>
              <UploadSimple size={15} /> Upload image
            </button>
            <input ref={uploadRef} type="file" accept="image/png,image/jpeg" className="pdf-signature-file-input" tabIndex={-1} onChange={(event) => void chooseImage(event.target.files?.[0])} disabled={processing} />
            {imageData && (
              <div className="pdf-signature-chip">
                <img src={imageData} alt="Current signature" /> {/* eslint-disable-line @next/next/no-img-element */}
                <button type="button" className="pdf-signature-chip-clear" onClick={() => setImageData("")} disabled={processing} aria-label="Remove signature">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {file && (
            <PdfAnnotationEditor
              file={file}
              region={region}
              disabled={processing}
              onRegionChange={setRegion}
              imageOverlay={imageData}
            />
          )}

          <div className="pdf-annotation-precision">
            {(["pageNumber", "x", "y", "width", "height"] as const).map((field) => (
              <label key={field}>
                <span>{field === "pageNumber" ? "Page" : `${field} %`}</span>
                <input
                  type="number"
                  min={field === "pageNumber" ? 1 : 0}
                  max={field === "pageNumber" ? undefined : 100}
                  value={region[field]}
                  onChange={(event) => setRegion({
                    ...region,
                    [field]: field === "pageNumber"
                      ? Math.max(1, Number(event.target.value) || 1)
                      : Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                  })}
                  disabled={processing}
                />
              </label>
            ))}
          </div>
          <small>Drag on the page preview to move and resize the signature area.</small>
        </div>
      </div>

      <button
        type="button"
        className="action-button"
        onClick={() => onProcess({ imageData, imageType, ...region })}
        disabled={processing || !imageData}
      >
        {processing ? "Processing..." : "Apply signature"}
      </button>

      <SignatureDrawModal
        open={drawOpen}
        onClose={() => setDrawOpen(false)}
        onSave={(dataUrl) => setSignatureFromDataUrl(dataUrl)}
      />
    </section>
  );
}
