import { describe, expect, it } from "vitest";
import textUtilsProcessor from "../lib/tools/text-utils";

const context = { onProgress: () => undefined, signal: new AbortController().signal };

describe("text utilities", () => {
  it("prettifies JSON", async () => {
    const file = new File(['{"ok":true,"count":2}'], "data.json", { type: "application/json" });
    const [result] = await textUtilsProcessor([file], { operation: "json-format", mode: "prettify" }, context);
    await expect(result.blob.text()).resolves.toContain('"ok": true');
    expect(result.name).toBe("data-formatted.json");
  });

  it("computes a SHA-256 hash for a local file", async () => {
    const file = new File(["hash-me"], "sample.txt", { type: "text/plain" });
    const [result] = await textUtilsProcessor([file], { operation: "file-hash", algorithm: "sha256" }, context);
    const text = await result.blob.text();
    expect(text).toContain("SHA-256  sample.txt");
    expect(text.trim().split("\n")[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(result.name).toBe("sample.sha256.txt");
  });

  it("encodes and decodes Base64 locally", async () => {
    const source = new File(["hi"], "sample.txt", { type: "text/plain" });
    const [encoded] = await textUtilsProcessor([source], { operation: "base64-encode" }, context);
    const encodedText = await encoded.blob.text();
    const decodeFile = new File([encodedText], "sample.base64.txt", { type: "text/plain" });
    const [decoded] = await textUtilsProcessor([decodeFile], { operation: "base64-decode" }, context);
    await expect(decoded.blob.text()).resolves.toBe("hi");
  });
});
