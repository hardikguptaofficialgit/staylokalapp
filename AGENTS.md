# StayLokal — Complete Current-State Project Document

Last updated: 2026-09-15

This document is the canonical description of the repository as it exists now. It
must describe code that exists, not desired behavior. Every major item has one of
these statuses:

- `WORKING` — implemented and supported by the current code path and available
  verification.
- `PARTIALLY WORKING` — implemented, but limited by known capability, coverage, or
  integration gaps.
- `NOT WORKING` — present but currently fails its intended behavior.
- `IMPLEMENTED BUT UNTESTED` — code exists, but there is not enough reliable
  execution evidence to call it working.
- `PLANNED` — not exposed as a current feature, or intentionally deferred.

## V1 Status

StayLokal V1 is **READY TO FREEZE** under the accepted verification criteria:

- `npm test` — **PASS** (52 tests)
- `npm run lint` — **PASS**
- `npm run typecheck` — **PASS**
- `npm run build` — **PASS**
- Focused/manual smoke verification is the accepted browser validation.
- The full Playwright/browser suite is **not a V1 acceptance gate**.

The full `npm run test:browser` suite is excluded from V1 freeze acceptance because
the current environment has browser/server startup hangs, long-running media tests,
and codec limitations. These environment limitations are not classified as product
failures unless independently reproduced through focused or manual verification.

## 1. Product summary

StayLokal is a client-side browser utility for local PDF, image, video, and audio
operations. The current user flow is:

1. Drop files or choose them with the file picker.
2. Detect file types locally.
3. Show only registry tools compatible with every selected file.
4. Select a tool or visual editor.
5. Configure or manipulate the file locally.
6. Process in the browser.
7. Download one or more generated results.

File processing remains local-first. The optional donation and sponsor-payment flows
use server-side Dodo Payments and Appwrite integrations; uploaded user files are not
sent to those services.

## 2. Status overview

