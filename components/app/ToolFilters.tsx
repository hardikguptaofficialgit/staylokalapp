import type { AppWorkflow } from "./types";

export default function ToolFilters({ workflow }: { workflow: AppWorkflow }) {
  return (
    <div className="tool-filters" aria-label="Tool categories">
      {workflow.availableCategories.map((item) => (
        <button key={item} onClick={() => workflow.setCategory(item as typeof workflow.category)} className={`tool-filter ${workflow.category === item ? "is-active" : ""}`}>
          {item}
        </button>
      ))}
    </div>
  );
}
