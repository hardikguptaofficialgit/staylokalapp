import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import archiveProcessor, { readArchive } from "../lib/tools/archive";
import { matchesAcceptedFile } from "../lib/tools/validation";

function archiveFile() {
  const zip = new JSZip();
  zip.file("docs/readme.txt", "local readme");
  zip.file("../unsafe.txt", "safe extraction");
  zip.folder("images");
  return zip.generateAsync({ type: "uint8array" }).then((bytes) => {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new File([buffer], "bundle.zip", { type: "application/zip" });
  });
}

const context = { onProgress: () => undefined, signal: new AbortController().signal };

describe("archive processor", () => {
  it("lists ZIP entries with safe names", async () => {
    const archive = await readArchive(await archiveFile(), context.signal);
    expect(archive.entries.map((entry) => entry.name)).toContain("unsafe.txt");
    expect(archive.entries.find((entry) => entry.name === "docs/readme.txt")?.size).toBeGreaterThan(0);
  });

  it("extracts a selected ZIP file", async () => {
    const [result] = await archiveProcessor([await archiveFile()], { operation: "archive-extract", entry: "docs/readme.txt" }, context);
    await expect(result.blob.text()).resolves.toBe("local readme");
    expect(result.name).toBe("bundle-docs-readme.txt");
  });

  it("matches ZIP files by extension and rejects malformed archives", async () => {
    expect(matchesAcceptedFile(new File(["zip"], "bundle.zip", { type: "" }), ["application/zip"])).toBe(true);
    await expect(archiveProcessor([new File([], "broken.zip")], { operation: "archive-list" }, context))
      .rejects.toMatchObject({ code: "invalid" });
  });

  it("creates a ZIP archive from multiple local files", async () => {
    const a = new File(["one"], "alpha.txt", { type: "text/plain" });
    const b = new File(["two"], "beta.txt", { type: "text/plain" });
    const [result] = await archiveProcessor([a, b], { operation: "archive-create", archiveName: "bundle.zip" }, context);
    expect(result.type).toBe("application/zip");
    expect(result.name).toBe("bundle.zip");
    const archive = await readArchive(new File([await result.blob.arrayBuffer()], "bundle.zip", { type: "application/zip" }), context.signal);
    expect(archive.entries.map((entry) => entry.name).sort()).toEqual(["alpha.txt", "beta.txt"]);
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(readArchive(await archiveFile(), controller.signal)).rejects.toMatchObject({ code: "cancelled" });
  });
});
