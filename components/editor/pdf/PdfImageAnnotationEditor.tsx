"use client";

import { useState } from "react";
import PdfAnnotationEditor from "./PdfAnnotationEditor";

type PdfImageAnnotationEditorProps = {
  file?: File;
  processing: boolean;
  onProcess: (options: Record<string, string | number | boolean>) => void;
};

export default function PdfImageAnnotationEditor({ file, processing, onProcess }: PdfImageAnnotationEditorProps) {
  const [imageData, setImageData] = useState("");
  const [imageType, setImageType] = useState("");
  const [region, setRegion] = useState({ pageNumber: 1, x: 10, y: 10, width: 30, height: 30 });

  async function chooseImage(selected?: File) {
    if (!selected || !/^image\/(png|jpeg)$/.test(selected.type)) return;
    setImageType(selected.type);
    setImageData(await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(selected);
    }));
  }

  return (
    <section className="pdf-advanced-editor" aria-label="Add image annotation">
      <div className="pdf-advanced-icon">IMG</div>
      <div className="pdf-form-editor-content">
        <p className="eyebrow">PDF tool</p>
        <h4>Add image annotation</h4>
        <p>Choose a local JPG or PNG, then drag its placement on the rendered page.</p>
        {file && <PdfAnnotationEditor file={file} region={region} disabled={processing} onRegionChange={setRegion} imageOverlay={imageData} />}
        <label className="pdf-image-picker">
          <span>Image</span>
          <input type="file" accept="image/png,image/jpeg" onChange={(event) => void chooseImage(event.target.files?.[0])} disabled={processing} />
        </label>
        {imageData && <div className="pdf-image-annotation-preview"><img src={imageData} alt="Selected annotation preview" /></div>}
        <div className="pdf-annotation-precision">
          <label><span>Page</span><input type="number" min={1} value={region.pageNumber} onChange={(event) => setRegion({ ...region, pageNumber: Math.max(1, Number(event.target.value) || 1) })} disabled={processing} /></label>
          {(["x", "y", "width", "height"] as const).map((field) => (
            <label key={field}><span>{field} %</span><input type="number" min={1} max={100} value={region[field]} onChange={(event) => setRegion({ ...region, [field]: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })} disabled={processing} /></label>
          ))}
        </div>
        <button type="button" className="action-button" onClick={() => onProcess({ imageData, imageType, ...region })} disabled={processing || !imageData}>
          {processing ? "Processing..." : "Add image"}
        </button>
      </div>
    </section>
  );
}
