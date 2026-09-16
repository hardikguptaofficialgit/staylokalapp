import { MagnifyingGlass } from "@phosphor-icons/react";
import type { AppWorkflow } from "./types";
import ToolCard from "./ToolCard";

export default function ToolGrid({ workflow }: { workflow: AppWorkflow }) {
  if (workflow.visibleTools.length === 0) {
    const browsingAllTools = workflow.viewMode === "all";
    return (
      <div className="empty-state tool-empty-state">
        <MagnifyingGlass size={30} className="text-muted/50 mb-3" />
        <p className="font-medium text-foreground">
          {browsingAllTools
            ? "No tools match your search or category."
            : workflow.compatibleTools.length === 0
            ? workflow.unsupportedTypes.length > 0
              ? `Detected ${workflow.unsupportedTypes.join(", ")}. More tools are coming soon.`
              : "No local tools support this file yet. More tools are coming soon."
            : "No tools match your search."}
        </p>
        <p className="text-sm text-muted mt-1">
          {browsingAllTools
            ? "Try clearing the search box or selecting another category."
            : workflow.compatibleTools.length === 0
            ? workflow.detectedTypes.length > 0
              ? `Detected type: ${workflow.detectedTypes.join(", ")}. We are continuing to add local tools for more formats.`
              : "Try a PDF, image, video, or audio file."
            : "Try selecting a different category or clearing the search box."}
        </p>
      </div>
    );
  }

  if (workflow.viewMode === "all") {
    const categoryOrder = ["PDF", "Image", "Video", "Audio", "Other"] as const;
    return (
      <div className="all-tools-groups">
        {categoryOrder.map((category) => {
          const categoryTools = workflow.visibleTools.filter((tool) => tool.category === category);
          if (!categoryTools.length) return null;
          return (
            <section className="all-tools-group" key={category} aria-labelledby={`all-tools-${category.toLowerCase()}`}>
              <div className="all-tools-group-heading">
                <h3 id={`all-tools-${category.toLowerCase()}`}>{category}</h3>
                <span>{categoryTools.length} {categoryTools.length === 1 ? "tool" : "tools"}</span>
              </div>
              <div className="tool-grid">
                {categoryTools.map((tool) => <ToolCard key={tool.id} tool={tool} onSelect={() => workflow.selectTool(tool)} />)}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="tool-grid">
      {workflow.visibleTools.map((tool) => <ToolCard key={tool.id} tool={tool} onSelect={() => workflow.selectTool(tool)} />)}
    </div>
  );
}
