import { ArrowRight } from "@phosphor-icons/react";
import type { ToolDescriptor } from "@/lib/tools/types";
import { ToolIcon } from "./ToolIcon";

export default function ToolCard({ tool, onSelect }: { tool: ToolDescriptor; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="tool-card">
      <div className="tool-card-topline">
        <div className="tool-card-labels">
          <span className="tool-card-category">{tool.category}</span>
          {tool.isNew && <span className="tool-card-new">New</span>}
        </div>
        <ArrowRight size={17} className="tool-card-arrow" aria-hidden="true" />
      </div>
      <ToolIcon name={tool.icon} size={25} />
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
    </button>
  );
}
