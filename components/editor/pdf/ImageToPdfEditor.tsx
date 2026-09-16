"use client";

import { FilePdf, Images } from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";

type ImageToPdfEditorProps = {
  files: File[];
  processing: boolean;
  onProcess: () => void;
};

export default function ImageToPdfEditor({ files, processing, onProcess }: ImageToPdfEditorProps) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  return (
    <section className="image-to-pdf-editor" aria-label="Convert images to PDF">
      <div className="image-to-pdf-heading">
        <div>
          <p className="eyebrow">Images</p>
          <p className="pdf-toolbar-meta">{files.length} image{files.length === 1 ? "" : "s"} ready</p>
        </div>
        <Images size={22} className="text-muted" aria-hidden="true" />
      </div>
      <div className="image-to-pdf-grid">
        {files.map((file, index) => (
          <div className="image-to-pdf-item" key={`${file.name}-${index}`}>
            {urls[index] && <img src={urls[index]} alt="" />} {/* eslint-disable-line @next/next/no-img-element */}
            <span>{file.name}</span>
          </div>
        ))}
      </div>
      <button type="button" className="action-button" onClick={onProcess} disabled={processing}>
        <FilePdf size={17} /> {processing ? "Creating PDF..." : "Create PDF"}
      </button>
    </section>
  );
}