| Area | Status | Current truth |
|---|---|---|
| Next.js application shell | `WORKING` | App Router page builds and serves. |
| Local file upload and drag/drop | `WORKING` | File picker, drop zone, multi-file input, and keyboard activation exist. |
| File type detection | `WORKING` | MIME, extension, PDF, image, video, audio, document, presentation, spreadsheet, text, archive, folder, and unknown detection exist. |
| Contextual tool discovery | `WORKING` | Tools are filtered by accepted types, search, and category. |
| Image resize/compress | `WORKING` | Canvas processor and page action exist. |
| Image crop | `WORKING` | Visual crop editor and canvas crop processor exist. |
| Image rotate/flip/thumbnail/GIF | `WORKING` | Canvas operations and local animated GIF encoding are exposed with focused Chromium round-trip coverage. |
| Image background removal | `WORKING` | Self-hosted IMG.LY IS-NET FP16 segmentation runs locally in Chromium and exports transparent PNG cutouts; focused round-trip coverage passes. |
| Image AI upscaling | `WORKING` | Self-hosted ESRGAN Thick 2× model assets run locally in Chromium and export enlarged PNG results; focused round-trip coverage passes. |
| SVG/BMP/AVIF image processing | `WORKING` | Browser-native decoding flows through the existing Canvas processor; focused Chromium round-trip coverage passes when AVIF encoding is available. |
| PPTX text extraction | `WORKING` | Local JSZip/XML extraction produces slide-ordered plain text; focused Chromium round-trip coverage passes. |
| Legacy PPT text extraction | `WORKING` | Pure-JavaScript PowerPoint 97–2003 parser integration produces downloadable text; focused Chromium round-trip coverage passes. |
| DOCX text extraction | `WORKING` | Local JSZip/XML extraction produces ordered plain text; focused Chromium round-trip coverage passes. |
| Legacy DOC text extraction | `WORKING` | Browser-compatible `@jose.espana/docstream` OLE parser extracts body text locally; real fixture unit and focused Chromium round-trip coverage pass. |
| TXT preview/download | `WORKING` | Plain text is read locally, previewed, and downloadable without upload. |
| XLS/XLSX preview and CSV export | `WORKING` | Local SheetJS parsing supports worksheet selection, bounded preview, and complete-sheet CSV export; focused Chromium round-trip coverage passes. |
| ZIP inspection and selected-file extraction | `WORKING` | Local JSZip parsing lists safe archive entries and extracts a selected file; focused Chromium round-trip coverage passes. ZIP creation remains deferred. |
| PPTX → PDF | `WORKING` | Local `pptx-browser` canvas rendering and `pdf-lib` raster PDF export pass a real Chromium round-trip with downloadable PDF output. |
| PPTX → PNG/JPG | `WORKING` | Local slide rendering exports individually named PNG and JPG files; real Chromium round-trip coverage passes. |
| PDF merge | `WORKING` | Visual PDF export and processor tests exist. |
| PDF rotate | `WORKING` | Visual rotation and processor tests exist. |
| PDF split | `WORKING` | Per-page PDF output exists. |
| PDF page extraction/deletion/reordering | `WORKING` | Visual page workflows and processor coverage exist. |
| JPG/PNG to PDF | `WORKING` | Local `pdf-lib` image embedding and multi-image export exist. |
| PDF metadata viewer/remover | `WORKING` | Metadata is read locally and can be removed into a new PDF. |
| PDF → JPG/PNG | `WORKING` | PDF.js renders selected or all pages locally; pages can download individually or as a ZIP archive. |
| PDF watermark/page numbers | `WORKING` | Text overlays are generated in a cancellable local PDF worker. |
| PDF add-text overlay | `WORKING` | User text can be placed on a rendered selected page by interaction, with precise page/position/font controls and local PDF-worker export. |
| PDF headers/footers | `WORKING` | Header and footer text can be added to every page through the local PDF worker. |
| PDF flattening | `WORKING` | Pages can be rasterized into a non-editable PDF copy; text/form selection is intentionally lost. |
| PDF privacy report | `WORKING` | Locally readable metadata and page structure can be exported as a JSON report; full forensic scanning is not claimed. |
| PDF redaction | `WORKING` | Percentage-based regions are permanently painted black into a rasterized PDF; text/layout editing is intentionally lost. |
| PDF highlighting | `WORKING` | Percentage-based translucent highlight regions preserve the underlying PDF text. |
| PDF rectangle annotations | `WORKING` | Percentage-based rectangle annotations preserve the underlying PDF text. |
| PDF image annotations | `WORKING` | Local JPG/PNG images can be placed on a rendered PDF page and embedded into a new PDF copy; focused Chromium round-trip verification passes. |
| Blank-page removal | `WORKING` | PDF.js pixel inspection removes pages that render blank; output preserves remaining source pages. |
| Page duplication | `WORKING` | A validated page can be appended as a duplicate in a new PDF copy. |
| PDF form filling | `WORKING` | Editable AcroForm text/date-like fields, checkboxes, radio groups, dropdowns, and option lists can be inspected, filled, and saved locally. |
| PDF split ranges/ZIP | `WORKING` | Split supports page/range input and individual PDF or ZIP output. |
| PDF annotations/redaction/flattening | `WORKING` | Local watermark, page-number, text, header/footer, highlight, shape, redaction, and flattening workflows are exposed with their documented raster/text-preservation behavior. |
| PDF password encryption/decryption | `PLANNED` | No standards-compliant browser round-trip is currently verified. |
| PDF forms/signatures/Office conversion | `PLANNED` | No complete local processor and validation path is currently exposed. |
| OCR/text extraction | `WORKING` | English OCR runs locally with self-hosted Tesseract worker/core/language assets and produces plain text plus a searchable PDF copy. |
| PDF compression | `PLANNED` | qpdf WASM integration is installed experimentally but does not initialize reliably in the current Next.js worker/CSP setup. |
| PDF/A conversion | `PLANNED` | Kura WASM was evaluated, but its published package currently pulls a Node `module` fallback during the Next.js client build. |
| Video trim/cut/speed/frame extraction | `PARTIALLY WORKING` | Real FFmpeg path exists, but browser codec and long-running media limitations remain. |
| Audio trim and conversion tools | `PARTIALLY WORKING` | Waveform/editor and FFmpeg adapters exist; trim, normalization, metadata removal, and conversion are exposed locally, while browser codec/execution coverage remains limited. |
| 512 MB local input limit | `WORKING` | Validation and UI gating exist before editor processing paths. |
| Cancellation | `PARTIALLY WORKING` | AbortController and worker termination exist; exhaustive browser verification is incomplete. |
| Result/download UI | `WORKING` | Blob result links are rendered and object URLs are cleaned on result changes. |
| Donation checkout | `PARTIALLY WORKING` | Dodo hosted donation checkout route and `/donate` UI exist; production credentials are not configured. |
| Sponsor leaderboard | `PARTIALLY WORKING` | Five-rank pay-to-outbid UI, ranking logic, Appwrite repository, Dodo claim route, and signed webhook exist; external configuration and live verification remain. |
| Backend/API/database/auth | `PARTIALLY WORKING` | Donation and sponsor API routes exist; Appwrite is used for optional sponsor persistence, with no user account system. |
| Full browser suite | `IMPLEMENTED BUT UNTESTED` | Tests exist, but the full Playwright run has startup/long-running media problems. |

## 3. Current exposed registry

The registry in `lib/tools/registry.ts` exposes exactly fifty-one tools. No other tool is
shown by the current tool picker.

### Image
`image-process`, `image-crop`, `image-rotate`, `image-flip`, `image-thumbnail`,
`image-gif`, `image-background-remove`, `image-convert`, `image-upscale`,
`image-watermark`, and `image-meme`.

### PDF
`pdf-merge`, `pdf-rotate`, `pdf-split`, `pdf-extract`, `pdf-delete-pages`,
`pdf-reorder`, `pdf-image-to-pdf`, `pdf-metadata`, `pdf-to-jpg`, `pdf-to-png`,
`pdf-watermark`, `pdf-page-numbers`, `pdf-add-text`, `pdf-header-footer`,
`pdf-flatten`, `pdf-privacy`, `pdf-redact`, `pdf-highlight`, `pdf-shape`,
`pdf-remove-blank`, `pdf-duplicate-page`, `pdf-add-image`, `pdf-fill-form`, and
`pdf-ocr`.

