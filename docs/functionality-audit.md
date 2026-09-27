# StayLokal functionality audit (reference platforms)

Last updated: 2026-09-27

This document compares StayLokal’s **local-first** registry (`lib/tools/registry.ts`, **75 tools**) against common online suites (iLovePDF/iLoveIMG, Smallpdf, PDF24, Sejda, Squoosh, EZGIF, CloudConvert-style converters, etc.). Status meanings:

| Status | Meaning |
|--------|---------|
| **Shipped** | Exposed in registry with a real processor path |
| **Partial** | Shipped but codec, browser, size, or format limits apply |
| **Gap** | Competitors offer it; not shipped or not local-feasible yet |
| **N/A** | Out of product scope (server-only, accounts, calculators, full Photoshop-class editors) |

All shipped tools run in the browser; optional sponsor/donation APIs never receive user files.

---

## PDF (iLovePDF, Smallpdf, PDF24, Sejda, TinyWow)

| Competitor feature | StayLokal tool | Status | Notes |
|--------------------|----------------|--------|-------|
| Merge PDF | `pdf-merge` | Shipped | Visual editor + pdf-lib |
| Split PDF | `pdf-split` | Shipped | Per-page or range + ZIP |
| Rotate | `pdf-rotate` | Shipped | Visual + batch |
| Extract / delete / reorder pages | `pdf-extract`, `pdf-delete-pages`, `pdf-reorder` | Shipped | Visual editor |
| PDF to JPG/PNG/images | `pdf-to-image` | Shipped | Multi-format raster export |
| JPG/PNG to PDF | `pdf-image-to-pdf` | Shipped | Multi-image |
| Compress PDF | `pdf-compress` | Partial | qpdf WASM; may fail to init in some builds—clear error shown |
| OCR / searchable PDF | `pdf-ocr` | Shipped | English Tesseract, local |
| Watermark, page numbers | `pdf-watermark`, `pdf-page-numbers` | Shipped | Worker + visual |
| Add text, headers/footers | `pdf-add-text`, `pdf-header-footer` | Shipped | |
| Annotate (highlight, shapes) | `pdf-highlight`, `pdf-shape` | Shipped | Region-based |
| Redact | `pdf-redact` | Shipped | Rasterized black boxes |
| Crop / resize pages | `pdf-crop`, `pdf-page-size` | Shipped | Vector-preserving crop; fit to A4/Letter |
| Flatten | `pdf-flatten` | Shipped | Rasterized copy |
| Forms | `pdf-fill-form` | Shipped | AcroForm fields |
| Image on PDF | `pdf-add-image` | Shipped | |
| Metadata / privacy | `pdf-metadata`, `pdf-privacy` | Shipped | |
| Contact sheet | `pdf-contact-sheet` | Shipped | |
| Blank page removal | `pdf-remove-blank` | Shipped | |
| Duplicate page | `pdf-duplicate-page` | Shipped | |
| Password protect / unlock | — | Gap | No verified browser round-trip |
| Sign PDF | — | Gap | Deferred |
| PDF/A, repair, compare | — | Gap | Not local-verified |
| Word/Excel/PPT → PDF (native) | `pptx-pdf` only | Partial | PPTX render local; no DOC/XLS → PDF |

---

## Image (iLoveIMG, Squoosh, TinyPNG, EZGIF, Remove.bg)

| Competitor feature | StayLokal tool | Status | Notes |
|--------------------|----------------|--------|-------|
| Resize / compress | `image-process` | Shipped | Canvas |
| Crop | `image-crop` | Shipped | Visual editor |
| Rotate / flip | `image-rotate`, `image-flip` | Shipped | |
| Convert formats | `image-convert` | Shipped | JPEG/PNG/WebP/GIF/BMP/AVIF/ICO/TIFF where browser allows |
| Thumbnail | `image-thumbnail` | Shipped | |
| Watermark / meme | `image-watermark`, `image-meme` | Shipped | |
| GIF maker | `image-gif` | Shipped | Requires ≥2 images |
| Contact sheet | `image-contact-sheet` | Shipped | Requires ≥2 images |
| Background removal | `image-background-remove` | Shipped | Local IS-NET model |
| Upscale | `image-upscale` | Shipped | 2× ESRGAN |
| Full editor (Photopea-class) | — | N/A | Use dedicated editors |
| Batch ZIP download all variants | — | Gap | Per-file downloads today |

