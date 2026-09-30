"use client";

import OrderedFileList from "@/components/editor/OrderedFileList";
import { acceptedFileQueueItems } from "@/lib/app/accepted-file-queue";
import { FilePdf, Images } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

type ImageToPdfEditorProps = {
  files: File[];
  accept: readonly string[];
  processing: boolean;
  onMoveFile: (fromIndex: number, toIndex: number) => void;
  onProcess: () => void;
};

function ImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  if (failed) {
    return <span className="image-to-pdf-preview-fallback" aria-label={`${file.name} preview unavailable`}>Preview unavailable</span>;
  }
  return <img src={url} alt="" onError={() => setFailed(true)} />; // eslint-disable-line @next/next/no-img-element
}

export default function ImageToPdfEditor({ files, accept, processing, onMoveFile, onProcess }: ImageToPdfEditorProps) {
  const queueItems = acceptedFileQueueItems(files, accept);

  return (
    <section className="image-to-pdf-editor" aria-label="Convert images to PDF">
      <div className="image-to-pdf-heading">
        <div>
          <p className="eyebrow">Images</p>
          <p className="pdf-toolbar-meta">{queueItems.length} image{queueItems.length === 1 ? "" : "s"} · first image = first PDF page</p>
        </div>
        <Images size={22} className="text-muted" aria-hidden="true" />
      </div>

      <OrderedFileList
        items={queueItems}
        onMove={onMoveFile}
        variant="grid"
        hint="Page order matches this list. Reorder before creating the PDF."
        renderThumbnail={(file) => <ImagePreview file={file} />}
      />

      {queueItems.length === 1 && (
        <div className="image-to-pdf-grid">
          <div className="image-to-pdf-item">
            <ImagePreview file={queueItems[0].file} />
            <span>{queueItems[0].file.name}</span>
          </div>
        </div>
      )}

      <button type="button" className="action-button" onClick={onProcess} disabled={processing || queueItems.length === 0}>
        <FilePdf size={17} /> {processing ? "Creating PDF..." : "Create PDF"}
      </button>
    </section>
  );
}
