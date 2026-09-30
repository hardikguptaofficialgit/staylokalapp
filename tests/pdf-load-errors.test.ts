import { describe, expect, it } from "vitest";
import { describePdfLoadError } from "../lib/pdf/load-errors";

describe("describePdfLoadError", () => {
  it("detects password-related failures", () => {
    expect(describePdfLoadError(new Error("PDF is encrypted"))).toMatch(/password-protected/i);
  });

  it("returns a generic message for unknown failures", () => {
    expect(describePdfLoadError(new Error("boom"))).toMatch(/could not be rendered/i);
  });
});
