import { describe, expect, it } from "vitest";
import { getToolQueueGuidance } from "../lib/app/tool-queue-guidance";
import { getTool } from "../lib/tools/registry";

describe("tool queue guidance", () => {
  it("warns when GIF needs more images", () => {
    const tool = getTool("image-gif");
    expect(tool).toBeTruthy();
    expect(getToolQueueGuidance(tool!, 1)?.tone).toBe("warning");
  });

  it("explains batch image processing", () => {
    const tool = getTool("image-process");
    expect(getToolQueueGuidance(tool!, 3)?.message).toMatch(/3 images/);
  });

  it("explains merge file order", () => {
    const tool = getTool("pdf-merge");
    expect(tool?.orderMatters).toBe(true);
    expect(getToolQueueGuidance(tool!, 2)?.message).toMatch(/workspace/i);
  });
});
