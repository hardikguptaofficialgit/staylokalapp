"use client";

import { FileArrowDown, FilePdf, Images, Scan } from "@phosphor-icons/react";
import { useState } from "react";
import PdfAnnotationEditor from "./PdfAnnotationEditor";

type PdfAdvancedEditorProps = {
  operation: "pdf-to-jpg" | "pdf-to-png" | "pdf-contact-sheet" | "pdf-crop" | "pdf-page-size" | "pdf-ocr" | "pdf-compress" | "pdf-watermark" | "pdf-page-numbers" | "pdf-add-text" | "pdf-header-footer" | "pdf-flatten" | "pdf-privacy" | "pdf-redact" | "pdf-highlight" | "pdf-shape" | "pdf-remove-blank" | "pdf-duplicate-page";
  file?: File;
  processing: boolean;
  onProcess: (options?: Record<string, string | number | boolean>) => void;
};

const details = {
  "pdf-to-jpg": { icon: Images, label: "Export JPG pages", description: "Each PDF page becomes a separate JPG download." },
  "pdf-to-png": { icon: Images, label: "Export PNG pages", description: "Each PDF page becomes a separate PNG download." },
  "pdf-contact-sheet": { icon: Images, label: "Create contact sheet", description: "Arrange every PDF page into a visual overview locally." },
  "pdf-crop": { icon: Images, label: "Crop PDF pages", description: "Crop every page to a selected region without rasterizing the document." },
  "pdf-page-size": { icon: Images, label: "Resize PDF pages", description: "Fit every page to a standard paper size without rasterizing." },
  "pdf-ocr": { icon: Scan, label: "OCR searchable PDF", description: "Run English OCR locally and download text plus a searchable PDF." },
  "pdf-compress": { icon: FileArrowDown, label: "Compress PDF", description: "Optimize streams locally and report only a smaller result." },
  "pdf-watermark": { icon: FilePdf, label: "Add watermark", description: "Stamp every page with your own text locally." },
  "pdf-page-numbers": { icon: FilePdf, label: "Add page numbers", description: "Add a discreet page number to every page locally." },
  "pdf-add-text": { icon: FilePdf, label: "Add text", description: "Place text on one selected PDF page locally." },
  "pdf-header-footer": { icon: FilePdf, label: "Headers & footers", description: "Add header and footer text to every page locally." },
  "pdf-flatten": { icon: FilePdf, label: "Flatten PDF", description: "Rasterize every page into a non-editable PDF copy." },
  "pdf-privacy": { icon: FilePdf, label: "PDF privacy report", description: "Inspect locally readable metadata and document structure." },
  "pdf-redact": { icon: FilePdf, label: "Redact a region", description: "Permanently black out one region by rasterizing the document." },
  "pdf-highlight": { icon: FilePdf, label: "Highlight a region", description: "Add a translucent yellow highlight without removing underlying text." },
  "pdf-shape": { icon: FilePdf, label: "Add rectangle", description: "Add a restrained rectangle annotation without removing underlying text." },
  "pdf-remove-blank": { icon: FilePdf, label: "Remove blank pages", description: "Detect and remove pages that render as blank locally." },
  "pdf-duplicate-page": { icon: FilePdf, label: "Duplicate a page", description: "Append a duplicate of one selected page locally." },
} as const;