### Video
`trim`, `cut`, `speed`, and `frames`.

### Audio
`audio-trim`, `normalize-audio`, `metadata-audio`, and `convert-audio`.

### Presentation and documents
`ppt-text`, `pptx-text`, `pptx-pdf`, `pptx-png`, `pptx-jpg`, `docx-text` (DOC/DOCX),
`txt-preview`, `spreadsheet-preview`, `spreadsheet-csv`, `archive-list`, and
`archive-extract`.

Every exposed descriptor points to one of the four processor kinds:

- `image` → `lib/tools/image.ts`
- `pdf` → `lib/tools/pdf.ts`
- `ffmpeg` → `lib/tools/ffmpeg.ts`
- `document` → `lib/tools/document.ts` (delegates PowerPoint operations to
  `lib/tools/presentation.ts` and archive operations to `lib/tools/archive.ts`)

## 4. Currently working features

### 4.1 Application shell and landing page — `WORKING`

Files:

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `public/images/logo.png`

Implemented behavior:

- Next.js App Router root page.
- Dark theme as the default.
- Light theme toggle with warm neutral light colors.
- Geist and Geist Mono through `next/font/google`.
- Local-first security copy.
- StayLokal logo without a visible logo tile.
- Pure monochrome utility styling with neutral light-mode tint.
- Responsive layout and visible keyboard focus styles.
- Header theme toggle.
- Landing hero:
  - security badge;
  - “Transform your files, without the cloud.” heading;
  - local-processing subtitle;
  - central drop zone;
  - supported-category pills.
- Decorative file icons remain outside the central drop-zone content, without card
  containers or shadows. ZIP and Folder decorations are hidden.
- The previous “Files, but better.” footer decoration has been removed.

### 4.2 Upload and queue — `WORKING`

Implemented in `app/page.tsx`:

- Hidden multiple-file input.
- Click-to-browse.
- Drag/drop handling.
- Clipboard paste handling for browser-exposed local files.
- Clickable landing-page category shortcuts configure the native file picker for
  the selected format; the Folders shortcut enables directory selection where supported.
- Enter and Space activation on the drop zone.
- Multiple queued files.
- Add files after initial upload.
- Remove an individual file.
- Clear all files.
- File name, detected type, and formatted size display.
- Active-file selection.
- Clicking an uploaded file opens a local preview modal for images, PDFs, video,
  audio, and text files; unsupported formats show a clear browser-preview message.
- Queue reset when files are cleared or replaced.
- Oversized-file error state.

### 4.3 Detection and discovery — `WORKING`

Implemented in:

- `lib/tools/file-types.ts`
- `lib/tools/validation.ts`
- `lib/tools/registry.ts`
- `app/page.tsx`

Detection supports these kinds:

- PDF
- image
- document
- presentation
- text
- video
- spreadsheet
- audio
- archive
- folder
- unknown

Accepted-file matching uses:

- MIME type;
- wildcard MIME rules;
- filename extensions when browsers provide an empty MIME type;
- detected file kind.

The tool picker provides:

- compatible-tool filtering across all selected files;
- category filters;
- search;
- empty state for unsupported files;
- deferred-type messaging for recognized formats without an exposed processor.

### 4.4 Shared validation — `WORKING`

`lib/tools/validation.ts` provides:

- empty-file rejection;
- single-file versus batch validation;
- 512 MB aggregate input limit;
- accepted-type validation;
- numeric option finite-value validation;
- select-option validation;
- minimum and maximum validation;
- typed `ProcessingError` results.

The hard limit is:

```text
512 * 1024 * 1024 bytes
```

### 4.5 Image processing — `WORKING` for exposed operations

Files:

- `lib/tools/image.ts`
- `components/editor/image/ImageEditor.tsx`

The processor:

- creates local object URLs for decoding;
- decodes images with the browser;
- uses Canvas for output;
- supports JPEG, PNG, and WebP output;
- supports quality;
- supports width and height;
- supports centered crop and crop coordinates;
- includes rotation and flip branches for non-exposed operations;
- supports batch processing;
- reports progress;
- checks cancellation;
- revokes decode URLs.
- `image-background-remove` uses a self-hosted IS-NET FP16 model through
  `@imgly/background-removal` and `onnxruntime-web`; it emits transparent PNG
  cutouts and reports first-run model download/inference progress.

The `ImageEditor` provides:

- local image preview;
- crop overlay;
- pointer/touch crop handles;
- keyboard crop-handle movement;
- crop reset;
- exact dimensions;
- quality control for resize/compress;
- output format control;
- processed crop preview;
- output-size preview.

`BackgroundRemovalEditor` provides the local source preview and explains the
one-time model cache before the shared Run Tool action starts segmentation.

The page invokes the existing image processor for the final “Run Tool” action.

### 4.6 PDF processing — `WORKING` for exposed operations

Files:

