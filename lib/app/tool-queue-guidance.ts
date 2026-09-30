import type { ToolDescriptor } from "@/lib/tools/types";

export type ToolQueueGuidance = {
  message: string;
  tone: "info" | "warning";
};

export function getToolQueueGuidance(tool: ToolDescriptor, compatibleCount: number): ToolQueueGuidance | null {
  if (tool.id === "image-gif" && compatibleCount < 2) {
    return {
      tone: "warning",
      message: "Add at least two images. GIF frame order follows the workspace list — reorder with the arrows.",
    };
  }
  if (tool.id === "image-contact-sheet" && compatibleCount < 2) {
    return {
      tone: "warning",
      message: "Add at least two images. Layout runs left-to-right, top-to-bottom in workspace order.",
    };
  }
  if (tool.orderMatters && compatibleCount >= 2) {
    return {
      tone: "info",
      message: "Output order matches the workspace. Reorder files with the arrows in the list or sidebar.",
    };
  }
  if (tool.id === "pdf-merge" && compatibleCount === 1) {
    return {
      tone: "info",
      message: "Add more PDFs to merge, or reorder pages in the editor after they load.",
    };
  }
  if (tool.batch && tool.kind === "image" && !tool.orderMatters && compatibleCount > 1) {
    return {
      tone: "info",
      message: `All ${compatibleCount} images in the workspace will run with the same settings. Use the sidebar to preview another file.`,
    };
  }
  if (tool.batch && tool.kind === "pdf" && tool.id === "pdf-rotate" && compatibleCount > 1) {
    return {
      tone: "info",
      message: `Each of the ${compatibleCount} PDFs will be rotated with the angle you choose.`,
    };
  }
  if (!tool.batch && compatibleCount > 1) {
    return {
      tone: "info",
      message: "Uses the selected file. Switch files in the workspace to run another one.",
    };
  }
  if (tool.id === "archive-extract" || tool.id === "archive-list") {
    return {
      tone: "info",
      message: "Uses the selected ZIP in the workspace. Pick the entry to extract in the editor.",
    };
  }
  if (tool.id === "spreadsheet-csv") {
    return {
      tone: "info",
      message: "Choose the worksheet in the editor, then export CSV.",
    };
  }
  return null;
}
