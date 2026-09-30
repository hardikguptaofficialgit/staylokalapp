import { describe, expect, it } from "vitest";
import { formatCompressionSummary, formatFileSize } from "../lib/tools/pdf-compress";

describe("formatFileSize", () => {
  it("formats common byte ranges", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});

describe("formatCompressionSummary", () => {
  it("builds a readable savings line", () => {
    const summary = formatCompressionSummary(2 * 1024 * 1024, 1.5 * 1024 * 1024);
    expect(summary.savedBytes).toBe(0.5 * 1024 * 1024);
    expect(summary.savedPercent).toBe(25);
    expect(summary.detail).toMatch(/saved/i);
    expect(summary.detail).toMatch(/25\.0%/);
  });
});