- `lib/tools/pdf.ts`
- `components/editor/pdf/pdf-editor.tsx`
- `components/editor/pdf/PdfWorkspace.tsx`
- `components/editor/pdf/PdfToolbar.tsx`
- `components/editor/pdf/PdfCanvas.tsx`
- `components/editor/pdf/PdfPageControls.tsx`
- `components/editor/pdf/PdfFileCard.tsx`
- `components/editor/pdf/PdfEditorFooter.tsx`
- `components/editor/pdf/PdfAdvancedEditor.tsx`
- `components/editor/pdf/ImageToPdfEditor.tsx`
- `components/editor/pdf/PdfMetadataEditor.tsx`

The PDF processor supports:

- merging multiple PDF documents;
- rotating every page;
- splitting a PDF into one output per page;
- extracting selected pages;
- deleting pages;
- reordering pages;
- embedding JPG/PNG images into a PDF;
- reading and removing PDF metadata;
- adding watermark text;
- adding page numbers;
- adding text to a selected page;
- adding header and footer text;
- rasterizing pages into a non-editable flattened PDF;
- permanently painting percentage-based redaction regions into rasterized output;
- drawing non-destructive translucent highlight regions;
- drawing non-destructive rectangle annotations;
- detecting and removing rendered blank pages;
- appending a validated duplicate of a selected page;
- filling editable AcroForm text fields;
- splitting by page/range with individual or ZIP output;
- progress events;
- cancellation checks;
- browser Blob output.

The visual PDF editor supports:

- locally generated page previews;
- page thumbnail strip;
- selected-page preview;
- fullscreen document preview toggle;
- page selection;
- page reorder;
- selected-page rotation;
- page deletion;
- single-page extraction;
- merged export;
- split export;
- Escape cancellation;
- preview URL cleanup.

The PDF editor is organized as a focused workspace hierarchy:

```text
PdfEditor
  → PdfWorkspace
    → PdfToolbar
    → PdfPageControls
      → PdfFileCard
    → PdfCanvas
    → PdfEditorFooter
```

The document canvas is the primary visual surface. The toolbar contains only actions
relevant to the selected PDF workflow, page controls remain available for multi-page
documents as a horizontal strip inside the editor (not a permanent third column), and
export/cancellation stays in the editor footer.

The visual PDF editor is the page’s active PDF processing path. The generic duplicate
PDF action is not used for selected PDF tools.

### 4.7 Video processing — `PARTIALLY WORKING`

Files:

- `lib/tools/ffmpeg.ts`
- `lib/tools/ffmpeg-worker.ts`
- `lib/tools/ffmpeg-commands.ts`
- `components/editor/media/VideoEditor.tsx`

The current exposed video operations are:

- trim;
- cut;
- speed;
- frame extraction.

The video editor provides:

- local video object URL;
- metadata loading;
- finite-duration validation;
- browser codec/container capability detection;
- explicit unsupported, corrupt, invalid-duration, capability, loading, and
  oversized states;
- timeline with in/out handles;
- thumbnail filmstrip and time ruler;
- visible playhead/current timestamp and highlighted selection;
- pointer/touch timeline interaction;
- keyboard handle movement;
- Space, arrow, I/O, and R editor shortcuts;
- playback of the selected range;
- frame stepping;
- FPS control;
- speed select;
- exact in/out values;
- trim, cut, split, frames, and speed action surfaces;
- progress and cancellation presentation.

The page only mounts the video editor for the exposed video IDs. Split action support
exists in the editor and command layer but split is not currently exposed in the
registry.

#### Critical video-size rule — `WORKING`

For videos larger than 512 MB, the current V1 behavior is:

- keep the file visible in the workspace;
- do not initialize `VideoEditor`;
- do not unnecessarily create a video object URL;
- do not initialize FFmpeg;
- do not load or process the video;
- show the actual file size;
- show `Maximum supported size: 512 MB`;
- explain that processing is local-only and the file is too large for the current
  local-processing limit.

The FFmpeg bridge:

- creates one lazy Worker;
- transfers input buffers;
- enforces one active media request;
- forwards progress;
- rejects worker errors;
- terminates and clears the worker on cancellation;
- removes listeners after settlement;
- rejects stale request IDs;
- returns one or more `ProcessedFile` results.

The worker:

- loads self-hosted FFmpeg assets;
- writes inputs to its virtual filesystem;
- probes audio presence for video-only cut/speed handling;
- executes typed command mappings;
- finds multi-output frame results;
- reads output buffers;
- cleans temporary inputs and generated outputs in `finally`;
- reports FFmpeg logs with failures.

### 4.8 Audio processing — `PARTIALLY WORKING`

Files:

- `components/editor/media/AudioEditor.tsx`
- `components/editor/media/audio-processor.ts`
- `lib/tools/ffmpeg.ts`
- `lib/tools/ffmpeg-commands.ts`

The exposed audio operation is trim.

The audio editor provides:

- local audio object URL;
- native audio playback;
- metadata duration;
- decoded waveform through `AudioContext`;
- selection waveform;
- pointer/touch range handles;
- keyboard range handles;
- exact in/out values;
- selected-range playback;
- trim action;
- progress;
- cancellation.

