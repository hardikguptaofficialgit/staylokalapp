import { describe, expect, it } from "vitest";
import {
  imageExtensionForMime,
  imageFormatSelectOptions,
  normalizeImageMime,
  resolvePdfRasterExportFormat,
} from "../lib/tools/image-formats";

describe("image export formats", () => {
  it("exposes common raster output formats", () => {
    expect(imageFormatSelectOptions().map((item) => item.value)).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/avif",
      "image/x-icon",
      "image/tiff",
    ]);
  });

  it("normalizes invalid format values", () => {
    expect(normalizeImageMime("image/webp", "image/jpeg")).toBe("image/webp");
    expect(normalizeImageMime("image/x-icon", "image/png")).toBe("image/x-icon");
    expect(normalizeImageMime("image/tiff", "image/png")).toBe("image/tiff");
    expect(normalizeImageMime("image/heic", "image/png")).toBe("image/png");
  });

  it("maps mime types to file extensions", () => {
    expect(imageExtensionForMime("image/jpeg")).toBe("jpg");
    expect(imageExtensionForMime("image/avif")).toBe("avif");
  });

  it("resolves legacy pdf export operations and pdf-to-image options", () => {
    expect(resolvePdfRasterExportFormat("pdf-to-jpg", {})).toBe("image/jpeg");
    expect(resolvePdfRasterExportFormat("pdf-to-png", {})).toBe("image/png");
    expect(resolvePdfRasterExportFormat("pdf-to-image", { format: "image/webp" })).toBe("image/webp");
  });
});
