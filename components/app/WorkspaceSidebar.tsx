import { Plus, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import type { AppWorkflow } from "./types";
import SelectedFileCard from "./SelectedFileCard";
import { detectFileType } from "@/lib/tools/file-types";

export default function WorkspaceSidebar({ workflow, inputRef, compact = false }: { workflow: AppWorkflow; inputRef: React.RefObject<HTMLInputElement | null>; compact?: boolean }) {
  const [dragging, setDragging] = useState(false);
  return (
    <aside
      className={`workspace-sidebar ${compact ? "workspace-inline" : ""} flex flex-col pt-2 animate-slide-right ${dragging ? "workspace-drop-active" : ""}`}
      aria-label="Workspace files"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        workflow.addFiles(event.dataTransfer.files);
      }}
    >
      <div className="workspace-sidebar-heading">
        <div>
          <h2>Workspace</h2>
          <p>{workflow.files.length} file{workflow.files.length === 1 ? "" : "s"} ready</p>
        </div>
        <button type="button" onClick={() => {
          if (inputRef.current) {
            inputRef.current.removeAttribute("webkitdirectory");
            inputRef.current.accept = "*/*";
            inputRef.current.click();
          }
        }} className="control-pill workspace-add-button" aria-label="Add files">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="workspace-file-summary flex-grow overflow-y-auto custom-scrollbar">
        <div className="workspace-sidebar-label">
          <span>File</span>
          <button type="button" onClick={workflow.clearWorkspace} aria-label="Clear all files"><Trash size={13} /> Clear all</button>
        </div>
        <div className="selected-file-list">
          {workflow.files.map((file, index) => <SelectedFileCard key={`${file.name}-${index}`} workflow={workflow} file={file} index={index} />)}
        </div>
        {(workflow.oversizedInput || workflow.unsupportedTypes.length > 0) && (
          <div className="workspace-detected-line" aria-live="polite">
            {workflow.activeFile && workflow.oversizedInput && <span className="text-red-500" role="alert">{workflow.inputSizeError} {workflow.formatBytes(workflow.activeFile.size)} detected.</span>}
            {workflow.activeFile && detectFileType(workflow.activeFile).kind !== "unknown" && workflow.unsupportedTypes.includes(detectFileType(workflow.activeFile).label) && (
              <span>Recognized, but no implemented local tool is available.</span>
            )}
          </div>
        )}
        {workflow.error && !workflow.selected && <div className="workspace-error" role="alert">{workflow.error}</div>}
      </div>
    </aside>
  );
}