The video and audio editors also provide compact timestamp controls, selected-duration
feedback, replace-file actions, and sticky primary trim actions with secondary media
operations kept in a compact toolbar.

`audio-processor.ts` maps the selected range into the registered
`audio-trim` FFmpeg operation.

### 4.9 Results and downloads — `WORKING`

Implemented in `app/page.tsx`:

- processing state;
- progress ratio and label;
- error state;
- cancellation state;
- multiple output results;
- local completion indicator;
- download anchors;
- object URL creation;
- object URL revocation when results change or the page unmounts.

## 5. Added but incomplete, limited, or not user-facing

### 5.1 Image operations now exposed — `WORKING`

`lib/tools/image.ts` contains branches for:

- rotation;
- horizontal/vertical flip;
- thumbnail-like resize behavior.

These operations are exposed through the current registry and use the existing Canvas
processor and visual image editor. Focused Chromium coverage passes for rotate, flip,
and thumbnail output.

### 5.2 Dormant FFmpeg command mappings — `PLANNED`

`lib/tools/ffmpeg-commands.ts` contains command mappings for:

- split;
- compress;
- convert;
- resize;
- FPS;
- mute/remove audio;
- extract audio;
- video-to-GIF;
- GIF-to-video;
- thumbnail;
- rotate;
- flip;
- metadata removal;

These remaining video operations are intentionally filtered out by `lib/tools/registry.ts` and are not
advertised to users. They are **not supported V1 features**. Their command mappings
must not be surfaced or added to the registry without explicit product approval and
reliable execution verification.

### 5.3 Subtitle/text overlay command branch — `PLANNED`

There is a `subtitle` branch in `ffmpeg-commands.ts` using FFmpeg `drawtext`, but there
is no exposed subtitle-file workflow and no registry entry. It is not a supported V1
feature and has no reliable browser execution evidence.

### 5.4 Video merge command path — `NOT WORKING` / `PLANNED`

The worker retains a merge branch using a concat list and re-encoding. The operation
is not in the current registry because browser execution was not reliable enough to
advertise. It must not be considered a supported feature.

### 5.5 Shared workspace primitives — `CURRENTLY UNUSED / NOT V1 ACCEPTANCE`

Files:

- `components/editor/EditorShell.tsx`
- `components/editor/MediaPreview.tsx`
- `components/editor/Toolbar.tsx`
- `components/editor/PropertiesPanel.tsx`
- `components/editor/ProcessingPanel.tsx`
- `components/editor/ResultPanel.tsx`
- `components/editor/workspace/ToolWorkspace.tsx`

These components provide reusable shell, header, sidebar, main, controls, action-bar,
preview, toolbar, property, processing, and result primitives. The main page currently
uses the concrete PDF, image, video, and audio editors directly rather than composing
all of these primitives into one shared rendered workspace. This is an intentional
current implementation detail; V1 does not require a refactor to use `ToolWorkspace`.

### 5.6 Full browser verification — `IMPLEMENTED BUT UNTESTED`

Playwright test files exist, but the full suite is explicitly excluded from V1 freeze
acceptance:

- production/browser server startup has hung in this environment;
- long-running FFmpeg tests can exceed practical execution time;
- Chromium may not decode the checked-in H.264 MP4 fixture;
- capability-aware tests represent unsupported media as an explicit product state.

The tests must not be described as a complete successful browser matrix.

## 6. Planned or partially implemented features

### Product features

- Additional image editor effects and AI tools — `PLANNED`
- Video split exposure — `PLANNED`
- Video compression, conversion, resize, FPS, mute, audio extraction, GIF, thumbnail,
  rotate, flip, and metadata tools — `PLANNED`
- Video merge — `PLANNED`, blocked by reliability
- Subtitle-file workflow — `PLANNED`
- PDF → JPG/PNG, image contact sheets, PDF text extraction, and true PDF compression —
  `PLANNED`; these require a verified browser PDF renderer/text extractor/compression
  path and are not exposed in the registry.
- Broader audio-only workflows — `PLANNED`
- Document editing — `PLANNED`
- Spreadsheet editing beyond preview and CSV export — `PLANNED`
- ZIP creation and non-ZIP archive operations — `PLANNED`
- Persistence/history — `PLANNED`
- Offline/PWA behavior — `PLANNED`

### Future hardening — `PLANNED`, NOT V1 BLOCKERS

The following are future engineering work and are not blockers for the current V1
freeze:

- Broader codec/container matrix — `PLANNED`
- Firefox, Edge, and mobile hardware verification — `PLANNED`
- Browser capability checks beyond current media element checks — `PLANNED`
- Large-file memory-pressure improvements — `PLANNED`
- Global error boundary and runtime fallback UI — `PLANNED`
- Dedicated typed FFmpeg worker protocol module — `PLANNED`
- Reusable download-result component — `PLANNED`
- Reliable end-to-end media fixtures with finite duration in Chromium — `PLANNED`

## 7. UI structure

### 7.1 Root document

