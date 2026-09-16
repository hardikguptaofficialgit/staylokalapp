"use client";

import { FilePdf, ShieldCheck } from "@phosphor-icons/react";
import { PDFDocument } from "pdf-lib";
import { useEffect, useState } from "react";

type PdfMetadataEditorProps = {
  file?: File;
  processing: boolean;
  onRemove: () => void;
};

type Metadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
};

const emptyMetadata: Metadata = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "" };

export default function PdfMetadataEditor({ file, processing, onRemove }: PdfMetadataEditorProps) {
  const [metadata, setMetadata] = useState<Metadata>(emptyMetadata);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!file) return;
      const document = await PDFDocument.load(await file.arrayBuffer());
      if (active) {
        setMetadata({
          title: document.getTitle() ?? "",
          author: document.getAuthor() ?? "",
          subject: document.getSubject() ?? "",
          keywords: document.getKeywords() ?? "",
          creator: document.getCreator() ?? "",
          producer: document.getProducer() ?? "",
        });
      }
    })();
    return () => { active = false; };
  }, [file]);

  return (
    <section className="pdf-metadata-editor" aria-label="PDF metadata">
      <div className="pdf-metadata-heading">
        <div>
          <p className="eyebrow">Metadata</p>
          <p className="pdf-toolbar-meta">Information embedded in this PDF</p>
        </div>
        <ShieldCheck size={22} className="text-muted" aria-hidden="true" />
      </div>
      <div className="pdf-metadata-grid">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <span>{key}</span>
            <strong>{value || "Not set"}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="control-pill" onClick={onRemove} disabled={processing}>
        <FilePdf size={17} /> {processing ? "Removing..." : "Remove metadata"}
      </button>
    </section>
  );
}
