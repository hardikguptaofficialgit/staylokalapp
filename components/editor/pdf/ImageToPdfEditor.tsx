"use client";

import { FilePdf, Images } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

type ImageToPdfEditorProps = {
  files: File[];
  processing: boolean;
  onProcess: () => void;
};

function ImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  if (failed) {
    return <span className="image-to-pdf-preview-fallback" aria-label={`${file.name} preview unavailable`}>Preview unavailable</span>;
  }
  return <img src={url} alt={`${file.name} preview`} onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

export default function ImageToPdfEditor({ files, processing, onProcess }: ImageToPdfEditorProps) {
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
          <div className="image-to-pdf-item" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
            <ImagePreview file={file} />
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