---

## Video & audio (123apps, CloudConvert, EZGIF)

| Competitor feature | StayLokal tool | Status | Notes |
|--------------------|----------------|--------|-------|
| Trim / cut / speed | `trim`, `cut`, `speed` | Partial | Timeline editor; codec limits |
| Extract frames | `frames` | Partial | |
| Split, compress, convert, resize, FPS | `split`, `compress`, `convert`, `resize`, `fps` | Partial | Option form + FFmpeg WASM |
| Mute, extract audio | `mute`, `extract-audio` | Partial | |
| Video ↔ GIF | `to-gif`, `from-gif` | Partial | |
| Thumbnail, rotate, flip | `thumbnail`, `rotate`, `flip` | Partial | |
| Strip metadata | `metadata` (video/audio), `metadata-audio` | Partial | Overlap by design |
| Audio trim / normalize / convert | `audio-trim`, `normalize-audio`, `convert-audio` | Partial | |
| Merge videos | — | Gap | Worker path unreliable—not exposed |
| Subtitles | — | Gap | No subtitle file workflow |

512 MB aggregate limit; oversized files stay visible without starting FFmpeg.

---

## Documents & spreadsheets

| Competitor feature | StayLokal tool | Status | Notes |
|--------------------|----------------|--------|-------|
| DOCX/DOC text | `docx-text` | Shipped | |
| PPT/PPTX text | `ppt-text`, `pptx-text` | Shipped | |
| PPTX → PDF/PNG/JPG | `pptx-pdf`, `pptx-png`, `pptx-jpg` | Shipped | |
| Text preview (txt, md, csv, json, …) | `txt-preview` | Shipped | Extended text/* acceptance |
| XLS/XLSX preview | `spreadsheet-preview` | Shipped | In-app table |
| XLS/XLSX → CSV | `spreadsheet-csv` | Shipped | |
| DOCX → PDF, edit Word | — | Gap | Not local-verified |

---

## Archives

| Competitor feature | StayLokal tool | Status | Notes |
|--------------------|----------------|--------|-------|
| List ZIP | `archive-list` | Shipped | |
| Extract one file | `archive-extract` | Shipped | |
| Create ZIP | `archive-create` | Shipped | Bundles compatible queued files |
| RAR/7z extract | — | Gap | ZIP only |

---

## Converters & utilities (CloudConvert, CyberChef, Omni Calculator)

| Area | Status | Notes |
|------|--------|-------|
| General “any format” cloud conversion | N/A | StayLokal is intentional subset + local |
| JSON prettify/minify | `json-format` | Shipped | Local file in/out |
| Base64 encode/decode | `base64-encode`, `base64-decode` | Shipped | Full CyberChef scope still N/A |
| Calculators | N/A | Out of scope |
| Hash / encode tools | Gap | Could be a future text-utils bundle |

---

## Cross-cutting checklist (all shipped tools)

| Concern | Implementation |
|---------|----------------|
| Input validation | `lib/tools/validation.ts`, 512 MB cap |
| Progress / cancel | `useFileWorkflow`, FFmpeg/PDF workers, Escape |
| Errors | `ProcessingError` with user-facing messages |
| Downloads | Blob URLs in result panel |
| Unsupported file UX | `hasUnsupportedDetectedType` — only `unknown` / `folder` |
| Mobile | Responsive layout; heavy tools may be slow on mobile |
| Duplicates | `metadata` vs `metadata-audio` — same FFmpeg op, different accept sets |

---

## Recommended next local features (priority)

1. **PDF password** — only after standards-compliant browser path  
2. **Video merge** — re-enable when worker reliability proven  
3. **Hash / checksum text utilities** — optional CyberChef-lite expansion (SHA-256, etc.)  
4. **Batch ZIP download** — optional UX for multi-output image/PDF exports  

---

## Verification

- `npm test` — registry, validation, FFmpeg commands, PDF/document/spreadsheet/archive processors  
- `npm run test:browser` — focused suites including `archive-focused`, `ffmpeg-generic-focused`, and `text-utils-focused` (full matrix environment-limited)  
- Manual smoke: upload → compatible tool → Run Tool / editor export → download  