`app/layout.tsx`

- `<html lang="en">`
- Geist and Geist Mono CSS variables
- global stylesheet
- `<body>` flex column shell
- metadata title and description

### 7.2 Main application window

`app/page.tsx` renders one `<main class="app-window">` containing:

1. Header
2. Empty landing state or uploaded workspace

The app window has responsive framing, theme variables, custom scrollbar styling, and
keyboard focus rules in `app/globals.css`.

### 7.3 Header

- StayLokal logo and name.
- “Local by default. Private by design.” copy on larger screens.
- Light/Dark Mode toggle.

### 7.4 Empty landing state

- Decorative outer file icons.
- Security badge.
- Main heading and subtitle.
- Large drop zone.
- Upload cloud icon.
- Upload instruction text.
- Supported-type pill list.
- Hidden file input.

There is no marketing feature-card grid and no “Files, but better.” decoration.

### 7.5 Uploaded workspace

Desktop:

- tool-browser view: left workspace/sidebar file queue, draggable divider, and right tool area;
- selected PDF view: full-width editor container with a compact vertical workspace column on the left and the PDF editor on the right;
- selected non-PDF editors retain the compact left workspace/sidebar.

Below the desktop breakpoint:

- stacked file/sidebar and tool content;
- divider hidden;
- single-column layout.

### 7.6 File sidebar

- Workspace heading.
- File count.
- Add button.
- Selected-media label.
- Clear-all button.
- File chips.
- Active-file selection.
- Remove-file buttons.
- Inline detected-type and local-readiness status.
- Size/error messaging.

### 7.7 Tool browser

- “Choose a tool” heading.
- Search input.
- category pills;
- responsive tool-card grid;
- no-results and unsupported-type states.

### 7.8 Selected tool panel

- Back-to-tools button.
- Tool icon, category, name, and description.
- Visual editor when the selected tool has one.
- Precision options for generic tool paths.
- Run Tool button where applicable.
- Cancel button during processing.
- progress panel;
- error panel;
- result/download panel.

### 7.9 Visual editors

- Image editor: preview stage, crop overlay, handles, precision controls, output preview.
- PDF editor: page strip, selected page preview, page action controls, export controls.
- Video editor: video element, playback controls, timeline, range handles, exact values,
  operation buttons.
- Audio editor: native audio element, canvas waveform, range handles, exact values,
  playback, trim.

## 8. Feature and code structure

### 8.1 State ownership

`lib/app/useFileWorkflow.ts` owns:

- theme;
- category/search;
- file queue;
- selected file;
- selected tool;
- option values;
- processing status;
- progress;
- results;
- error;
- divider position;
- page-level AbortController.

`app/page.tsx` now composes the page shell and delegates rendering to
`components/app/`. Concrete editors own visual interaction state and call the
workflow hook's processor actions.

### 8.2 Registry flow

```text
registry descriptor
  → accepted MIME/extensions
  → compatible tool filtering
  → selected tool
  → processor kind
  → processor module
  → ProcessedFile[]
  → result/download UI
```

### 8.3 Image flow

```text
upload
  → detect image
  → image-process/image-crop descriptor
  → ImageEditor preview
  → useFileWorkflow processWithOptions()
  → imageProcessor()
  → Canvas Blob
  → result links
```

### 8.4 PDF flow

```text
upload one or more PDFs
  → PDF registry tool
  → PdfEditor page loading
  → local page previews
  → selection/reorder/rotation/delete
  → visual export
  → ProcessedFile[]
  → result links
```

### 8.5 Media flow

```text
upload
  → detect video/audio
  → VideoEditor or AudioEditor
  → range/action payload
  → useFileWorkflow processWithOptions()
  → ffmpegProcessor()
  → Worker postMessage()
  → ffmpeg-worker
  → output buffers
  → ProcessedFile[]
  → result links
```

### 8.6 Cancellation flow

```text
Escape or Cancel
  → page AbortController.abort()
  → ffmpeg bridge cancel handler
  → worker terminate()
  → worker reference cleared
  → cancelled ProcessingError
  → idle UI state
```

PDF export owns a separate local AbortController inside `PdfEditor`.

## 9. Backend, API, database, authentication, and storage

### Backend/API — `PARTIALLY WORKING`

Donation and sponsor route handlers exist under `app/api/`. They keep Dodo and
Appwrite credentials server-only. Sponsor activation is driven by a verified Dodo
payment webhook rather than the browser redirect.

### Database — `PARTIALLY WORKING`

`node-appwrite` provides the server-side persistence adapter for sponsor claims and
active sponsor records. Collections and attributes are configured externally; see
`docs/sponsor-leaderboard.md`.

### Authentication — `PLANNED`

There is no authentication or user account system.

### File storage — `PARTIALLY WORKING`

Input files remain in browser memory and browser-managed object URLs. Optional sponsor
logos can be stored in an Appwrite Storage bucket after validation.

### External integrations — `PARTIALLY WORKING`

Dodo Payments provides hosted donation and sponsor checkout. Appwrite provides
sponsor persistence and optional logo storage. Neither integration is configured in
the repository environment by default.