export default function PdfAdvancedEditor({ operation, file, processing, onProcess }: PdfAdvancedEditorProps) {
  const [exportMode, setExportMode] = useState<"single" | "individual" | "zip">("individual");
  const [columns, setColumns] = useState(3);
  const [pageSize, setPageSize] = useState("a4");
  const [pageNumber, setPageNumber] = useState(1);
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(12);
  const [textPage, setTextPage] = useState(1);
  const [textRegion, setTextRegion] = useState({ pageNumber: 1, x: 10, y: 10, width: 20, height: 8 });
  const [footer, setFooter] = useState("");
  const [redaction, setRedaction] = useState({ pageNumber: 1, x: 0, y: 0, width: 20, height: 20 });
  const detail = details[operation];
  const Icon = detail.icon;
  const isRasterExport = operation === "pdf-to-jpg" || operation === "pdf-to-png";
  const isContactSheet = operation === "pdf-contact-sheet";
  const isCrop = operation === "pdf-crop";
  const isPageSize = operation === "pdf-page-size";
  const isWatermark = operation === "pdf-watermark";
  const isTextOverlay = operation === "pdf-add-text";
  const isHeaderFooter = operation === "pdf-header-footer";
  const isRedact = operation === "pdf-redact";
  const isHighlight = operation === "pdf-highlight";
  const isShape = operation === "pdf-shape";
  const isDuplicatePage = operation === "pdf-duplicate-page";
  return (
    <section className="pdf-advanced-editor" aria-label={detail.label}>
      <div className="pdf-advanced-icon"><Icon size={26} aria-hidden="true" /></div>
      <div>
        <p className="eyebrow">PDF tool</p>
        <h4>{detail.label}</h4>
        <p>{detail.description}</p>
        {file && <small>{file.name}</small>}
        {isRasterExport && (
          <div className="pdf-export-options" aria-label="Page export options">
            <label>
              <span>Export</span>
              <select value={exportMode} onChange={(event) => setExportMode(event.target.value as typeof exportMode)} disabled={processing}>
                <option value="individual">All pages individually</option>
                <option value="zip">All pages as ZIP</option>
                <option value="single">One page</option>
              </select>
            </label>
            {exportMode === "single" && (
              <label>
                <span>Page number</span>
                <input type="number" min={1} step={1} value={pageNumber} onChange={(event) => setPageNumber(Math.max(1, Number(event.target.value) || 1))} disabled={processing} />
              </label>
            )}
            <small>Individual files use the original PDF name and page number.</small>
          </div>
        )}
        {isContactSheet && (
          <div className="pdf-export-options" aria-label="Contact sheet options">
            <label>
              <span>Columns</span>
              <input type="number" min={1} max={4} step={1} value={columns} onChange={(event) => setColumns(Math.max(1, Math.min(4, Number(event.target.value) || 1)))} disabled={processing} />
            </label>
            <small>Pages are rendered locally into one printable PDF overview.</small>
          </div>
        )}
        {isPageSize && (
          <div className="pdf-export-options" aria-label="PDF page size options">
            <label>
              <span>Page size</span>
              <select value={pageSize} onChange={(event) => setPageSize(event.target.value)} disabled={processing}>
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
                <option value="original">Original size</option>
              </select>
            </label>
            <small>Content is fitted and centered while preserving its aspect ratio.</small>
          </div>
        )}
        {isWatermark && (
          <div className="pdf-export-options" aria-label="Watermark options">
            <PdfAnnotationEditor file={file} region={redaction} disabled overlayText={text || "Watermark"} onRegionChange={() => undefined} />
            <label>
              <span>Watermark text</span>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Confidential" disabled={processing} />
            </label>
            <label>
              <span>Font size</span>
              <input type="number" min={8} max={96} value={fontSize} onChange={(event) => setFontSize(Math.max(8, Math.min(96, Number(event.target.value) || 12)))} disabled={processing} />
            </label>
          </div>
        )}
        {isTextOverlay && (
          <div className="pdf-export-options" aria-label="Text overlay options">
            <PdfAnnotationEditor file={file} region={textRegion} disabled={processing} onRegionChange={setTextRegion} />
            <label>
              <span>Text</span>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Enter text" disabled={processing} />
            </label>
            <label>
              <span>Page</span>
              <input type="number" min={1} step={1} value={textPage} onChange={(event) => {
                const pageNumber = Math.max(1, Number(event.target.value) || 1);
                setTextPage(pageNumber);
                setTextRegion((current) => ({ ...current, pageNumber }));
              }} disabled={processing} />
            </label>
            <label>
              <span>Font size</span>
              <input type="number" min={8} max={96} value={fontSize} onChange={(event) => setFontSize(Math.max(8, Math.min(96, Number(event.target.value) || 12)))} disabled={processing} />
            </label>
          </div>
        )}
        {isHeaderFooter && (
          <div className="pdf-export-options" aria-label="Header and footer options">
            <PdfAnnotationEditor file={file} region={redaction} disabled onRegionChange={() => undefined} headerText={text || "Header"} footerText={footer || "Footer"} />
            <label>
              <span>Header</span>
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Document title" disabled={processing} />
            </label>
            <label>
              <span>Footer</span>
              <input value={footer} onChange={(event) => setFooter(event.target.value)} placeholder="Confidential" disabled={processing} />
            </label>
            <label>
              <span>Font size</span>
              <input type="number" min={8} max={48} value={fontSize} onChange={(event) => setFontSize(Math.max(8, Math.min(48, Number(event.target.value) || 12)))} disabled={processing} />
            </label>
          </div>
        )}
        {(isCrop || isRedact || isHighlight || isShape) && (
          <div className="pdf-export-options" aria-label="PDF annotation region">
            <PdfAnnotationEditor file={file} region={redaction} disabled={processing} onRegionChange={setRedaction} />
            <div className="pdf-annotation-precision">
              {(["pageNumber", "x", "y", "width", "height"] as const).map((field) => (
                <label key={field}>
                  <span>{field === "pageNumber" ? "Page" : `${field} %`}</span>
                  <input type="number" min={field === "pageNumber" ? 1 : 0} max={field === "pageNumber" ? undefined : 100} value={redaction[field]} onChange={(event) => setRedaction({ ...redaction, [field]: Number(event.target.value) || 0 })} disabled={processing} />
                </label>
              ))}
            </div>
            <small>{isCrop ? "The selected region becomes the visible page area while preserving PDF content." : isRedact ? "The selected region is permanently rasterized." : "The selected region remains text-selectable."}</small>
          </div>
        )}
        {isDuplicatePage && (
          <div className="pdf-export-options" aria-label="Duplicate page options">
            <label>
              <span>Page number</span>
              <input type="number" min={1} step={1} value={pageNumber} onChange={(event) => setPageNumber(Math.max(1, Number(event.target.value) || 1))} disabled={processing} />
            </label>
          </div>
        )}
      </div>
      <button type="button" className="action-button" onClick={() => onProcess(isRasterExport ? { exportMode, pageNumber } : isContactSheet ? { columns } : isPageSize ? { size: pageSize } : isWatermark ? { text, fontSize } : isTextOverlay ? { text, pageNumber: textRegion.pageNumber, fontSize, x: textRegion.x, y: textRegion.y } : isHeaderFooter ? { header: text, footer, fontSize } : (isCrop || isRedact || isHighlight || isShape) ? redaction : isDuplicatePage ? { pageNumber } : { fontSize })} disabled={processing}>
        <FilePdf size={17} /> {processing ? "Processing..." : "Run tool"}
      </button>
    </section>
  );
}
