export default function ToolsHeader({ allTools = false }: { allTools?: boolean }) {
  return (
    <div className={`tools-header ${allTools ? "all-tools-heading-card" : ""}`}>
      <p className="eyebrow">{allTools ? "Complete toolkit" : "Smart file workspace"}</p>
      <h2>{allTools ? "Everything you can do with your files." : "What do you want to do?"}</h2>
      {allTools && <p>Browse every local tool, organized by the kind of work it does.</p>}
    </div>
  );
}
