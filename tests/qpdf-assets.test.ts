import { describe, expect, it } from "vitest";
import { qpdfCompressionErrorMessage } from "../lib/tools/qpdf-assets";

describe("qpdfCompressionErrorMessage", () => {
  it("maps init failures to a refresh hint", () => {
    expect(qpdfCompressionErrorMessage({ code: "QPDF_INIT_FAILED" })).toMatch(/load/i);
  });

  it("maps exec failures to a qpdf-specific hint", () => {
    expect(qpdfCompressionErrorMessage({ code: "QPDF_EXEC_FAILED" })).toMatch(/qpdf/i);
  });
});