### Local runtime dependencies — `WORKING`

- Browser Canvas for image processing.
- `pdf-lib` for PDF parsing/export.
- FFmpeg WASM in a Worker for media operations.
- Web Audio `AudioContext` for waveform decoding.
- Browser media elements for video/audio preview.

## 10. Important file and folder map

```text
app/
  layout.tsx              Root document and metadata
  page.tsx                Thin page composition layer
  globals.css             Design system and all major layout styles

components/app/
  AppHeader.tsx            Brand header and theme toggle
  LandingState.tsx         Empty-state hero and upload drop zone
  WorkspaceSidebar.tsx     Compact file queue and selected-media sidebar
  SelectedFileCard.tsx     Selected file row with colored type icon
  FileTypeIcon.tsx         Colored file-type icon mapping
  ToolBrowser.tsx          Tool browser composition layer
  ToolsHeader.tsx          Compatible-tools heading
  ToolSearch.tsx           Tool search control
  ToolFilters.tsx          Category filter controls
  ToolGrid.tsx             Empty state and responsive tool grid
  ToolCard.tsx             Interactive compatible-tool card
  SelectedToolPanel.tsx    Selected-tool editors, processing, and results
  ToolIcon.tsx             Registry icon mapping with category accents
  types.ts                 App component workflow type

components/editor/
  EditorShell.tsx         Generic editor shell primitive
  MediaPreview.tsx        Generic media preview primitive
  Toolbar.tsx             Generic toolbar primitive
  PropertiesPanel.tsx     Generic properties primitive
  ProcessingPanel.tsx     Generic processing primitive
  ResultPanel.tsx         Generic result primitive
  workspace/              Shared workspace slots
  image/ImageEditor.tsx   Image visual editor
  image/BackgroundRemovalEditor.tsx  Background-removal source preview
  pdf/pdf-editor.tsx      PDF visual editor
  pdf/PdfWorkspace.tsx    PDF editor layout composition
  pdf/PdfToolbar.tsx      Workflow-specific PDF actions
  pdf/PdfCanvas.tsx       Primary document preview surface
  pdf/PdfPageControls.tsx Page navigation and thumbnails
  pdf/PdfFileCard.tsx     Compact PDF page card
  pdf/PdfEditorFooter.tsx Export and cancellation footer
  pdf/PdfAdvancedEditor.tsx Raster-export workflow surface
  media/VideoEditor.tsx   Video visual editor
  media/AudioEditor.tsx   Audio visual editor
  media/audio-processor.ts Audio action adapter
  media/types.ts          Media editor contracts

lib/tools/
  types.ts                Shared processor and result contracts
  registry.ts              Exposed/deferred tool registry
  validation.ts            Accepted-file and option validation
  file-types.ts            File-type detection
  image.ts                 Canvas image processor
  pdf.ts                   pdf-lib processor, PDF.js raster processor, and experimental OCR/qpdf adapters
  pdf-worker.ts            Worker-side watermark/page-number processor
  pdf-worker-client.ts     Cancellable PDF worker bridge
  ffmpeg.ts                Main-thread Worker bridge
  ffmpeg-worker.ts         FFmpeg Worker implementation
  ffmpeg-commands.ts       Media command/output mapping
  document.ts              Local DOC/DOCX and TXT processor
  presentation.ts          Local PPT/PPTX processor
  spreadsheet.ts           Local XLS/XLSX parser and CSV exporter
  archive.ts               Local ZIP listing and selected-file extraction

lib/app/
  useFileWorkflow.ts       Queue, selection, processing, theme, and layout state

public/
  images/logo.png         Brand asset
  ffmpeg/ffmpeg-core.js   Self-hosted FFmpeg core
  ffmpeg/ffmpeg-core.wasm Self-hosted FFmpeg WASM binary
  tesseract/               Self-hosted OCR worker, core WASM, and English language data
  background-removal/      Self-hosted IMG.LY segmentation model/WASM chunks
  upscaler/esrgan/x2/      Self-hosted ESRGAN Thick 2× model manifest and weights
  bgland.png              Legacy unused asset; present but not referenced by the current UI

tests/
  tools.test.ts            Registry and validation tests
  pdf.test.ts              Real in-memory PDF tests
  ffmpeg-commands.test.ts  Command validation tests
  audio-processor.test.ts  Audio action mapping test
  document.test.ts         DOC/DOCX/TXT processor tests
  browser/                 Playwright fixtures and browser suites
```

## 11. Dependencies and integrations

### Runtime dependencies — `WORKING`

