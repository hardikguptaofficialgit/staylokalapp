import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildResultsZip } from "../lib/app/download-results-zip";

describe("buildResultsZip", () => {
  it("bundles every processed file into one archive", async () => {
    const blob = await buildResultsZip([
      { name: "one.txt", type: "text/plain", blob: new Blob(["a"], { type: "text/plain" }) },
      { name: "two.txt", type: "text/plain", blob: new Blob(["b"], { type: "text/plain" }) },
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    await expect(zip.file("one.txt")?.async("text")).resolves.toBe("a");
    await expect(zip.file("two.txt")?.async("text")).resolves.toBe("b");
  });
});
