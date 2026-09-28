import { describe, expect, it } from "vitest";
import { nextTheme } from "../lib/app/theme";

describe("theme helpers", () => {
  it("toggles dark to light and back", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
