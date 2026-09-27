import { ProcessingError, type ToolProcessor } from "./types";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const normalized = value.replace(/\s+/g, "");
  if (!normalized || normalized.length % 4 !== 0) {
    throw new ProcessingError("This file does not contain valid Base64 text.", "invalid");
  }
  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    throw new ProcessingError("This file could not be decoded from Base64.", "invalid");
  }
}

function outputBaseName(file: File) {
  return file.name.replace(/\.[^.]+$/, "") || "file";
}

const textUtilsProcessor: ToolProcessor = async (files, options, context) => {
  const file = files[0];
  const operation = String(options.operation ?? "");
  if (context.signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");

  if (operation === "json-format") {
    const raw = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ProcessingError("This file does not contain valid JSON.", "invalid");
    }
    const minify = options.mode === "minify";
    const output = minify ? JSON.stringify(parsed) : `${JSON.stringify(parsed, null, 2)}\n`;
    context.onProgress({ ratio: 1, label: minify ? "Minified JSON" : "Formatted JSON" });
    return [{
      blob: new Blob([output], { type: "application/json;charset=utf-8" }),
      type: "application/json",
      name: `${outputBaseName(file)}${minify ? "-min" : "-formatted"}.json`,
    }];
  }

  if (operation === "base64-encode") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const encoded = `${bytesToBase64(bytes)}\n`;
    context.onProgress({ ratio: 1, label: "Encoded to Base64" });
    return [{
      blob: new Blob([encoded], { type: "text/plain;charset=utf-8" }),
      type: "text/plain",
      name: `${outputBaseName(file)}.base64.txt`,
    }];
  }

  if (operation === "base64-decode") {
    const bytes = base64ToBytes(await file.text());
    context.onProgress({ ratio: 1, label: "Decoded from Base64" });
    return [{
      blob: new Blob([bytes], { type: "application/octet-stream" }),
      type: "application/octet-stream",
      name: `${outputBaseName(file)}.decoded.bin`,
    }];
  }

  throw new ProcessingError("This text utility is not available.", "invalid");
};

export default textUtilsProcessor;
