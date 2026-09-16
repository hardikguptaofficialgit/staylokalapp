import JSZip from "jszip";
import { Buffer } from "buffer";
import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";
import presentationProcessor from "./presentation";
import spreadsheetProcessor from "./spreadsheet";
import archiveProcessor from "./archive";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function extractDocxText(file: File, signal: AbortSignal, onProgress: (ratio: number) => void) {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new ProcessingError("This DOCX file could not be opened locally.", "invalid");
  }

  const documentEntry = zip.files["word/document.xml"];
  if (!documentEntry) throw new ProcessingError("No document content was found in this DOCX file.", "invalid");
  if (signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");

  const xml = await documentEntry.async("text");
  const paragraphs = Array.from(xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gi))
    .map((match) => Array.from(match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi))
      .map((text) => decodeXml(text[1]))
      .join(""))
    .filter((paragraph) => paragraph.length > 0);
  if (!paragraphs.length) throw new ProcessingError("No readable text was found in this DOCX file.", "invalid");
  onProgress(1);
  return paragraphs.join("\n\n");
}

const documentProcessor: ToolProcessor = async (files, options, context) => {
  if (String(options.operation ?? "").startsWith("ppt")) {
    return presentationProcessor(files, options, context);
  }
  if (String(options.operation ?? "").startsWith("spreadsheet")) {
    return spreadsheetProcessor(files, options, context);
  }
  if (String(options.operation ?? "").startsWith("archive-")) {
    return archiveProcessor(files, options, context);
  }
  const outputs: ProcessedFile[] = [];
  for (const [index, file] of files.entries()) {
    if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");

    let text: string;
    if (options.operation === "docx-text" && (/\.doc$/i.test(file.name) || file.type === "application/msword")) {
      try {
        (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;
        const { parseDoc } = await import("@jose.espana/docstream/dist/parsers/legacy/doc");
        const ast = await parseDoc(
          Buffer.from(new Uint8Array(await file.arrayBuffer())),
          {
            outputErrorToConsole: false,
            newlineDelimiter: "\n",
            ignoreNotes: false,
            putNotesAtLast: false,
            extractAttachments: false,
            includeRawContent: false,
            ocr: false,
            ocrLanguage: "eng",
            pdfWorkerSrc: "",
          },
        );
        text = ast.toText();
      } catch {
        throw new ProcessingError("This legacy Word document could not be read locally.", "invalid");
      }
      if (!text.trim()) throw new ProcessingError("No readable text was found in this Word document.", "invalid");
      context.onProgress({ ratio: (index + 1) / files.length, label: `Extracted text from ${file.name}` });
    } else if (options.operation === "txt-preview") {
      text = await file.text();
      context.onProgress({ ratio: (index + 1) / files.length, label: `Read ${file.name}` });
    } else {
      text = await extractDocxText(file, context.signal, (ratio) => {
        context.onProgress({
          ratio: (index + ratio) / files.length,
          label: `Extracted text from ${file.name}`,
        });
      });
    }

    outputs.push({
      blob: new Blob([text], { type: "text/plain" }),
      type: "text/plain",
      name: `${file.name.replace(/\.(docx|doc|txt)$/i, "")}-text.txt`,
    });
  }
  return outputs;
};

export default documentProcessor;
