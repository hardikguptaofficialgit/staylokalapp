import type { AppWorkflow } from "./types";
import ToolFilters from "./ToolFilters";
import ToolGrid from "./ToolGrid";
import ToolsHeader from "./ToolsHeader";
import ToolSearch from "./ToolSearch";

export default function ToolBrowser({ workflow }: { workflow: AppWorkflow }) {
  return (
    <div className="tool-browser h-full flex flex-col">
      <ToolsHeader allTools={workflow.viewMode === "all"} />
      <div className="tool-browser-controls">
        <ToolSearch value={workflow.query} onChange={workflow.setQuery} />
        <ToolFilters workflow={workflow} />
      </div>
      <ToolGrid workflow={workflow} />
    </div>
  );
}