- `next@16.3.5`
- `react@19.2.8`
- `react-dom@19.2.8`
- `@phosphor-icons/react`
- `@ffmpeg/ffmpeg`
- `@ffmpeg/core`
- `pdf-lib`
- `pdfjs-dist` — local PDF page rasterization; PDF.js worker is bundled by the application
- `jszip` — local packaging of multi-page raster exports
- `gifenc` — local animated GIF encoding from Canvas frames
- `pptx-browser` — local PPTX slide rendering for presentation preview/export
- `ppt` — local legacy PowerPoint 97–2003 text extraction
- `xlsx` — local XLS/XLSX workbook parsing and CSV export
- `upscaler` and `@upscalerjs/esrgan-thick` — local ESRGAN Thick 2× image upscaling
- `@jose.espana/docstream` — browser-compatible local legacy DOC OLE text extraction
- `@imgly/background-removal` and `onnxruntime-web` — local IS-NET quantized background segmentation
- `tesseract.js` — local OCR worker runtime
- `@tesseract.js-data/eng` — English language data copied into `public/tesseract/data`
- `public/tesseract/` — self-hosted OCR worker, core JavaScript/WASM, and language assets
- `qpdf-run` — installed for experimental compression; current Next.js worker initialization is not reliable
- Browser PKCS#12 signing libraries were researched but are not installed; certificate/signing remains deferred pending round-trip validation and credential UI.
- `clsx`
- `tailwind-merge`

### Development dependencies — `WORKING`

- TypeScript
- ESLint
- `eslint-config-next`
- Tailwind CSS v4
- `@tailwindcss/postcss`
- `@playwright/test`
- `vitest`
- `ts-ebml`
- React and Node type packages

### Security headers — `PARTIALLY WORKING`

`next.config.ts` adds:

- Content Security Policy;
- Referrer-Policy;
- X-Content-Type-Options;
- X-Frame-Options;
- Permissions-Policy.

CSP permits local Blob media and Workers. The CSP still uses `unsafe-inline` and
`unsafe-eval` for the current Next.js/FFmpeg setup, so stricter production CSP remains
future hardening.

## 12. Current issues and limitations

1. Full Playwright verification is not a reliable freeze gate in the current
   environment. Startup and long-running media tests can hang.
2. Chromium cannot reliably decode the checked-in H.264 MP4 fixture in the current
   environment. Capability-aware tests must show an explicit unsupported/corrupt state,
   not a fake duration or timeline.
3. Video/audio processor execution across codecs, containers, and browsers is not
   exhaustively verified.
4. Video merge is deliberately not exposed because its browser execution was unreliable.
5. Video split command/editor support exists but is deliberately not exposed.
6. Most FFmpeg command mappings are deferred and should not be described as supported.
7. Subtitle-file input is not implemented.
8. The `subtitle` command branch is not a supported product feature.
9. Image rotate, flip, and thumbnail branches are not exposed.
10. Audio waveform decoding depends on browser `AudioContext` support and decodable
    input formats.
11. PDF previews create one object URL per page; very large PDFs can create memory
    pressure despite cleanup.
12. No history, persistence, accounts, server upload, or cloud storage exists.
13. No global React error boundary or runtime fallback screen exists.
14. The worker protocol is local to `ffmpeg.ts` and `ffmpeg-worker.ts`; it is not yet a
    separate shared typed protocol module.
15. `app/page.tsx` is intentionally a composition layer; workflow state is centralized
    in `lib/app/useFileWorkflow.ts` and UI sections are under `components/app/`.

## 13. Verification evidence

The accepted static verification currently passes:

```text
npm test
  8 Vitest files passed
  52 tests passed

npm run lint
  passed

npm run typecheck
  passed

npm run build
  passed
  routes: / and /_not-found
```

Browser tests present:

- `tests/browser/v1.spec.ts`
- `tests/browser/matrix.spec.ts`
- `tests/browser/editors.spec.ts`
- `tests/browser/a11y-responsive.spec.ts`
- `tests/browser/hardening.spec.ts`
- `tests/browser/ocr-focused.spec.ts` — self-hosted OCR and searchable-PDF round trip
- `tests/browser/image-annotation-focused.spec.ts` — PDF image annotation round trip
- `tests/browser/forms-focused.spec.ts` — PDF text/date-like, checkbox, and dropdown form round trip
- `tests/browser/region-annotations-focused.spec.ts` — highlight, rectangle, and redaction round trips
- `tests/browser/image-tools-focused.spec.ts` — image rotate, flip, and thumbnail round trips
- `tests/browser/document-focused.spec.ts` — DOCX, TXT, and legacy DOC text extraction round trips
- `tests/browser/presentation-focused.spec.ts` — PPTX text extraction, legacy PPT extraction, and real PPTX PDF/PNG/JPG export round trips

The browser suites cover image, PDF, audio, video capability states, deferred file
states, cancellation, file switching, responsive layout, keyboard interaction,
oversized inputs, and downloads. However, full execution is currently limited by
browser/server startup hangs, long FFmpeg runs, and codec capability differences.

## 14. Working rules for future agents

- Preserve the local-first architecture unless the product owner explicitly changes it.
- Never show a tool without a real processor path.
- Never claim a command mapping is a supported feature without reliable execution evidence.
- Do not fake media duration, playback, thumbnails, codec support, or processing results.
- Keep the 512 MB limit and clear user-facing errors.
- Preserve cancellation, cleanup, validation, accessibility, and data-loss safeguards.
- Do not add new tools during stabilization without explicit product approval.
- Update this document whenever the registry, processor behavior, verification status, or
  architecture changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
